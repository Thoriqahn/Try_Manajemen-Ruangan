const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');

// GET /api/policy
const getPolicy = async (req, res, next) => {
  try {
    let policy = await dbGet('SELECT * FROM global_policy WHERE id=1 AND deleted_at IS NULL');
    if (!policy) {
      await dbRun('INSERT INTO global_policy (id, max_duration_hours, max_days_ahead) VALUES (1, 4, 30) ON CONFLICT (id) DO NOTHING');
      policy = { id: 1, max_duration_hours: 4, max_days_ahead: 30 };
    }
    const blackoutDates = await dbAll('SELECT * FROM blackout_dates WHERE deleted_at IS NULL ORDER BY date');
    res.json({ success: true, data: { ...policy, blackoutDates } });
  } catch (err) { next(err); }
};

// PUT /api/policy
const updatePolicy = async (req, res, next) => {
  try {
    const { max_duration_hours, max_days_ahead } = req.body;
    const before = await dbGet('SELECT * FROM global_policy WHERE id=1 AND deleted_at IS NULL');
    await dbRun(
      `UPDATE global_policy SET max_duration_hours=COALESCE($1,max_duration_hours), max_days_ahead=COALESCE($2,max_days_ahead), updated_at=NOW() WHERE id=1`,
      [max_duration_hours || null, max_days_ahead || null]
    );
    await audit({
      actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_POLICY',
      resource: 'Kebijakan Global', ip: req.ip, before, after: req.body
    });
    const policy = await dbGet('SELECT * FROM global_policy WHERE id=1');
    res.json({ success: true, message: 'Kebijakan berhasil diperbarui', data: policy });
  } catch (err) { next(err); }
};

// POST /api/policy/blackout
const addBlackout = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Tanggal diperlukan' });
    await dbRun('INSERT INTO blackout_dates (id, date, reason) VALUES ($1,$2,$3) ON CONFLICT (date) DO NOTHING', [uuidv4(), date, reason || null]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'ADD_BLACKOUT', resource: date, ip: req.ip, after: { date, reason } });
    res.status(201).json({ success: true, message: `Blackout date ${date} ditambahkan` });
  } catch (err) { next(err); }
};

// DELETE /api/policy/blackout/:date (soft delete)
const removeBlackout = async (req, res, next) => {
  try {
    await dbRun('UPDATE blackout_dates SET deleted_at=NOW() WHERE date=$1 AND deleted_at IS NULL', [req.params.date]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'REMOVE_BLACKOUT', resource: req.params.date, ip: req.ip });
    res.json({ success: true, message: `Blackout date ${req.params.date} dihapus` });
  } catch (err) { next(err); }
};

module.exports = { getPolicy, updatePolicy, addBlackout, removeBlackout };
