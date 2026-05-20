const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');
const { getAccessToken, getZoomUser } = require('../utils/zoom');

// GET /api/zoom/config
const getConfig = async (req, res, next) => {
  try {
    const config = await dbGet('SELECT id, client_id, account_id, updated_at FROM zoom_config WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: config || null });
  } catch (err) { next(err); }
};

// PUT /api/zoom/config
const saveConfig = async (req, res, next) => {
  try {
    const { client_id, client_secret, account_id } = req.body;
    if (!client_id || !client_secret || !account_id) {
      return res.status(400).json({ success: false, message: 'Client ID, Client Secret, dan Account ID wajib diisi' });
    }

    const existing = await dbGet('SELECT id FROM zoom_config WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 1');
    if (existing) {
      await dbRun('UPDATE zoom_config SET client_id=$1, client_secret_encrypted=$2, account_id=$3, updated_at=NOW() WHERE id=$4',
        [client_id, client_secret, account_id, existing.id]);
    } else {
      await dbRun('INSERT INTO zoom_config (client_id, client_secret_encrypted, account_id) VALUES ($1,$2,$3)',
        [client_id, client_secret, account_id]);
    }

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (Super Admin)`,
      action: 'UPDATE_ZOOM_CONFIG', resource: 'Zoom OAuth Configuration', ip: req.ip,
      after: { client_id, account_id }
    });

    res.json({ success: true, message: 'Konfigurasi Zoom berhasil disimpan' });
  } catch (err) { next(err); }
};

// POST /api/zoom/test-connection
const testConnection = async (req, res, next) => {
  try {
    const token = await getAccessToken();
    res.json({ success: true, message: 'Koneksi ke Zoom API berhasil!', tokenPreview: token.substring(0, 20) + '...' });
  } catch (err) {
    res.status(400).json({ success: false, message: `Koneksi gagal: ${err.message}` });
  }
};

// GET /api/zoom/accounts
const listAccounts = async (req, res, next) => {
  try {
    const accounts = await dbAll('SELECT * FROM zoom_accounts WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
};

// POST /api/zoom/accounts
const addAccount = async (req, res, next) => {
  try {
    const { email, display_name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email akun Zoom wajib diisi' });

    const existing = await dbGet('SELECT id FROM zoom_accounts WHERE email=$1 AND deleted_at IS NULL', [email]);
    if (existing) return res.status(409).json({ success: false, message: 'Email akun Zoom sudah terdaftar' });

    const id = uuidv4();
    await dbRun('INSERT INTO zoom_accounts (id, email, display_name) VALUES ($1,$2,$3)', [id, email, display_name || null]);

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (Super Admin)`,
      action: 'ADD_ZOOM_ACCOUNT', resource: email, ip: req.ip, after: { id, email }
    });

    const account = await dbGet('SELECT * FROM zoom_accounts WHERE id=$1', [id]);
    res.status(201).json({ success: true, message: 'Akun Zoom berhasil ditambahkan', data: account });
  } catch (err) { next(err); }
};

// DELETE /api/zoom/accounts/:id (soft delete)
const removeAccount = async (req, res, next) => {
  try {
    const account = await dbGet('SELECT * FROM zoom_accounts WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!account) return res.status(404).json({ success: false, message: 'Akun Zoom tidak ditemukan' });

    await dbRun('UPDATE zoom_accounts SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (Super Admin)`,
      action: 'REMOVE_ZOOM_ACCOUNT', resource: account.email, ip: req.ip
    });

    res.json({ success: true, message: 'Akun Zoom berhasil dihapus' });
  } catch (err) { next(err); }
};

// POST /api/zoom/accounts/:id/verify
const verifyAccount = async (req, res, next) => {
  try {
    const account = await dbGet('SELECT * FROM zoom_accounts WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!account) return res.status(404).json({ success: false, message: 'Akun Zoom tidak ditemukan' });

    try {
      const zoomUser = await getZoomUser(account.email);
      const licenseType = zoomUser.type === 2 ? 'Licensed' : zoomUser.type === 3 ? 'On-Prem' : 'Basic';
      const isLicensed = zoomUser.type >= 2;

      await dbRun('UPDATE zoom_accounts SET is_verified=$1, license_type=$2, display_name=COALESCE($3, display_name) WHERE id=$4',
        [isLicensed, licenseType, zoomUser.display_name || null, req.params.id]);

      res.json({
        success: true,
        message: isLicensed ? 'Akun terverifikasi dan berlisensi Premium' : 'Akun ditemukan tapi bukan lisensi Premium',
        data: { email: account.email, license_type: licenseType, is_licensed: isLicensed, display_name: zoomUser.display_name }
      });
    } catch (zoomErr) {
      await dbRun('UPDATE zoom_accounts SET is_verified=$1, license_type=$2 WHERE id=$3',
        [false, 'Unverified', req.params.id]);
      res.status(400).json({ success: false, message: `Gagal memverifikasi: ${zoomErr.message}` });
    }
  } catch (err) { next(err); }
};

module.exports = { getConfig, saveConfig, testConnection, listAccounts, addAccount, removeAccount, verifyAccount };
