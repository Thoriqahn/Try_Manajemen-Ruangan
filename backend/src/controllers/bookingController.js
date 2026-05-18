const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');

// Conflict check: does a booking overlap with existing ones?
const hasConflict = async (roomId, date, startTime, endTime, excludeId = null) => {
  let sql = `SELECT id FROM bookings WHERE room_id=? AND date=? AND status IN ('pending','confirmed','ongoing')
    AND start_time < ? AND end_time > ?`;
  const params = [roomId, date, endTime, startTime];
  if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
  const existing = await dbGet(sql, params);
  return !!existing;
};

// Check global policy constraints
const checkPolicy = async (date, startTime, endTime, userRole) => {
  const policy = await dbGet('SELECT * FROM global_policy WHERE id=1');
  if (!policy) return null;

  // Max duration
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
  if (durationHours > policy.max_duration_hours) {
    return `Durasi booking melebihi batas maksimal ${policy.max_duration_hours} jam`;
  }

  // Max days ahead (only for regular users)
  if (userRole === 'user') {
    const bookingDate = new Date(date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((bookingDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays > policy.max_days_ahead) {
      return `Pemesanan hanya bisa dilakukan maksimal ${policy.max_days_ahead} hari ke depan`;
    }
  }

  // Blackout check
  const blackout = await dbGet('SELECT id FROM blackout_dates WHERE date=?', [date]);
  if (blackout) return `Tanggal ${date} adalah blackout date dan tidak dapat dipesan`;

  return null;
};

// GET /api/bookings
const listBookings = async (req, res, next) => {
  try {
    const { status, room_id, date_from, date_to, user_id } = req.query;
    let sql = `
      SELECT b.*, r.name as room_name, b2.name as building_name, f.name as floor_name, u.name as user_name
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN buildings b2 ON r.building_id = b2.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Scope by role
    if (req.user.role === 'user') {
      sql += ' AND b.user_id = ?'; params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = ?)`;
      params.push(req.user.id);
    }

    if (status) { sql += ' AND b.status = ?'; params.push(status); }
    if (room_id) { sql += ' AND b.room_id = ?'; params.push(room_id); }
    if (date_from) { sql += ' AND b.date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND b.date <= ?'; params.push(date_to); }
    if (user_id && req.user.role === 'superadmin') { sql += ' AND b.user_id = ?'; params.push(user_id); }

    sql += ' ORDER BY b.date DESC, b.start_time';
    const bookings = await dbAll(sql, params);
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

// GET /api/bookings/:id
const getBooking = async (req, res, next) => {
  try {
    const booking = await dbGet(`
      SELECT b.*, r.name as room_name, b2.name as building_name, f.name as floor_name,
             u.name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN buildings b2 ON r.building_id = b2.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });

    // Access check
    if (req.user.role === 'user' && booking.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Akses ditolak' });

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { room_id, date, start_time, end_time, agenda, participants } = req.body;
    if (!room_id || !date || !start_time || !end_time || !agenda)
      return res.status(400).json({ success: false, message: 'Data booking tidak lengkap' });
    if (start_time >= end_time)
      return res.status(400).json({ success: false, message: 'Jam mulai harus sebelum jam selesai' });

    const room = await dbGet('SELECT * FROM rooms WHERE id=? AND status="active"', [room_id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan atau tidak aktif' });

    // Operational hours check
    if (room.restrict_hours) {
      if (start_time < room.hours_start || end_time > room.hours_end)
        return res.status(400).json({ success: false, message: `Jam pemesanan di luar jam operasional ruangan (${room.hours_start} - ${room.hours_end})` });
    }

    // Policy check
    const policyError = await checkPolicy(date, start_time, end_time, req.user.role);
    if (policyError) return res.status(400).json({ success: false, message: policyError });

    // Conflict check
    const conflict = await hasConflict(room_id, date, start_time, end_time);
    if (conflict) return res.status(409).json({ success: false, message: 'Slot waktu sudah dipesan. Pilih waktu lain.' });

    const bookingId = uuidv4();
    const status = room.approval_type === 'instant' ? 'confirmed' : 'pending';

    await dbRun(
      `INSERT INTO bookings (id, room_id, user_id, date, start_time, end_time, agenda, participants, status) VALUES (?,?,?,?,?,?,?,?,?)`,
      [bookingId, room_id, req.user.id, date, start_time, end_time, agenda, participants || 1, status]
    );

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'CREATE_BOOKING', resource: `${room.name} @ ${date} ${start_time}-${end_time}`, ip: req.ip,
      after: { bookingId, status, agenda }
    });

    const booking = await dbGet('SELECT * FROM bookings WHERE id=?', [bookingId]);
    res.status(201).json({
      success: true,
      message: status === 'confirmed' ? 'Booking berhasil dikonfirmasi!' : 'Permohonan booking dikirim, menunggu persetujuan Admin.',
      data: booking
    });
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id
const updateBooking = async (req, res, next) => {
  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.user_id !== req.user.id && req.user.role === 'user')
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat diubah' });

    const { date, start_time, end_time, agenda, participants } = req.body;
    const newDate = date || booking.date;
    const newStart = start_time || booking.start_time;
    const newEnd = end_time || booking.end_time;
    if (newStart >= newEnd) return res.status(400).json({ success: false, message: 'Jam tidak valid' });

    const room = await dbGet('SELECT * FROM rooms WHERE id=?', [booking.room_id]);
    if (room.restrict_hours && (newStart < room.hours_start || newEnd > room.hours_end))
      return res.status(400).json({ success: false, message: `Di luar jam operasional (${room.hours_start} - ${room.hours_end})` });

    const policyError = await checkPolicy(newDate, newStart, newEnd, req.user.role);
    if (policyError) return res.status(400).json({ success: false, message: policyError });

    const conflict = await hasConflict(booking.room_id, newDate, newStart, newEnd, req.params.id);
    if (conflict) return res.status(409).json({ success: false, message: 'Slot waktu sudah dipesan. Pilih waktu lain.' });

    await dbRun(`UPDATE bookings SET date=?, start_time=?, end_time=?, agenda=COALESCE(?,agenda), participants=COALESCE(?,participants) WHERE id=?`,
      [newDate, newStart, newEnd, agenda||null, participants||null, req.params.id]);

    const updated = await dbGet('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Booking berhasil diperbarui', data: updated });
  } catch (err) { next(err); }
};

// DELETE /api/bookings/:id (cancel)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (req.user.role === 'user' && booking.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat dibatalkan' });

    await dbRun('UPDATE bookings SET status="cancelled", cancel_reason=? WHERE id=?',
      [req.body.reason || 'Dibatalkan oleh pengguna', req.params.id]);

    await audit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'CANCEL_BOOKING', resource: `Booking #${req.params.id}`, ip: req.ip,
      before: { status: booking.status }
    });

    res.json({ success: true, message: 'Booking berhasil dibatalkan' });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/approve
const approveBooking = async (req, res, next) => {
  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Hanya booking pending yang bisa disetujui' });

    // Admin can only approve bookings in their rooms
    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT id FROM room_assignments WHERE admin_id=? AND room_id=?', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status="confirmed" WHERE id=?', [req.params.id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'APPROVE_BOOKING', resource: `Booking #${req.params.id}`, ip: req.ip,
      before: { status: 'pending' }, after: { status: 'confirmed' }
    });

    res.json({ success: true, message: 'Booking disetujui' });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/reject
const rejectBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10)
      return res.status(400).json({ success: false, message: 'Alasan penolakan minimal 10 karakter' });

    const booking = await dbGet('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Hanya booking pending yang bisa ditolak' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT id FROM room_assignments WHERE admin_id=? AND room_id=?', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status="rejected", rejection_reason=? WHERE id=?', [reason, req.params.id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'REJECT_BOOKING', resource: `Booking #${req.params.id}`, ip: req.ip,
      after: { reason }
    });

    res.json({ success: true, message: 'Booking ditolak' });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/force-cancel
const forceCancel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5)
      return res.status(400).json({ success: false, message: 'Alasan pembatalan diperlukan' });

    const booking = await dbGet(`
      SELECT b.*, r.name as room_name, u.email as user_email, u.name as user_name
      FROM bookings b LEFT JOIN rooms r ON b.room_id=r.id LEFT JOIN users u ON b.user_id=u.id
      WHERE b.id=?
    `, [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (!['confirmed', 'ongoing', 'pending'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat dibatalkan' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT id FROM room_assignments WHERE admin_id=? AND room_id=?', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status="cancelled", cancel_reason=? WHERE id=?', [reason, req.params.id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'FORCE_CANCEL', resource: `Booking #${req.params.id} - ${booking.room_name}`, ip: req.ip,
      before: { status: booking.status }, after: { status: 'cancelled', reason }
    });

    res.json({ success: true, message: 'Booking berhasil dibatalkan paksa. Email notifikasi dikirim ke pemesan.' });
  } catch (err) { next(err); }
};

module.exports = { listBookings, getBooking, createBooking, updateBooking, cancelBooking, approveBooking, rejectBooking, forceCancel };
