const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
const { dbGet, dbRun } = require('../config/database');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/email');
const { normalizeRole } = require('../utils/roles');

/**
 * Hasilkan 6-digit OTP secara acak.
 * @returns {string} Kode OTP 6 digit
 */
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Mendaftarkan pengguna baru dengan status 'pending' dan mengirim OTP verifikasi.
 * POST /api/auth/register
 *
 * Validasi:
 * - name, email, password wajib ada
 * - format email valid (mengandung '@', tanpa spasi)
 * - password minimal 8 karakter, mengandung huruf, angka, dan karakter khusus
 * - email belum terdaftar
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
    if (!email.includes('@') || email.includes(' '))
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password))
      return res.status(400).json({ success: false, message: 'Password minimal 8 karakter, mengandung huruf, angka, dan karakter khusus' });

    const existing = await dbGet('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = Date.now() + 30 * 60 * 1000; // 30 min
    const userId = uuidv4();

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status, otp, otp_expires, otp_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, name, email.toLowerCase(), hash, 'USER', 'pending', otp, otpExpires, 'verify']
    );

    await sendOtpEmail(email, otp, 'verify');
    res.status(201).json({ success: true, message: 'Registrasi berhasil. Kode OTP telah dikirim ke email Anda.', userId });
  } catch (err) { next(err); }
};

/**
 * Verifikasi OTP setelah registrasi — mengaktifkan akun dan mengembalikan token.
 * POST /api/auth/verify-otp
 *
 * @param {string} req.body.userId - ID pengguna yang hendak diverifikasi
 * @param {string} req.body.otp - Kode OTP yang diterima lewat email
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    if (user.status === 'active') return res.status(400).json({ success: false, message: 'Akun sudah terverifikasi' });
    if (!user.otp || user.otp !== otp) return res.status(400).json({ success: false, message: 'Kode OTP tidak valid' });
    if (Date.now() > parseInt(user.otp_expires)) {
      return res.status(400).json({ success: false, message: 'Kode OTP sudah kadaluarsa. Silakan lakukan registrasi ulang.', code: 'OTP_EXPIRED' });
    }

    await dbRun(`UPDATE users SET status='active', otp=NULL, otp_expires=NULL, otp_type=NULL WHERE id=$1`, [userId]);
    const updatedUser = await dbGet('SELECT id, name, email, role, position, work_unit, organization_unit, nip FROM users WHERE id=$1', [userId]);
    
    updatedUser.role = normalizeRole(updatedUser.role);
    
    const { accessToken, refreshToken } = generateTokens(updatedUser);
    await dbRun('UPDATE users SET refresh_token=$1 WHERE id=$2', [refreshToken, userId]);

    res.json({ success: true, message: 'Akun berhasil diverifikasi', accessToken, refreshToken, user: updatedUser });
  } catch (err) { next(err); }
};

/**
 * Kirim ulang OTP ke email pengguna yang belum aktif.
 * POST /api/auth/resend-otp
 *
 * Rate-limited: hanya bisa dikirim 1x per 5 menit.
 */
const resendOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    if (user.status === 'active') return res.status(400).json({ success: false, message: 'Akun sudah aktif' });

    // Rate limit: 1x per 5 menit
    const lastSent = parseInt(user.otp_expires) - 30 * 60 * 1000;
    if (Date.now() - lastSent < 5 * 60 * 1000) {
      const waitSec = Math.ceil((5 * 60 * 1000 - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({ success: false, message: `Mohon tunggu ${waitSec} detik sebelum mengirim ulang OTP` });
    }

    const otp = generateOtp();
    const otpExpires = Date.now() + 30 * 60 * 1000;
    await dbRun('UPDATE users SET otp=$1, otp_expires=$2 WHERE id=$3', [otp, otpExpires, userId]);
    await sendOtpEmail(user.email, otp, user.otp_type || 'verify');
    res.json({ success: true, message: 'Kode OTP baru telah dikirim' });
  } catch (err) { next(err); }
};

/**
 * Login pengguna dengan email dan password.
 * POST /api/auth/login
 *
 * Mengembalikan access token (15m) dan refresh token (7d).
 * Gagal jika akun belum aktif, sudah dinonaktifkan, atau password salah.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email dan password diperlukan' });

    const user = await dbGet('SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    if (user.status === 'pending') return res.status(403).json({ success: false, message: 'Akun belum diverifikasi. Silakan cek email Anda.' });
    if (user.status === 'inactive') return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Email atau password salah' });

    user.role = normalizeRole(user.role);

    const { accessToken, refreshToken } = generateTokens(user);
    await dbRun('UPDATE users SET refresh_token=$1 WHERE id=$2', [refreshToken, user.id]);

    res.json({
      success: true,
      message: 'Login berhasil',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, position: user.position, work_unit: user.work_unit, organization_unit: user.organization_unit, nip: user.nip }
    });
  } catch (err) { next(err); }
};

/**
 * Invalidasi refresh token pengguna (logout).
 * POST /api/auth/logout
 *
 * Menghapus refresh_token di DB sehingga token tidak bisa dipakai ulang.
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await dbRun('UPDATE users SET refresh_token=NULL WHERE refresh_token=$1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logout berhasil' });
  } catch (err) { next(err); }
};

/**
 * Perbarui access token menggunakan refresh token.
 * POST /api/auth/refresh
 *
 * Strategi: refresh token rotation — setiap refresh menghasilkan refresh token baru.
 * Token lama langsung tidak valid setelah dipakai.
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token diperlukan' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND refresh_token=$2 AND deleted_at IS NULL', [decoded.id, refreshToken]);
    if (!user) return res.status(401).json({ success: false, message: 'Refresh token tidak valid atau sudah kadaluarsa' });

    user.role = normalizeRole(user.role);

    const tokens = generateTokens(user);
    await dbRun('UPDATE users SET refresh_token=$1 WHERE id=$2', [tokens.refreshToken, user.id]);

    res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
    }
    next(err);
  }
};

/**
 * Ambil profil pengguna yang sedang login.
 * GET /api/auth/me
 *
 * Memerlukan header Authorization: Bearer <accessToken>
 */
const me = async (req, res, next) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, status, created_at, position, work_unit, organization_unit, nip FROM users WHERE id=$1 AND deleted_at IS NULL', [req.user.id]);
    if (user) {
      user.role = normalizeRole(user.role);
    }
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

/**
 * Kirim OTP reset password ke email.
 * POST /api/auth/forgot-password
 *
 * Selalu mengembalikan respons sukses (anti-enumeration) meski email tidak ditemukan.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email diperlukan' });
    const user = await dbGet('SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL', [email.toLowerCase()]);
    // Selalu respons sukses untuk mencegah email enumeration attack
    if (!user || user.status !== 'active') {
      return res.json({ success: true, message: 'Jika email terdaftar, kode OTP akan dikirim.' });
    }
    const otp = generateOtp();
    const otpExpires = Date.now() + 30 * 60 * 1000;
    await dbRun('UPDATE users SET otp=$1, otp_expires=$2, otp_type=$3 WHERE id=$4', [otp, otpExpires, 'reset', user.id]);
    await sendOtpEmail(email, otp, 'reset');
    res.json({ success: true, message: 'Jika email terdaftar, kode OTP akan dikirim.', userId: user.id });
  } catch (err) { next(err); }
};

/**
 * Reset password menggunakan OTP yang diterima via email.
 * POST /api/auth/reset-password
 *
 * @param {string} req.body.userId - ID pengguna
 * @param {string} req.body.otp - Kode OTP dari email
 * @param {string} req.body.newPassword - Password baru (minimal 8 karakter)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body;
    if (!userId || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });

    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [userId]);
    if (!user || user.otp !== otp || user.otp_type !== 'reset')
      return res.status(400).json({ success: false, message: 'Kode OTP tidak valid' });
    if (Date.now() > parseInt(user.otp_expires))
      return res.status(400).json({ success: false, message: 'Kode OTP sudah kadaluarsa' });

    const hash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password_hash=$1, otp=NULL, otp_expires=NULL, otp_type=NULL WHERE id=$2', [hash, userId]);
    res.json({ success: true, message: 'Password berhasil diubah. Silakan login.' });
  } catch (err) { next(err); }
};

module.exports = { register, verifyOtp, resendOtp, login, logout, refresh, me, forgotPassword, resetPassword };
