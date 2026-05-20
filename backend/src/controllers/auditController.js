const { dbAll, dbGet } = require('../config/database');

// GET /api/audit
const listAuditLogs = async (req, res, next) => {
  try {
    const { action, actor, search, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let paramIdx = 1;

    if (action) { sql += ` AND action = $${paramIdx++}`; params.push(action); }
    if (actor) { sql += ` AND actor_name ILIKE $${paramIdx++}`; params.push(`%${actor}%`); }
    if (search) {
      sql += ` AND (actor_name ILIKE $${paramIdx} OR action ILIKE $${paramIdx} OR resource ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Count total (without LIMIT/OFFSET)
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)::int as total');
    const total = await dbGet(countSql, [...params]);

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const logs = await dbAll(sql, params);

    res.json({
      success: true,
      data: logs,
      pagination: { total: total?.total || logs.length, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) { next(err); }
};

module.exports = { listAuditLogs };
