/**
 * @fileoverview Stats Controller
 * Menyediakan statistik agregat untuk dashboard admin dan superadmin.
 * Semua query di-scope ke ruangan yang ditetapkan ke admin yang bersangkutan.
 */
const { dbGet, dbAll } = require('../config/database');

/**
 * Statistik untuk dashboard admin.
 * GET /api/stats/admin
 *
 * Scoped berdasarkan role:
 * - Admin biasa: hanya ruangan yang ditetapkan kepadanya
 * - Superadmin: semua ruangan, atau bisa query admin tertentu via ?admin_id=
 *
 * Data yang dikembalikan:
 * - totalRooms: jumlah ruangan aktif dalam scope
 * - weeklyBookings: jumlah booking minggu ini (confirmed/ongoing/completed)
 * - pendingApprovals: booking yang menunggu persetujuan
 * - ghostBookings: booking cancelled bulan ini (metrik keandalan)
 * - trend: booking per hari untuk 7 hari terakhir
 * - peakHours: 5 jam paling sibuk berdasarkan start_time
 */
const adminStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const { admin_id } = req.query;

    let roomCondition = '';
    let params = [];
    let paramIdx = 1;

    if (!isSuperAdmin) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params = [req.user.id];
    } else if (admin_id) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params = [admin_id];
    }

    // Total ruangan aktif dalam scope
    const totalRooms = await dbGet(`SELECT COUNT(*)::int as count FROM rooms r WHERE r.status='active' AND r.deleted_at IS NULL ${roomCondition}`, params);

    // Hitung rentang minggu ini (Senin–Minggu)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    const weeklyBookings = await dbGet(
      `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.date BETWEEN $${paramIdx++} AND $${paramIdx++} AND b.status IN ('confirmed','ongoing','completed') AND b.deleted_at IS NULL ${roomCondition}`,
      [weekStart, weekEnd, ...params]
    );

    // Booking pending — query independen (paramIdx di-reset)
    let pendingParams = [...params];
    const pendingApprovals = await dbGet(
      `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='pending' AND b.deleted_at IS NULL ${roomCondition}`,
      pendingParams
    );

    // Ghost bookings (cancelled) bulan ini
    const thisMonth = new Date().toISOString().slice(0, 7);
    let ghostParams = [`${thisMonth}%`, ...params];
    const ghostBookings = await dbGet(
      `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='cancelled' AND b.date LIKE $1 AND b.deleted_at IS NULL ${roomCondition.replace(/\$1/g, '$2')}`,
      ghostParams
    );

    // Trend utilisasi 7 hari terakhir (per hari)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      let trendParams = [dateStr, ...params];
      const count = await dbGet(
        `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.date=$1 AND b.status IN ('confirmed','ongoing','completed') AND b.deleted_at IS NULL ${roomCondition.replace(/\$1/g, '$2')}`,
        trendParams
      );
      trend.push({ date: dateStr, bookings: count?.count || 0 });
    }

    // Top 5 jam tersibuk berdasarkan start_time
    const peakHours = await dbAll(
      `SELECT start_time, COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status IN ('confirmed','ongoing','completed') AND b.deleted_at IS NULL ${roomCondition} GROUP BY start_time ORDER BY count DESC LIMIT 5`,
      params
    );

    res.json({
      success: true,
      data: {
        totalRooms: totalRooms?.count || 0,
        weeklyBookings: weeklyBookings?.count || 0,
        pendingApprovals: pendingApprovals?.count || 0,
        ghostBookings: ghostBookings?.count || 0,
        trend,
        peakHours,
      }
    });
  } catch (err) { next(err); }
};

/**
 * Statistik global untuk dashboard superadmin.
 * GET /api/stats/global
 *
 * Query dijalankan paralel dengan Promise.all untuk efisiensi.
 * Data yang dikembalikan: totalRooms, totalUsers, totalActiveBookings, todayBookings, activeApiTokens.
 */
const globalStats = async (req, res, next) => {
  try {
    const [totalRooms, totalUsers, totalBookings, activeTokens] = await Promise.all([
      dbGet(`SELECT COUNT(*)::int as count FROM rooms WHERE status='active' AND deleted_at IS NULL`),
      dbGet(`SELECT COUNT(*)::int as count FROM users WHERE status='active' AND role='user' AND deleted_at IS NULL`),
      dbGet(`SELECT COUNT(*)::int as count FROM bookings WHERE status IN ('confirmed','ongoing') AND deleted_at IS NULL`),
      dbGet(`SELECT COUNT(*)::int as count FROM api_tokens WHERE status='active' AND deleted_at IS NULL`),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await dbGet(`SELECT COUNT(*)::int as count FROM bookings WHERE date=$1 AND status IN ('confirmed','ongoing') AND deleted_at IS NULL`, [today]);

    res.json({
      success: true,
      data: {
        totalRooms: totalRooms?.count || 0,
        totalUsers: totalUsers?.count || 0,
        totalActiveBookings: totalBookings?.count || 0,
        todayBookings: todayBookings?.count || 0,
        activeApiTokens: activeTokens?.count || 0,
      }
    });
  } catch (err) { next(err); }
};

module.exports = { adminStats, globalStats };
