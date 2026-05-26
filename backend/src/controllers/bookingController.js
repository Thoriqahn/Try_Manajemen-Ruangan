const { dbGet, dbAll, dbRun, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');
const { createZoomMeeting, deleteZoomMeeting, updateZoomMeeting } = require('../utils/zoom');

// Conflict check: does a booking overlap with existing ones?
const hasConflict = async (roomId, date, startTime, endTime, excludeId = null, client = null) => {
  const query = client ? client.query.bind(client) : async (sql, params) => { const r = await require('../config/database').pool.query(sql, params); return r; };
  let sql = `SELECT id FROM bookings WHERE room_id=$1 AND date=$2 AND status IN ('pending','confirmed','ongoing')
    AND start_time < $3 AND end_time > $4 AND deleted_at IS NULL`;
  const params = [roomId, date, endTime, startTime];
  if (excludeId) { sql += ' AND id != $5'; params.push(excludeId); }
  const result = await query(sql, params);
  const rows = result.rows || [result].filter(Boolean);
  return rows.length > 0;
};

// Check global policy constraints
const checkPolicy = async (date, startTime, endTime, userRole) => {
  const policy = await dbGet('SELECT * FROM global_policy WHERE id=1 AND deleted_at IS NULL');
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
  const blackout = await dbGet('SELECT id FROM blackout_dates WHERE date=$1 AND deleted_at IS NULL', [date]);
  if (blackout) return `Tanggal ${date} adalah blackout date dan tidak dapat dipesan`;

  return null;
};

// Find an available Zoom account for a time slot
const findAvailableZoomAccount = async (date, startTime, endTime, client) => {
  const query = client ? client.query.bind(client) : async (sql, params) => { const r = await require('../config/database').pool.query(sql, params); return r; };
  // Get all active Zoom accounts
  const accountsResult = await query(
    `SELECT za.* FROM zoom_accounts za WHERE za.status = 'active' AND za.is_verified = TRUE AND za.deleted_at IS NULL`, []
  );
  const accounts = accountsResult.rows || [];
  if (accounts.length === 0) return null;

  // Find one that doesn't have a conflicting booking
  for (const account of accounts) {
    const conflictResult = await query(
      `SELECT b.id FROM bookings b
       WHERE b.zoom_host_email = $1
       AND b.date = $2
       AND b.status IN ('pending','confirmed','ongoing')
       AND b.start_time < $3 AND b.end_time > $4
       AND b.deleted_at IS NULL`,
      [account.email, date, endTime, startTime]
    );
    const conflicts = conflictResult.rows || [];
    if (conflicts.length === 0) return account;
  }
  return null;
};

// GET /api/bookings
const listBookings = async (req, res, next) => {
  try {
    const { status, room_id, date_from, date_to, user_id, admin_id } = req.query;
    let sql = `
      SELECT b.*, r.name as room_name, b2.name as building_name, f.name as floor_name, u.name as user_name,
             (SELECT STRING_AGG(u2.name, ', ')
              FROM room_assignments ra
              JOIN users u2 ON ra.user_id = u2.id
              WHERE ra.room_id = b.room_id AND u2.deleted_at IS NULL) as admin_names
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN buildings b2 ON r.building_id = b2.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;

    // Scope by role and query params
    const { managed_only, own_only } = req.query;

    if (own_only === 'true' || req.user.role === 'user') {
      sql += ` AND b.user_id = $${paramIdx++}`; params.push(req.user.id);
    } else if (req.user.role === 'admin' && managed_only === 'true') {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params.push(req.user.id);
    } else if (req.user.role === 'superadmin' && admin_id) {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params.push(admin_id);
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        const placeholders = statuses.map((_, i) => `$${paramIdx + i}`).join(',');
        sql += ` AND b.status IN (${placeholders})`;
        params.push(...statuses);
        paramIdx += statuses.length;
      } else {
        sql += ` AND b.status = $${paramIdx++}`;
        params.push(status);
      }
    }
    if (room_id) { sql += ` AND b.room_id = $${paramIdx++}`; params.push(room_id); }
    if (date_from) { sql += ` AND b.date >= $${paramIdx++}`; params.push(date_from); }
    if (date_to) { sql += ` AND b.date <= $${paramIdx++}`; params.push(date_to); }
    if (user_id && req.user.role === 'superadmin') { sql += ` AND b.user_id = $${paramIdx++}`; params.push(user_id); }
    if (admin_id && req.user.role === 'superadmin') {
      sql += ` AND b.room_id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params.push(admin_id);
    }

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
      WHERE b.id = $1 AND b.deleted_at IS NULL
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
  const client = await getClient();
  try {
    const { room_id, date, start_time, end_time, agenda, participants, surat_terkait, meeting_type = 'offline' } = req.body;
    if (!date || !start_time || !end_time || !agenda)
      return res.status(400).json({ success: false, message: 'Data booking tidak lengkap' });
    if (start_time >= end_time)
      return res.status(400).json({ success: false, message: 'Jam mulai harus sebelum jam selesai' });

    let activeMeetingType = meeting_type;
    let room = null;
    if (room_id) {
      room = await dbGet('SELECT * FROM rooms WHERE id=$1 AND status=$2 AND deleted_at IS NULL', [room_id, 'active']);
      if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan atau tidak aktif' });

      if (room.room_type === 'digital') {
        activeMeetingType = 'online';
      } else if (room.room_type === 'hybrid') {
        activeMeetingType = 'hybrid';
      }

      // Operational hours check
      if (room.restrict_hours) {
        if (start_time < room.hours_start || end_time > room.hours_end)
          return res.status(400).json({ success: false, message: `Jam pemesanan di luar jam operasional ruangan (${room.hours_start} - ${room.hours_end})` });
      }
    }

    if (!['offline', 'online', 'hybrid'].includes(activeMeetingType))
      return res.status(400).json({ success: false, message: 'Tipe meeting tidak valid (offline/online/hybrid)' });

    // For offline and hybrid, room is required
    if (activeMeetingType !== 'online' && !room_id)
      return res.status(400).json({ success: false, message: 'Ruangan wajib dipilih untuk tipe offline/hybrid' });

    // Policy check
    const policyError = await checkPolicy(date, start_time, end_time, req.user.role);
    if (policyError) return res.status(400).json({ success: false, message: policyError });

    await client.query('BEGIN');

    // Conflict check under transaction (only for physical rooms)
    if (room_id) {
      const conflict = await hasConflict(room_id, date, start_time, end_time, null, client);
      if (conflict) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ success: false, message: 'Slot waktu sudah dipesan. Pilih waktu lain.' });
      }
    }

    // Zoom meeting creation for online/hybrid
    let zoomData = { zoom_meeting_id: null, zoom_join_url: null, zoom_passcode: null, zoom_host_email: null };
    if (activeMeetingType === 'online' || activeMeetingType === 'hybrid') {
      const zoomAccount = await findAvailableZoomAccount(date, start_time, end_time, client);
      if (!zoomAccount) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ success: false, message: 'Maaf, seluruh slot akun virtual rapat untuk jam ini sudah terpakai. Sila pilih waktu lain.' });
      }

      try {
        const zoomResult = await createZoomMeeting(zoomAccount.email, agenda, date, start_time, end_time);
        zoomData = {
          zoom_meeting_id: String(zoomResult.id),
          zoom_join_url: zoomResult.join_url,
          zoom_passcode: zoomResult.password || zoomResult.passcode || null,
          zoom_host_email: zoomAccount.email,
        };

        await audit({
          actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
          action: 'ZOOM_CREATE_SUCCESS', resource: `Meeting for "${agenda}"`, ip: req.ip,
          after: { zoom_meeting_id: zoomData.zoom_meeting_id, host: zoomAccount.email }
        });
      } catch (zoomErr) {
        await audit({
          actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
          action: 'ZOOM_CREATE_FAILED', resource: `Meeting for "${agenda}"`, ip: req.ip,
          after: { error: zoomErr.message, host: zoomAccount.email }
        });
        // Still allow booking but without Zoom link (graceful degradation)
        console.error('Zoom meeting creation failed:', zoomErr.message);
      }
    }

    const bookingId = uuidv4();
    const bookingStatus = room && room.approval_type === 'manual' ? 'pending' : 'confirmed';

    await client.query(
      `INSERT INTO bookings (id, room_id, user_id, date, start_time, end_time, agenda, participants, status, surat_terkait, meeting_type, zoom_meeting_id, zoom_join_url, zoom_passcode, zoom_host_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [bookingId, room_id || null, req.user.id, date, start_time, end_time, agenda, participants || 1, bookingStatus,
       surat_terkait || null, activeMeetingType, zoomData.zoom_meeting_id, zoomData.zoom_join_url, zoomData.zoom_passcode, zoomData.zoom_host_email]
    );

    // Log zoom meeting creation in zoom_meeting_logs
    if (zoomData.zoom_meeting_id) {
      const zoomAccount = await dbGet('SELECT id FROM zoom_accounts WHERE email=$1 AND deleted_at IS NULL', [zoomData.zoom_host_email]);
      await client.query(
        `INSERT INTO zoom_meeting_logs (id, booking_id, zoom_account_id, zoom_meeting_id, zoom_join_url, zoom_passcode, action, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), bookingId, zoomAccount?.id || null, zoomData.zoom_meeting_id, zoomData.zoom_join_url, zoomData.zoom_passcode, 'CREATE', 'success']
      );
    }

    await client.query('COMMIT');
    client.release();

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'CREATE_BOOKING', resource: `${room ? room.name : 'Online Meeting'} @ ${date} ${start_time}-${end_time}`, ip: req.ip,
      after: { bookingId, status: bookingStatus, agenda, meeting_type: activeMeetingType, surat_terkait }
    });

    const booking = await dbGet('SELECT * FROM bookings WHERE id=$1', [bookingId]);
    res.status(201).json({
      success: true,
      message: bookingStatus === 'confirmed' ? 'Booking berhasil dikonfirmasi!' : 'Permohonan booking dikirim, menunggu persetujuan Admin.',
      data: booking
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    client.release();
    next(err);
  }
};

// PUT /api/bookings/:id
const updateBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.user_id !== req.user.id && req.user.role === 'user')
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat diubah' });

    const { date, start_time, end_time, agenda, participants, surat_terkait } = req.body;
    const newDate = date || booking.date;
    const newStart = start_time || booking.start_time;
    const newEnd = end_time || booking.end_time;
    if (newStart >= newEnd) return res.status(400).json({ success: false, message: 'Jam tidak valid' });

    if (booking.room_id) {
      const room = await dbGet('SELECT * FROM rooms WHERE id=$1 AND deleted_at IS NULL', [booking.room_id]);
      if (room && room.restrict_hours && (newStart < room.hours_start || newEnd > room.hours_end))
        return res.status(400).json({ success: false, message: `Di luar jam operasional (${room.hours_start} - ${room.hours_end})` });
    }

    const policyError = await checkPolicy(newDate, newStart, newEnd, req.user.role);
    if (policyError) return res.status(400).json({ success: false, message: policyError });

    await client.query('BEGIN');

    if (booking.room_id) {
      const conflict = await hasConflict(booking.room_id, newDate, newStart, newEnd, req.params.id, client);
      if (conflict) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ success: false, message: 'Slot waktu sudah dipesan. Pilih waktu lain.' });
      }
    }

    await client.query(
      `UPDATE bookings SET date=$1, start_time=$2, end_time=$3, agenda=COALESCE($4,agenda), participants=COALESCE($5,participants), surat_terkait=COALESCE($6,surat_terkait) WHERE id=$7`,
      [newDate, newStart, newEnd, agenda||null, participants||null, surat_terkait !== undefined ? surat_terkait : null, req.params.id]
    );

    await client.query('COMMIT');
    client.release();

    // Zoom reschedule if time changed
    const timeChanged = (newDate !== booking.date || newStart !== booking.start_time || newEnd !== booking.end_time);
    if (timeChanged && booking.zoom_meeting_id) {
      try {
        await updateZoomMeeting(booking.zoom_meeting_id, newDate, newStart, newEnd);
        await audit({
          actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
          action: 'ZOOM_UPDATE_SUCCESS', resource: `Meeting ID: ${booking.zoom_meeting_id}`, ip: req.ip,
          after: { date: newDate, start_time: newStart, end_time: newEnd }
        });
      } catch (zoomErr) {
        await audit({
          actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
          action: 'ZOOM_UPDATE_FAILED', resource: `Meeting ID: ${booking.zoom_meeting_id}`, ip: req.ip,
          after: { error: zoomErr.message }
        });
        console.error('Zoom meeting update failed:', zoomErr.message);
      }
    }

    const updated = await dbGet('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Booking berhasil diperbarui', data: updated });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    client.release();
    next(err);
  }
};

// Helper to cancel Zoom meeting and release slot
const cancelZoomIfNeeded = async (booking, actorId, actorName, ip) => {
  if (booking.zoom_meeting_id) {
    try {
      await deleteZoomMeeting(booking.zoom_meeting_id);
      await audit({
        actorId, actorName,
        action: 'ZOOM_DELETE_SUCCESS', resource: `Meeting ID: ${booking.zoom_meeting_id}`, ip,
        after: { booking_id: booking.id }
      });
      // Log to zoom_meeting_logs
      await dbRun(
        `INSERT INTO zoom_meeting_logs (id, booking_id, zoom_meeting_id, action, status) VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), booking.id, booking.zoom_meeting_id, 'DELETE', 'success']
      );
    } catch (zoomErr) {
      await audit({
        actorId, actorName,
        action: 'ZOOM_DELETE_FAILED', resource: `Meeting ID: ${booking.zoom_meeting_id}`, ip,
        after: { error: zoomErr.message }
      });
      await dbRun(
        `INSERT INTO zoom_meeting_logs (id, booking_id, zoom_meeting_id, action, status, error_message) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), booking.id, booking.zoom_meeting_id, 'DELETE', 'failed', zoomErr.message]
      );
      console.error('Zoom meeting delete failed:', zoomErr.message);
    }
  }
};

// DELETE /api/bookings/:id (cancel — soft delete via status change)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (req.user.role === 'user' && booking.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat dibatalkan' });

    await dbRun('UPDATE bookings SET status=$1, cancel_reason=$2 WHERE id=$3',
      ['cancelled', req.body.reason || 'Dibatalkan oleh pengguna', req.params.id]);

    // Cancel Zoom meeting if exists
    await cancelZoomIfNeeded(booking, req.user.id, req.user.name, req.ip);

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
    const booking = await dbGet('SELECT * FROM bookings WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Hanya booking pending yang bisa disetujui' });

    // Admin can only approve bookings in their rooms
    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT 1 FROM room_assignments WHERE user_id=$1 AND room_id=$2', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status=$1 WHERE id=$2', ['confirmed', req.params.id]);
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

    const booking = await dbGet('SELECT * FROM bookings WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, message: 'Hanya booking pending yang bisa ditolak' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT 1 FROM room_assignments WHERE user_id=$1 AND room_id=$2', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status=$1, rejection_reason=$2 WHERE id=$3', ['rejected', reason, req.params.id]);

    // Cancel Zoom meeting if exists
    await cancelZoomIfNeeded(booking, req.user.id, `${req.user.name} (${req.user.role})`, req.ip);

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
      WHERE b.id=$1 AND b.deleted_at IS NULL
    `, [req.params.id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    if (!['confirmed', 'ongoing', 'pending'].includes(booking.status))
      return res.status(400).json({ success: false, message: 'Booking tidak dapat dibatalkan' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT 1 FROM room_assignments WHERE user_id=$1 AND room_id=$2', [req.user.id, booking.room_id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await dbRun('UPDATE bookings SET status=$1, cancel_reason=$2 WHERE id=$3', ['cancelled', reason, req.params.id]);

    // Cancel Zoom meeting if exists
    await cancelZoomIfNeeded(booking, req.user.id, `${req.user.name} (${req.user.role})`, req.ip);

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'FORCE_CANCEL', resource: `Booking #${req.params.id} - ${booking.room_name || 'Online Meeting'}`, ip: req.ip,
      before: { status: booking.status }, after: { status: 'cancelled', reason }
    });

    res.json({ success: true, message: 'Booking berhasil dibatalkan paksa. Email notifikasi dikirim ke pemesan.' });
  } catch (err) { next(err); }
};

// POST /api/v1/bookings/check-in
const checkInBooking = async (req, res, next) => {
  try {
    const { room_id, scanned_qr_token, simulate_user_id } = req.body;
    
    let targetUserId = req.user.id;
    let targetUserName = req.user.name;

    if (simulate_user_id && req.user.role === 'superadmin') {
      const simulatedUser = await dbGet('SELECT id, name FROM users WHERE id = $1', [simulate_user_id]);
      if (simulatedUser) {
        targetUserId = simulatedUser.id;
        targetUserName = simulatedUser.name;
      }
    }


    // 1. Verify QR Token Matches
    let room;
    if (room_id) {
      room = await dbGet(
        'SELECT id, name, qr_token FROM rooms WHERE id = $1 AND deleted_at IS NULL',
        [room_id]
      );
      if (!room) {
        return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
      }
      if (room.qr_token !== scanned_qr_token) {
        return res.status(403).json({ success: false, message: 'Token QR Code tidak valid untuk ruangan ini' });
      }
    } else {
      try {
        room = await dbGet(
          'SELECT id, name, qr_token FROM rooms WHERE (qr_token::text = $1 OR id = $1) AND deleted_at IS NULL',
          [scanned_qr_token]
        );
      } catch (dbErr) {
        // If it throws an error (e.g. invalid input syntax for type uuid), it means it's not a recognized QR token
        return res.status(404).json({ success: false, message: 'QR Code tidak dikenali atau format tidak valid' });
      }
      if (!room) {
        return res.status(404).json({ success: false, message: 'QR Code tidak dikenali atau ruangan tidak ditemukan' });
      }
    }
    
    const actualRoomId = room.id;

    // 2. Find confirmed or ongoing bookings for this room on the current date
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    const bookings = await dbAll(
      `SELECT id, room_id, user_id, date, start_time, end_time, status, is_checked_in
       FROM bookings
       WHERE room_id = $1 AND date = $2 AND status IN ('confirmed', 'ongoing')
       ORDER BY start_time ASC`,
      [actualRoomId, todayStr]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tidak ada pemesanan terkonfirmasi yang aktif untuk Anda di ruangan ini pada hari ini' 
      });
    }

    // Find the current booking that matches the check-in time windows
    let targetBooking = null;
    let timeErrorReason = null;

    for (const b of bookings) {
      const bookingStart = new Date(`${b.date}T${b.start_time}:00`);
      const bookingEnd = new Date(`${b.date}T${b.end_time}:00`);
      
      const earlyLimit = new Date(bookingStart.getTime() - 10 * 60 * 1000); // 10 mins early
      const lateLimit = new Date(bookingStart.getTime() + 15 * 60 * 1000); // 15 mins late

      if (now >= earlyLimit && now <= bookingEnd) {
        // Late check-in check
        if (now > lateLimit) {
          timeErrorReason = 'Window check-in telah berakhir (lebih dari 15 menit dari jam mulai)';
          continue;
        }

        // Early check-in check
        if (now >= earlyLimit && now < bookingStart) {
          const tenMinsAgoTimeStr = new Date(bookingStart.getTime() - 10 * 60 * 1000)
            .toTimeString().split(' ')[0].substring(0, 5);
          
          const precedingBooking = await dbGet(
            `SELECT id FROM bookings
             WHERE room_id = $1 AND date = $2 AND id <> $3
               AND status IN ('confirmed', 'ongoing', 'completed')
               AND end_time > $4 AND end_time <= $5
             LIMIT 1`,
            [actualRoomId, b.date, b.id, tenMinsAgoTimeStr, b.start_time]
          );

          if (precedingBooking) {
            timeErrorReason = 'Check-in awal diblokir karena ada sesi pertemuan pendahulu yang sedang berlangsung';
            continue;
          }
        }

        targetBooking = b;
        break;
      }
    }

    if (!targetBooking) {
      if (timeErrorReason === 'Window check-in telah berakhir (lebih dari 15 menit dari jam mulai)') {
        return res.status(410).json({ 
          success: false, 
          message: 'Check-in gagal: Batas waktu check-in (15 menit) telah kedaluwarsa' 
        });
      }
      if (timeErrorReason === 'Check-in awal diblokir karena ada sesi pertemuan pendahulu yang sedang berlangsung') {
        return res.status(400).json({ 
          success: false, 
          message: 'Check-in awal tidak diizinkan karena pertemuan pendahulu masih aktif. Harap tunggu hingga waktu mulai tepat.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in gagal: Waktu saat ini berada di luar rentang waktu pemesanan Anda' 
      });
    }

    // 4. Handle Room Claim vs Attendance
    const client = await getClient();
    try {
      await client.query('BEGIN');

      let responseMessage = '';
      let isRoomClaim = false;

      // Ensure user is not already recorded as attendee
      const existingAttendee = await client.query(
        'SELECT id FROM meeting_attendees WHERE booking_id = $1 AND user_id = $2',
        [targetBooking.id, targetUserId]
      );

      if (existingAttendee.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(200).json({
          success: true,
          message: 'Anda sudah melakukan presensi untuk rapat ini',
          data: {
            booking_id: targetBooking.id,
            room_id: targetBooking.room_id,
            is_checked_in: true,
            status: targetBooking.status
          }
        });
      }

      if (!targetBooking.is_checked_in) {
        // Ensure only the booking owner can perform the first check-in (Room Claim)
        if (targetUserId !== targetBooking.user_id) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: 'Ruangan ini sudah dibooking oleh pengguna lain. Hanya pembuat reservasi yang dapat melakukan klaim/check-in pertama.'
          });
        }

        // First Scanner: Room Claim
        isRoomClaim = true;
        await client.query(
          `UPDATE bookings
           SET is_checked_in = TRUE, status = 'ongoing'
           WHERE id = $1`,
          [targetBooking.id]
        );

        // Audit Log for check-in event
        const auditId = uuidv4();
        const action = 'CHECK_IN';
        const resource = `Booking #${targetBooking.id} - ${room.name || 'Room'}`;
        const payloadBefore = JSON.stringify({ is_checked_in: false, status: 'confirmed' });
        const payloadAfter = JSON.stringify({ is_checked_in: true, status: 'ongoing' });

        const actorLabel = (simulate_user_id && req.user.role === 'superadmin')
          ? `${targetUserName} (Simulated by ${req.user.name})`
          : targetUserName;
        await client.query(
          `INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, payload_before, payload_after)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [auditId, targetUserId, actorLabel, action, resource, payloadBefore, payloadAfter]
        );

        responseMessage = 'Check-in ruangan berhasil, Anda tercatat hadir.';
      } else {
        // Subsequent Scanner: Attendance
        responseMessage = 'Presensi kehadiran berhasil dicatat.';
      }

      // Record Attendance
      await client.query(
        `INSERT INTO meeting_attendees (booking_id, user_id, user_name)
         VALUES ($1, $2, $3)`,
        [targetBooking.id, targetUserId, targetUserName]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: responseMessage,
        data: {
          booking_id: targetBooking.id,
          room_id: targetBooking.room_id,
          start_time: targetBooking.start_time,
          end_time: targetBooking.end_time,
          is_checked_in: true,
          status: isRoomClaim ? 'ongoing' : targetBooking.status
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/bookings/:id/attendees
const getBookingAttendees = async (req, res, next) => {
  try {
    const attendees = await dbAll(
      `SELECT id, user_id, user_name, email, institution, position, signature, attendance_type, scanned_at 
       FROM meeting_attendees 
       WHERE booking_id = $1 
       ORDER BY scanned_at ASC`,
      [req.params.id]
    );

    const logs = await dbAll(
      `SELECT user_id, action, created_at 
       FROM meeting_attendee_logs 
       WHERE booking_id = $1 
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    // Map logs to attendees
    const attendeesWithLogs = attendees.map(att => {
      if (att.user_id) {
        att.logs = logs.filter(l => l.user_id === att.user_id).map(l => ({
          action: l.action,
          timestamp: l.created_at
        }));
      } else {
        att.logs = [];
      }
      return att;
    });

    res.status(200).json({
      success: true,
      data: attendeesWithLogs
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/bookings/:id/zoom-join
const logZoomJoin = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const userName = req.user.name;

    // Log the join action
    await dbRun(
      `INSERT INTO meeting_attendee_logs (booking_id, user_id, action) VALUES ($1, $2, $3)`,
      [bookingId, userId, 'zoom_join']
    );

    // Make sure they are in the attendees list as online (manual check to avoid NULL conflict)
    const existing = await dbGet(
      'SELECT id FROM meeting_attendees WHERE booking_id = $1 AND user_id = $2',
      [bookingId, userId]
    );
    if (existing) {
      await dbRun(
        'UPDATE meeting_attendees SET attendance_type = $1, scanned_at = NOW() WHERE id = $2',
        ['online', existing.id]
      );
    } else {
      await dbRun(
        `INSERT INTO meeting_attendees (id, booking_id, user_id, user_name, attendance_type, scanned_at)
         VALUES ($1, $2, $3, $4, 'online', NOW())`,
        [uuidv4(), bookingId, userId, userName]
      );
    }

    res.status(200).json({ success: true, message: 'Zoom join recorded' });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/bookings/:id/zoom-leave
const logZoomLeave = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Log the leave action
    await dbRun(
      `INSERT INTO meeting_attendee_logs (booking_id, user_id, action) VALUES ($1, $2, $3)`,
      [bookingId, userId, 'zoom_leave']
    );

    res.status(200).json({ success: true, message: 'Zoom leave recorded' });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  listBookings, getBooking, createBooking, updateBooking, cancelBooking, 
  approveBooking, rejectBooking, forceCancel, checkInBooking, getBookingAttendees, logZoomJoin, logZoomLeave 
};
