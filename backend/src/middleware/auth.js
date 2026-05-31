const { verifyAccessToken } = require('../utils/jwt');
const { dbGet } = require('../config/database');
const { normalizeRole } = require('../utils/roles');

/**
 * Middleware autentikasi utama — verifikasi JWT access token.
 *
 * Alur:
 * 1. Baca header Authorization: Bearer <token>
 * 2. Verifikasi signature dan expiry JWT
 * 3. Cek pengguna masih ada di DB dan aktif (tidak soft-deleted, tidak inactive)
 * 4. Set req.user dengan data pengguna + rawRole (role DB asli) + role (normalized)
 *
 * rawRole dipertahankan agar controller bisa membedakan ADMIN_RAPAT vs ADMIN_KERJA
 * jika diperlukan untuk logika bisnis yang lebih granular.
 */
const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    // Pastikan pengguna masih aktif dan belum dihapus dari sistem
    const user = await dbGet('SELECT id, name, email, role, status FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.id]);
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif' });
    }
    user.rawRole = user.role;          // nilai asli DB: 'ADMIN_RAPAT', 'ADMIN_KERJA', dsb.
    user.role = normalizeRole(user.role); // nilai normalized: 'user', 'admin', 'superadmin'
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token kadaluarsa', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

/**
 * Middleware otorisasi berbasis role (RBAC).
 * Factory function — mengembalikan middleware yang memeriksa req.user.role terhadap daftar role yang diizinkan.
 *
 * @param {...string} roles - Satu atau lebih role yang diizinkan, misal: roleGuard('admin', 'superadmin')
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/approve', authGuard, roleGuard('admin', 'superadmin'), ctrl.approve);
 */
const roleGuard = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak: izin tidak mencukupi' });
  }
  next();
};

/**
 * Middleware autentikasi opsional.
 * Jika token valid ada, set req.user — tapi tidak menolak request jika tidak ada token.
 * Dipakai pada route publik yang perilakunya berbeda tergantung pengguna login/tidak.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await dbGet('SELECT id, name, email, role, status FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.id]);
      if (user && user.status === 'active') {
        user.rawRole = user.role;
        user.role = normalizeRole(user.role);
        req.user = user;
      }
    }
  } catch {
    // Token tidak valid — biarkan lewat tanpa req.user (opsional)
  }
  next();
};

module.exports = { authGuard, roleGuard, optionalAuth };
