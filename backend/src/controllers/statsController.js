const { dbGet, dbAll } = require('../config/database');

// GET /api/stats/admin — scoped to admin's rooms
const adminStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const { admin_id } = req.query;

    let roomCondition = '';
    let params = [];
    let paramIdx = 1;

    if (!isSuperAdmin) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = $${paramIdx++} AND deleted_at IS NULL)`;
      params = [req.user.id];
    } else if (admin_id) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = $${paramIdx++} AND deleted_at IS NULL)`;
      params = [admin_id];
    }

    // Total rooms
    const totalRooms = await dbGet(`SELECT COUNT(*)::int as count FROM rooms r WHERE r.status='active' AND r.deleted_at IS NULL ${roomCondition}`, params);

    // Total bookings this week
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

    // Pending approvals — reset paramIdx for independent query
    let pendingParams = [...params];
    const pendingApprovals = await dbGet(
      `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='pending' AND b.deleted_at IS NULL ${roomCondition}`,
      pendingParams
    );

    // Ghost bookings (cancelled) this month
    const thisMonth = new Date().toISOString().slice(0, 7);
    let ghostParams = [`${thisMonth}%`, ...params];
    const ghostBookings = await dbGet(
      `SELECT COUNT(*)::int as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='cancelled' AND b.date LIKE $1 AND b.deleted_at IS NULL ${roomCondition.replace(/\$1/g, '$2')}`,
      ghostParams
    );

    // Utilization trend (last 7 days)
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

    // Peak hours
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

// GET /api/stats/global — superadmin
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
