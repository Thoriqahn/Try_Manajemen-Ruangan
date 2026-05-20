const { dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const audit = async ({ actorId, actorName, action, resource, ip, before, after }) => {
  try {
    await dbRun(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, ip, payload_before, payload_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuidv4(),
        actorId || null,
        actorName || 'System',
        action,
        resource || null,
        ip || null,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { audit };
