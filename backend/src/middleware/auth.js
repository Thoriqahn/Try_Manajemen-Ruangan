const { verifyAccessToken } = require('../utils/jwt');
const { dbGet } = require('../config/database');

// Verify JWT token
const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    // Verify user still exists & active
    const user = await dbGet('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token kadaluarsa', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

// Role-based access guard
const roleGuard = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak: izin tidak mencukupi' });
  }
  next();
};

// Optional auth (sets req.user if token present, but doesn't fail)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await dbGet('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
      if (user && user.status === 'active') req.user = user;
    }
  } catch {}
  next();
};

module.exports = { authGuard, roleGuard, optionalAuth };
