const { dbGet, dbAll } = require('../config/database');

// GET /api/stats/admin — scoped to admin's rooms
const adminStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const { admin_id } = req.query; // SuperAdmin can view specific admin's stats

    let roomCondition = '';
    let params = [];

    if (!isSuperAdmin) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = ?)`;
      params = [req.user.id];
    } else if (admin_id) {
      roomCondition = `AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = ?)`;
      params = [admin_id];
    }

    // Total rooms
    const totalRooms = await dbGet(`SELECT COUNT(*) as count FROM rooms r WHERE r.status='active' ${roomCondition}`, params);

    // Total bookings this week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    const weeklyBookings = await dbGet(
      `SELECT COUNT(*) as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.date BETWEEN ? AND ? AND b.status IN ('confirmed','ongoing','completed') ${roomCondition}`,
      [weekStart, weekEnd, ...params]
    );

    // Pending approvals
    const pendingApprovals = await dbGet(
      `SELECT COUNT(*) as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='pending' ${roomCondition}`,
      params
    );

    // Ghost bookings (cancelled) this month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const ghostBookings = await dbGet(
      `SELECT COUNT(*) as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status='cancelled' AND b.date LIKE ? ${roomCondition}`,
      [`${thisMonth}%`, ...params]
    );

    // Utilization trend (last 7 days)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await dbGet(
        `SELECT COUNT(*) as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.date=? AND b.status IN ('confirmed','ongoing','completed') ${roomCondition}`,
        [dateStr, ...params]
      );
      trend.push({ date: dateStr, bookings: count?.count || 0 });
    }

    // Peak hours
    const peakHours = await dbAll(
      `SELECT start_time, COUNT(*) as count FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id WHERE b.status IN ('confirmed','ongoing','completed') ${roomCondition} GROUP BY start_time ORDER BY count DESC LIMIT 5`,
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
      dbGet(`SELECT COUNT(*) as count FROM rooms WHERE status='active'`),
      dbGet(`SELECT COUNT(*) as count FROM users WHERE status='active' AND role='user'`),
      dbGet(`SELECT COUNT(*) as count FROM bookings WHERE status IN ('confirmed','ongoing')`),
      dbGet(`SELECT COUNT(*) as count FROM api_tokens WHERE status='active'`),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await dbGet(`SELECT COUNT(*) as count FROM bookings WHERE date=? AND status IN ('confirmed','ongoing')`, [today]);

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
