/**
 * @fileoverview Role normalization utility — satu sumber kebenaran untuk mapping
 * DB role string ke role yang dipakai di seluruh aplikasi.
 *
 * DB role values: 'USER', 'ADMIN_RAPAT', 'ADMIN_KERJA', 'SUPERADMIN'
 * Normalized values: 'user', 'admin', 'superadmin'
 *
 * Catatan: rawRole (nilai asli DB) tetap dipertahankan di req.user.rawRole
 * untuk keperluan permission check yang membutuhkan perbedaan ADMIN_RAPAT vs ADMIN_KERJA.
 */

/**
 * Normalisasi role dari format database ke format yang dipakai di aplikasi.
 * - 'SUPERADMIN' → 'superadmin'
 * - 'ADMIN_RAPAT' | 'ADMIN_KERJA' → 'admin'
 * - 'USER' dan semua lainnya → 'user'
 *
 * @param {string|null|undefined} dbRole - Nilai role seperti tersimpan di database
 * @returns {'user'|'admin'|'superadmin'} Role yang sudah dinormalisasi
 */
const normalizeRole = (dbRole) => {
  if (!dbRole) return 'user';
  const r = dbRole.toUpperCase();
  if (r === 'SUPERADMIN') return 'superadmin';
  if (r === 'ADMIN_RAPAT' || r === 'ADMIN_KERJA' || r === 'ADMIN') return 'admin';
  return 'user';
};

module.exports = { normalizeRole };
