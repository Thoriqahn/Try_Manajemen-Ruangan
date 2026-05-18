const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');
const path = require('path');

// Helper to get full room with layouts and facilities
const getRoomFull = async (roomId) => {
  const room = await dbGet(`
    SELECT r.*, b.name as building_name, f.name as floor_name, u.name as admin_name
    FROM rooms r
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN floors f ON r.floor_id = f.id
    LEFT JOIN users u ON r.admin_id = u.id
    WHERE r.id = ?
  `, [roomId]);
  if (!room) return null;
  room.layouts = await dbAll('SELECT * FROM room_layouts WHERE room_id = ?', [roomId]);
  room.facilities = await dbAll('SELECT * FROM room_facilities WHERE room_id = ?', [roomId]);
  return room;
};

// GET /api/rooms
const listRooms = async (req, res, next) => {
  try {
    const { building_id, floor_id, status, search, approval_type } = req.query;
    let sql = `
      SELECT r.*, b.name as building_name, f.name as floor_name, u.name as admin_name
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN users u ON r.admin_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-superadmin can only see active rooms by default
    if (req.user && req.user.role === 'user') {
      sql += ' AND r.status = "active"';
    } else if (status) {
      sql += ' AND r.status = ?'; params.push(status);
    }
    if (building_id) { sql += ' AND r.building_id = ?'; params.push(building_id); }
    if (floor_id) { sql += ' AND r.floor_id = ?'; params.push(floor_id); }
    if (approval_type) { sql += ' AND r.approval_type = ?'; params.push(approval_type); }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`); }

    // Scope for admin (only their assigned rooms)
    if (req.user && req.user.role === 'admin') {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE admin_id = ?)`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY b.name, f.level, r.name';
    const rooms = await dbAll(sql, params);

    // Enrich with layouts
    for (const room of rooms) {
      room.layouts = await dbAll('SELECT * FROM room_layouts WHERE room_id = ?', [room.id]);
      room.facilities = await dbAll('SELECT * FROM room_facilities WHERE room_id = ?', [room.id]);
    }

    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id
const getRoom = async (req, res, next) => {
  try {
    const room = await getRoomFull(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
};

// POST /api/rooms
const createRoom = async (req, res, next) => {
  try {
    const { name, building_id, floor_id, admin_id, description, status = 'active', approval_type = 'instant',
      restrict_hours = false, hours_start, hours_end, layouts = [], facilities = [] } = req.body;

    if (!name || !building_id || !floor_id) {
      return res.status(400).json({ success: false, message: 'Nama ruangan, gedung, dan lantai wajib diisi' });
    }
    if (layouts.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 layout harus dipilih' });
    }

    // Duplicate check
    const dup = await dbGet('SELECT id FROM rooms WHERE name=? AND building_id=? AND floor_id=?', [name, building_id, floor_id]);
    if (dup) return res.status(409).json({ success: false, message: 'Nama ruangan sudah ada di lantai/gedung ini' });

    const roomId = uuidv4();
    const effectiveAdminId = req.user.role === 'superadmin' ? (admin_id || null) : req.user.id;

    await dbRun(
      `INSERT INTO rooms (id, name, building_id, floor_id, admin_id, description, status, approval_type, restrict_hours, hours_start, hours_end, image_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [roomId, name, building_id, floor_id, effectiveAdminId, description || null, status, approval_type,
       restrict_hours ? 1 : 0, restrict_hours ? hours_start : null, restrict_hours ? hours_end : null,
       req.body.image_url || null]
    );

    // Insert layouts
    for (const layout of layouts) {
      await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES (?,?,?,?)`,
        [uuidv4(), roomId, layout.type, layout.capacity]);
    }

    // Insert facilities
    for (const fac of facilities) {
      await dbRun(`INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES (?,?,?,?)`,
        [uuidv4(), roomId, fac.type, fac.quantity]);
    }

    // Auto-assign to admin if superadmin set admin_id
    if (effectiveAdminId) {
      await dbRun(`INSERT OR IGNORE INTO room_assignments (id, admin_id, room_id) VALUES (?,?,?)`,
        [uuidv4(), effectiveAdminId, roomId]);
    }

    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'CREATE_ROOM', resource: name, ip: req.ip, after: { id: roomId, name }
    });

    const room = await getRoomFull(roomId);
    res.status(201).json({ success: true, message: 'Ruangan berhasil dibuat', data: room });
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id
const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await dbGet('SELECT * FROM rooms WHERE id=?', [id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    // Admin can only update their assigned rooms
    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT id FROM room_assignments WHERE admin_id=? AND room_id=?', [req.user.id, id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke ruangan ini' });
    }

    const { name, building_id, floor_id, admin_id, description, status, approval_type,
      restrict_hours, hours_start, hours_end, layouts, facilities, image_url } = req.body;

    const before = { ...room };

    // Duplicate check if name changed
    if (name && name !== room.name) {
      const bId = building_id || room.building_id;
      const fId = floor_id || room.floor_id;
      const dup = await dbGet('SELECT id FROM rooms WHERE name=? AND building_id=? AND floor_id=? AND id!=?', [name, bId, fId, id]);
      if (dup) return res.status(409).json({ success: false, message: 'Nama ruangan sudah ada di lantai/gedung ini' });
    }

    await dbRun(`UPDATE rooms SET
      name = COALESCE(?, name),
      building_id = COALESCE(?, building_id),
      floor_id = COALESCE(?, floor_id),
      admin_id = COALESCE(?, admin_id),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      approval_type = COALESCE(?, approval_type),
      restrict_hours = COALESCE(?, restrict_hours),
      hours_start = ?,
      hours_end = ?,
      image_url = COALESCE(?, image_url)
      WHERE id = ?`,
      [name||null, building_id||null, floor_id||null,
       req.user.role==='superadmin' ? (admin_id||null) : null,
       description!==undefined ? description : null,
       status||null, approval_type||null,
       restrict_hours!==undefined ? (restrict_hours?1:0) : null,
       restrict_hours ? (hours_start||null) : null,
       restrict_hours ? (hours_end||null) : null,
       image_url||null, id]
    );

    // Update layouts if provided
    if (layouts && layouts.length > 0) {
      await dbRun('DELETE FROM room_layouts WHERE room_id=?', [id]);
      for (const l of layouts) {
        await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES (?,?,?,?)`,
          [uuidv4(), id, l.type, l.capacity]);
      }
    }

    // Update facilities if provided
    if (facilities && facilities.length > 0) {
      await dbRun('DELETE FROM room_facilities WHERE room_id=?', [id]);
      for (const f of facilities) {
        await dbRun(`INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES (?,?,?,?)`,
          [uuidv4(), id, f.type, f.quantity]);
      }
    }

    const updated = await getRoomFull(id);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'UPDATE_ROOM', resource: updated.name, ip: req.ip,
      before: { status: before.status }, after: { status: updated.status }
    });

    res.json({ success: true, message: 'Ruangan berhasil diperbarui', data: updated });
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id (soft delete)
const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await dbGet('SELECT * FROM rooms WHERE id=?', [id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT id FROM room_assignments WHERE admin_id=? AND room_id=?', [req.user.id, id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Check active bookings
    const activeBookings = await dbAll(
      `SELECT id FROM bookings WHERE room_id=? AND status IN ('pending','confirmed','ongoing')`, [id]
    );
    if (activeBookings.length > 0) {
      const { force } = req.query;
      if (force !== 'true') {
        return res.status(409).json({
          success: false,
          message: 'Ruangan ini memiliki booking aktif. Menonaktifkan ruangan akan membatalkan seluruh booking berjalan.',
          activeBookingsCount: activeBookings.length,
          code: 'HAS_ACTIVE_BOOKINGS'
        });
      }
      // Force: cancel all active bookings
      await dbRun(
        `UPDATE bookings SET status='cancelled', cancel_reason=? WHERE room_id=? AND status IN ('pending','confirmed','ongoing')`,
        ['Ruangan dinonaktifkan oleh administrator', id]
      );
    }

    await dbRun(`UPDATE rooms SET status='inactive' WHERE id=?`, [id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'DISABLE_ROOM', resource: room.name, ip: req.ip,
      before: { status: 'active' }, after: { status: 'inactive' }
    });

    res.json({ success: true, message: 'Ruangan berhasil dinonaktifkan' });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id/availability?week=YYYY-MM-DD
const getAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { week } = req.query; // Monday of the week

    const room = await dbGet('SELECT id, name, restrict_hours, hours_start, hours_end FROM rooms WHERE id=? AND status="active"', [id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    // Get weekdays (Mon-Fri)
    const monday = week ? new Date(week) : (() => {
      const d = new Date(); const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d;
    })();

    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    // Get bookings for this week
    const bookings = await dbAll(
      `SELECT b.*, u.name as user_name FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.room_id=? AND b.date IN (${days.map(() => '?').join(',')})
       AND b.status IN ('pending','confirmed','ongoing')`,
      [id, ...days]
    );

    // Check blackout dates
    const blackouts = await dbAll(
      `SELECT date FROM blackout_dates WHERE date IN (${days.map(() => '?').join(',')})`,
      days
    );
    const blackoutSet = new Set(blackouts.map(b => b.date));

    const availability = days.map(date => ({
      date,
      isBlackout: blackoutSet.has(date),
      bookings: bookings
        .filter(b => b.date === date)
        .map(b => ({
          id: b.id,
          startTime: b.start_time,
          endTime: b.end_time,
          agenda: b.agenda,
          status: b.status,
          userName: b.user_name,
          isOwn: req.user ? b.user_id === req.user.id : false,
        }))
    }));

    res.json({ success: true, data: { room, availability, operationalHours: { restrict: room.restrict_hours, start: room.hours_start, end: room.hours_end } } });
  } catch (err) { next(err); }
};

// POST /api/rooms/:id/upload
const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) { next(err); }
};

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom, getAvailability, uploadPhoto };
