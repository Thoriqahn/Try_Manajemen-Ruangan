/**
 * @fileoverview Utils: JWT — Token Generation & Verification
 * Menangani pembuatan dan verifikasi access token (15m) dan refresh token (7d).
 *
 * Konfigurasi melalui environment variables:
 * - JWT_SECRET: secret untuk access token
 * - JWT_REFRESH_SECRET: secret untuk refresh token
 * - JWT_EXPIRES_IN: durasi access token (default: '15m')
 * - JWT_REFRESH_EXPIRES_IN: durasi refresh token (default: '7d')
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

/**
 * Hasilkan pasangan access token dan refresh token untuk pengguna.
 *
 * Payload yang di-sign: { id, email, role }
 * Role yang disertakan adalah role yang sudah dinormalisasi ('user'|'admin'|'superadmin').
 *
 * @param {{ id: string, email: string, role: string }} user - Data pengguna
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

/**
 * Verifikasi access token — throw jika tidak valid atau sudah expired.
 *
 * @param {string} token - JWT access token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

/**
 * Verifikasi refresh token — throw jika tidak valid atau sudah expired.
 *
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };
