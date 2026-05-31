/**
 * @fileoverview Utils: Audit Log
 * Fungsi helper untuk mencatat setiap aksi penting ke tabel audit_logs.
 * Dirancang agar selalu non-fatal — error di sini tidak menghentikan request utama.
 */
const { dbRun } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

/**
 * Catat satu entri ke tabel audit_logs.
 * Error di fungsi ini dikatch dan hanya di-log ke console, tidak di-throw,
 * agar kegagalan audit tidak mengganggu proses bisnis utama.
 *
 * @param {object} params
 * @param {string|null} params.actorId - UUID pengguna yang melakukan aksi
 * @param {string} [params.actorName='System'] - Nama aktor (fallback ke 'System' untuk aksi otomatis)
 * @param {string} params.action - Kode aksi, misal: 'CREATE_ROOM', 'APPROVE_BOOKING'
 * @param {string|null} [params.resource] - Resource yang terdampak (nama ruangan, booking ID, dsb.)
 * @param {string|null} [params.ip] - IP address client
 * @param {object|null} [params.before] - Snapshot data sebelum perubahan (akan di-JSON.stringify)
 * @param {object|null} [params.after] - Snapshot data setelah perubahan (akan di-JSON.stringify)
 * @returns {Promise<void>}
 */
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
