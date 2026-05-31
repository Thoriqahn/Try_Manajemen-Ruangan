/**
 * @fileoverview Global Error Handler Middleware
 * Menangkap semua error yang di-next(err) dari controller manapun
 * dan mengembalikan response JSON yang konsisten.
 */

/**
 * Global error handler — dipasang paling akhir di Express app.
 * Mengembalikan stack trace hanya di mode development.
 *
 * @param {Error} err - Error object (bisa berisi .status atau .statusCode)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

/**
 * Handler untuk route yang tidak ditemukan (404).
 * Dipasang setelah semua router di Express app.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan` });
};

module.exports = { errorHandler, notFoundHandler };
