const { dbAll } = require('../config/database');

// GET /api/audit
const listAuditLogs = async (req, res, next) => {
  try {
    const { action, actor, search, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (action) { sql += ' AND action = ?'; params.push(action); }
    if (actor) { sql += ' AND actor_name LIKE ?'; params.push(`%${actor}%`); }
    if (search) { sql += ' AND (actor_name LIKE ? OR action LIKE ? OR resource LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = await dbAll(sql, params);

    // Count total
    let countSql = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
    const countParams = params.slice(0, -2);
    const total = await require('../config/database').dbGet(countSql.replace('ORDER BY created_at DESC LIMIT ? OFFSET ?', ''), countParams);

    res.json({
      success: true,
      data: logs,
      pagination: { total: total?.total || logs.length, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) { next(err); }
};

module.exports = { listAuditLogs };
