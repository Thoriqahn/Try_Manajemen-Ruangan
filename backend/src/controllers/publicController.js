const { dbGet, dbRun, dbAll } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Get basic public booking information
 * GET /api/public/bookings/:id
 */
const getPublicBookingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT b.id, b.agenda, b.date, b.start_time, b.end_time, b.meeting_type,
             u.name as host_name,
             r.name as room_name, r.building_id
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;

    const booking = await dbGet(query, [id]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Rapat tidak ditemukan' });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Submit public attendance
 * POST /api/public/attendances/:bookingId
 */
const submitPublicAttendance = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { name, email, institution, position, signature, attendance_type } = req.body;

    if (!name || !email || !institution || !position) {
      return res.status(400).json({ success: false, message: 'Nama, Email, Instansi, dan Jabatan wajib diisi' });
    }

    // Check if booking exists
    const booking = await dbGet(`SELECT id, status, meeting_type, zoom_join_url, zoom_passcode FROM bookings WHERE id = $1`, [bookingId]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Rapat tidak ditemukan' });
    }

    // Insert or update attendance
    const id = uuidv4();
    const query = `
      INSERT INTO meeting_attendees (id, booking_id, user_name, email, institution, position, signature, attendance_type, scanned_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (booking_id, user_id, email) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        institution = EXCLUDED.institution,
        position = EXCLUDED.position,
        signature = EXCLUDED.signature,
        attendance_type = EXCLUDED.attendance_type,
        scanned_at = NOW()
    `;

    // user_id is implicit NULL in the conflict target if not specified for external attendees, 
    // but the conflict constraint meeting_attendees_booking_id_user_id_email_key handles it.
    // Wait, ON CONFLICT works if the exact unique constraint matches.
    // If the unique constraint is UNIQUE(booking_id, user_id, email), then ON CONFLICT (booking_id, user_id, email) should be used.
    // Wait, in postgres, NULLs are distinct. So if user_id is NULL, two rows with the same email and booking_id might not conflict.
    // Let's just do a manual check or insert.
    
    // Check existing
    const existing = await dbGet(`SELECT id FROM meeting_attendees WHERE booking_id = $1 AND email = $2`, [bookingId, email]);
    
    if (existing) {
      // Update
      await dbRun(`
        UPDATE meeting_attendees SET
          user_name = $1, institution = $2, position = $3, signature = $4, attendance_type = $5, scanned_at = NOW()
        WHERE id = $6
      `, [name, institution, position, signature, attendance_type || 'offline', existing.id]);
    } else {
      // Insert
      await dbRun(`
        INSERT INTO meeting_attendees (id, booking_id, user_name, email, institution, position, signature, attendance_type, scanned_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [id, bookingId, name, email, institution, position, signature, attendance_type || 'offline']);
    }

    // Prepare response
    const responseData = {
      message: 'Presensi berhasil disimpan'
    };

    // If meeting is online/hybrid and user chose online, return Zoom link
    if ((booking.meeting_type === 'hybrid' || booking.meeting_type === 'digital') && attendance_type === 'online') {
      responseData.zoom_join_url = booking.zoom_join_url;
      responseData.zoom_passcode = booking.zoom_passcode;
    }

    res.json({
      success: true,
      ...responseData
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Get active booking by QR token
 * GET /api/public/qr/:token
 */
const getActiveBookingByQr = async (req, res, next) => {
  try {
    const { token } = req.params;

    // First find the room by QR token
    let room;
    try {
      room = await dbGet('SELECT id FROM rooms WHERE (qr_token::text = $1 OR id = $1) AND deleted_at IS NULL', [token]);
    } catch (dbErr) {
      return res.status(404).json({ success: false, message: 'QR Code tidak dikenali' });
    }

    if (!room) {
      return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
    }

    // Now find the active booking for this room today
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // Look for a confirmed or ongoing booking happening right now or soon
    const bookings = await dbAll(
      `SELECT id, start_time, end_time, status, meeting_type
       FROM bookings
       WHERE room_id = $1 AND date = $2 AND status IN ('confirmed', 'ongoing')
       ORDER BY start_time ASC`,
      [room.id, todayStr]
    );

    let targetBooking = null;
    for (const b of bookings) {
      const bookingStart = new Date(`${todayStr}T${b.start_time}:00`);
      const bookingEnd = new Date(`${todayStr}T${b.end_time}:00`);
      
      const earlyLimit = new Date(bookingStart.getTime() - 10 * 60 * 1000); // 10 mins early (aligned with check-in window)
      
      if (now >= earlyLimit && now <= bookingEnd) {
        targetBooking = b;
        break;
      }
    }

    if (!targetBooking) {
      return res.status(404).json({ success: false, message: 'Tidak ada rapat aktif saat ini di ruangan ini.' });
    }

    res.json({ success: true, bookingId: targetBooking.id });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicBookingInfo,
  submitPublicAttendance,
  getActiveBookingByQr
};
