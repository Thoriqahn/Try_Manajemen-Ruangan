/**
 * @fileoverview Policy Controller
 * Mengelola kebijakan global pemesanan ruangan (durasi max, hari max ke depan)
 * dan daftar tanggal blackout (penutupan fasilitas).
 */
const { dbGet, dbAll, dbRun } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');
const { audit } = require('../utils/audit');

/**
 * Ambil kebijakan global dan daftar blackout dates.
 * GET /api/policy
 *
 * Jika belum ada record policy, auto-create dengan nilai default:
 * - max_duration_hours: 4
 * - max_days_ahead: 30
 */
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

/**
 * Perbarui kebijakan global pemesanan.
 * PUT /api/policy
 *
 * Hanya superadmin yang bisa mengakses endpoint ini.
 * Perubahan dicatat ke audit log.
 *
 * @param {number} [req.body.max_duration_hours] - Durasi maksimal booking dalam jam
 * @param {number} [req.body.max_days_ahead] - Berapa hari ke depan booking boleh dibuat
 */
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

/**
 * Tambah tanggal blackout (penutupan fasilitas).
 * POST /api/policy/blackout
 *
 * Side effects:
 * - Semua booking 'pending'/'confirmed' pada tanggal tersebut otomatis dibatalkan
 * - Notifikasi dikirim ke user yang terdampak
 * - Mendukung ON CONFLICT: jika tanggal sudah ada tapi soft-deleted, di-restore dengan alasan baru
 *
 * @param {string} req.body.date - Tanggal dalam format YYYY-MM-DD
 * @param {string} req.body.reason - Alasan penutupan (wajib)
 */
const addBlackout = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Tanggal diperlukan' });
    if (!reason) return res.status(400).json({ success: false, message: 'Alasan penutupan harus diisi' });

    await dbRun(`
      INSERT INTO blackout_dates (id, date, reason) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (date) DO UPDATE SET deleted_at = NULL, reason = EXCLUDED.reason
    `, [uuidv4(), date, reason]);

    // Batalkan semua booking aktif di tanggal ini
    const affectedBookings = await dbAll(
      `SELECT id, user_id FROM bookings WHERE date = $1 AND status IN ('pending', 'confirmed') AND deleted_at IS NULL`,
      [date]
    );

    if (affectedBookings.length > 0) {
      await dbRun(
        `UPDATE bookings SET status = 'cancelled', cancel_reason = $1 WHERE date = $2 AND status IN ('pending', 'confirmed') AND deleted_at IS NULL`,
        [reason, date]
      );

      // Kirim notifikasi ke setiap user yang terdampak (1 notif per user)
      const uniqueUsers = [...new Set(affectedBookings.map(b => b.user_id))];
      for (const userId of uniqueUsers) {
        await dbRun(
          `INSERT INTO notifications (id, user_id, title, message) VALUES ($1, $2, $3, $4)`,
          [uuidv4(), userId, 'Pemesanan Dibatalkan Oleh Sistem', `Pemesanan ruangan Anda pada tanggal ${date} dibatalkan otomatis karena kebijakan penutupan fasilitas. Alasan: ${reason}`]
        );
      }
    }

    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'ADD_BLACKOUT', resource: date, ip: req.ip, after: { date, reason, cancelledBookingsCount: affectedBookings.length } });
    res.status(201).json({ success: true, message: `Blackout date ${date} ditambahkan, ${affectedBookings.length} booking dibatalkan.` });
  } catch (err) { next(err); }
};

/**
 * Hapus (soft delete) tanggal blackout — fasilitas kembali buka pada tanggal tersebut.
 * DELETE /api/policy/blackout/:date
 *
 * Booking yang sudah dibatalkan sebelumnya TIDAK otomatis dipulihkan.
 */
const removeBlackout = async (req, res, next) => {
  try {
    await dbRun('UPDATE blackout_dates SET deleted_at=NOW() WHERE date=$1 AND deleted_at IS NULL', [req.params.date]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'REMOVE_BLACKOUT', resource: req.params.date, ip: req.ip });
    res.json({ success: true, message: `Blackout date ${req.params.date} dihapus` });
  } catch (err) { next(err); }
};

module.exports = { getPolicy, updatePolicy, addBlackout, removeBlackout };
