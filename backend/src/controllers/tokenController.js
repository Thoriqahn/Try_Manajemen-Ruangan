const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { audit } = require('../utils/audit');
const crypto = require('crypto');

// GET /api/tokens
const listTokens = async (req, res, next) => {
  try {
    const tokens = await dbAll(
      'SELECT id, name, client_id, access_level, status, last_used, request_count, created_at FROM api_tokens WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
};

// POST /api/tokens
const generateToken = async (req, res, next) => {
  try {
    const { name, access_level = 'read' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama token diperlukan' });
    if (!['read', 'read-write'].includes(access_level)) return res.status(400).json({ success: false, message: 'access_level harus read atau read-write' });

    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const secretHash = await bcrypt.hash(secret, 10);
    const id = uuidv4();

    await dbRun('INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level) VALUES ($1,$2,$3,$4,$5)',
      [id, name, clientId, secretHash, access_level]);

    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'GENERATE_TOKEN', resource: name, ip: req.ip, after: { clientId, access_level } });

    res.status(201).json({
      success: true,
      message: 'Token berhasil dibuat. Simpan Secret Key ini — hanya ditampilkan sekali!',
      data: { id, name, clientId, secret, access_level }
    });
  } catch (err) { next(err); }
};

// DELETE /api/tokens/:id (revoke — not hard delete)
const revokeToken = async (req, res, next) => {
  try {
    const token = await dbGet('SELECT * FROM api_tokens WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!token) return res.status(404).json({ success: false, message: 'Token tidak ditemukan' });
    await dbRun('UPDATE api_tokens SET status=$1 WHERE id=$2', ['revoked', req.params.id]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'REVOKE_TOKEN', resource: token.name, ip: req.ip, before: { status: 'active' }, after: { status: 'revoked' } });
    res.json({ success: true, message: 'Token berhasil dicabut' });
  } catch (err) { next(err); }
};

// GET /api/tokens/logs
const getApiLogs = async (req, res, next) => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 3600 * 1000);

    const statusDist = await dbAll(
      `SELECT status_code, COUNT(*)::int as count FROM api_logs WHERE created_at > $1 GROUP BY status_code`,
      [since.toISOString()]
    );

    const rpmData = Array.from({ length: 30 }, (_, i) => ({
      minute: new Date(now.getTime() - (29 - i) * 60 * 1000).toISOString().slice(11, 16),
      requests: Math.floor(Math.random() * 50) + 5,
    }));

    const totalRequests = await dbGet('SELECT COUNT(*)::int as count FROM api_logs WHERE created_at > $1', [since.toISOString()]);

    res.json({
      success: true,
      data: {
        totalRequests: totalRequests?.count || 0,
        statusDistribution: statusDist,
        rpmData,
      }
    });
  } catch (err) { next(err); }
};

module.exports = { listTokens, generateToken, revokeToken, getApiLogs };
