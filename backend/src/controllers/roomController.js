const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');
const path = require('path');

// Helper to get full room with layouts and facilities
const getRoomFull = async (roomId) => {
  const room = await dbGet(`
    SELECT r.*, b.name as building_name, f.name as floor_name,
      (SELECT STRING_AGG(u2.name, ', ') FROM room_assignments ra JOIN users u2 ON ra.user_id = u2.id WHERE ra.room_id = r.id AND u2.deleted_at IS NULL) as admin_name
    FROM rooms r
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN floors f ON r.floor_id = f.id
    WHERE r.id = $1 AND r.deleted_at IS NULL
  `, [roomId]);
  if (!room) return null;
  room.layouts = await dbAll('SELECT * FROM room_layouts WHERE room_id = $1 AND deleted_at IS NULL', [roomId]);

  const facs = await dbAll('SELECT * FROM room_facilities WHERE room_id = $1 AND deleted_at IS NULL', [roomId]);
  room.facilities = facs.reduce((acc, curr) => {
    acc[curr.facility_type] = curr.quantity;
    return acc;
  }, {});

  room.photos = await dbAll('SELECT * FROM room_photos WHERE room_id = $1 AND deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC', [roomId]);

  return room;
};

// GET /api/rooms
const listRooms = async (req, res, next) => {
  try {
    const { building_id, floor_id, status, search, approval_type, admin_id } = req.query;
    let sql = `
      SELECT r.*, b.name as building_name, f.name as floor_name,
        (SELECT STRING_AGG(u2.name, ', ') FROM room_assignments ra JOIN users u2 ON ra.user_id = u2.id WHERE ra.room_id = r.id AND u2.deleted_at IS NULL) as admin_name
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN floors f ON r.floor_id = f.id
      WHERE r.deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;

    // Non-superadmin can only see active rooms by default
    if (req.user && req.user.role === 'user') {
      sql += ` AND r.status = 'active'`;
    } else if (status) {
      sql += ` AND r.status = $${paramIdx++}`; params.push(status);
    }
    if (building_id) { sql += ` AND r.building_id = $${paramIdx++}`; params.push(building_id); }
    if (floor_id) { sql += ` AND r.floor_id = $${paramIdx++}`; params.push(floor_id); }
    if (approval_type) { sql += ` AND r.approval_type = $${paramIdx++}`; params.push(approval_type); }
    if (search) { sql += ` AND r.name ILIKE $${paramIdx++}`; params.push(`%${search}%`); }

    // Scope for admin (only their assigned rooms)
    if (req.user && req.user.role === 'admin') {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params.push(req.user.id);
    } else if (req.user && req.user.role === 'superadmin' && admin_id) {
      sql += ` AND r.id IN (SELECT room_id FROM room_assignments WHERE user_id = $${paramIdx++})`;
      params.push(admin_id);
    }

    sql += ' ORDER BY b.name, f.level, r.name';
    const rooms = await dbAll(sql, params);

    // Enrich with layouts
    for (const room of rooms) {
      room.layouts = await dbAll('SELECT * FROM room_layouts WHERE room_id = $1 AND deleted_at IS NULL', [room.id]);
      room.facilities = await dbAll('SELECT * FROM room_facilities WHERE room_id = $1 AND deleted_at IS NULL', [room.id]);
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
      restrict_hours = false, hours_start, hours_end, layouts = [], facilities = [], room_type = 'physical',
      jenis_manajemen_ruang = 'MEETING_ROOM', total_meja_kerja = null } = req.body;

    // Normalize facilities early: accept either object map or array
    let facilitiesInput = [];
    try {
      if (Array.isArray(facilities)) {
        facilitiesInput = facilities;
      } else if (facilities && typeof facilities === 'object') {
        facilitiesInput = Object.entries(facilities).map(([k, v]) => ({ type: k, quantity: Number(v) }));
      }
    } catch (e) {
      facilitiesInput = [];
    }

    if (room_type === 'physical' || room_type === 'hybrid') {
      if (!name || !building_id || !floor_id) {
        return res.status(400).json({ success: false, message: 'Nama ruangan, gedung, dan lantai wajib diisi' });
      }
      if (jenis_manajemen_ruang !== 'WORKSPACE' && layouts.length === 0) {
        return res.status(400).json({ success: false, message: 'Minimal 1 layout harus dipilih' });
      }
    } else {
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nama ruangan digital wajib diisi' });
      }
    }

    // Duplicate check
    let dup = null;
    if (room_type === 'physical' || room_type === 'hybrid') {
      dup = await dbGet('SELECT id FROM rooms WHERE name=$1 AND building_id=$2 AND floor_id=$3 AND deleted_at IS NULL', [name, building_id, floor_id]);
    } else {
      dup = await dbGet('SELECT id FROM rooms WHERE name=$1 AND room_type=$2 AND deleted_at IS NULL', [name, 'digital']);
    }
    if (dup) return res.status(409).json({ success: false, message: 'Nama ruangan sudah ada' });

    const roomId = uuidv4();
    const effectiveAdminId = req.user.role === 'superadmin' ? (admin_id || null) : req.user.id;
    const finalTotalMeja = jenis_manajemen_ruang === 'WORKSPACE' ? (parseInt(total_meja_kerja) || 1) : null;

    await dbRun(
      `INSERT INTO rooms (id, name, building_id, floor_id, admin_id, description, status, approval_type, restrict_hours, hours_start, hours_end, image_url, room_type, jenis_manajemen_ruang, total_meja_kerja)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [roomId, name, room_type === 'digital' ? null : building_id, room_type === 'digital' ? null : floor_id, effectiveAdminId, description || null, status, approval_type,
       restrict_hours ? true : false, restrict_hours ? hours_start : null, restrict_hours ? hours_end : null,
       req.body.image_url || null, room_type, jenis_manajemen_ruang, finalTotalMeja]
    );

    // Insert layouts
    const finalLayouts = jenis_manajemen_ruang === 'WORKSPACE'
      ? [{ type: 'Workspace Seating', capacity: finalTotalMeja }]
      : (room_type === 'digital' && layouts.length === 0 
         ? [{ type: 'Virtual (Zoom)', capacity: 100 }]
         : layouts);

    for (const layout of finalLayouts) {
      await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1,$2,$3,$4)`,
        [uuidv4(), roomId, layout.type || layout.layout_type, layout.capacity]);
    }

    // Insert facilities (accept either array of objects or object map)
    let finalFacilities = [];
    if (Array.isArray(facilities)) {
      finalFacilities = facilities;
    } else if (facilities && typeof facilities === 'object') {
      finalFacilities = Object.entries(facilities).map(([k, v]) => ({ type: k, quantity: Number(v) }));
    }
    for (const fac of finalFacilities) {
      await dbRun(`INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES ($1,$2,$3,$4)`,
        [uuidv4(), roomId, fac.type || fac.facility_type, fac.quantity || fac.qty || 0]);
    }

    // Auto-assign to admin if superadmin set admin_id
    if (effectiveAdminId) {
      await dbRun(`INSERT INTO room_assignments (user_id, room_id) VALUES ($1,$2) ON CONFLICT (user_id, room_id) DO NOTHING`,
        [effectiveAdminId, roomId]);
    }

    // If WORKSPACE, automatically generate desks nodes
    if (jenis_manajemen_ruang === 'WORKSPACE' && finalTotalMeja > 0) {
      for (let i = 1; i <= finalTotalMeja; i++) {
        const deskId = `Desk-${String(i).padStart(2, '0')}`;
        await dbRun(`INSERT INTO workspace_desks (room_id, desk_id, status) VALUES ($1, $2, 'VACANT')`, [roomId, deskId]);
      }
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
    const room = await dbGet('SELECT * FROM rooms WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT 1 FROM room_assignments WHERE user_id=$1 AND room_id=$2', [req.user.id, id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke ruangan ini' });
    }

    const { name, building_id, floor_id, admin_id, description, status, approval_type,
      restrict_hours, hours_start, hours_end, layouts, facilities, image_url, room_type,
      jenis_manajemen_ruang, total_meja_kerja } = req.body;

    const before = { ...room };
    const isDigital = (room_type || room.room_type) === 'digital';

    if (name && name !== room.name) {
      let dup = null;
      if (isDigital) {
        dup = await dbGet('SELECT id FROM rooms WHERE name=$1 AND room_type=$2 AND id!=$3 AND deleted_at IS NULL', [name, 'digital', id]);
      } else {
        const bId = building_id || room.building_id;
        const fId = floor_id || room.floor_id;
        dup = await dbGet('SELECT id FROM rooms WHERE name=$1 AND building_id=$2 AND floor_id=$3 AND id!=$4 AND deleted_at IS NULL', [name, bId, fId, id]);
      }
      if (dup) return res.status(409).json({ success: false, message: 'Nama ruangan sudah digunakan' });
    }

    const activeJenis = jenis_manajemen_ruang || room.jenis_manajemen_ruang;
    const finalTotalMeja = activeJenis === 'WORKSPACE' ? (parseInt(total_meja_kerja) || room.total_meja_kerja || 1) : null;

    await dbRun(`UPDATE rooms SET
      name = COALESCE($1, name),
      building_id = $2,
      floor_id = $3,
      admin_id = COALESCE($4, admin_id),
      description = COALESCE($5, description),
      status = COALESCE($6, status),
      approval_type = COALESCE($7, approval_type),
      restrict_hours = COALESCE($8, restrict_hours),
      hours_start = $9,
      hours_end = $10,
      image_url = COALESCE($11, image_url),
      room_type = COALESCE($12, room_type),
      jenis_manajemen_ruang = $13,
      total_meja_kerja = $14
      WHERE id = $15`,
      [name||null, isDigital ? null : (building_id || room.building_id), isDigital ? null : (floor_id || room.floor_id),
       req.user.role==='superadmin' ? (admin_id||null) : null,
       description!==undefined ? description : null,
       status||null, approval_type||null,
       restrict_hours!==undefined ? (restrict_hours?true:false) : null,
       restrict_hours ? (hours_start||null) : null,
       restrict_hours ? (hours_end||null) : null,
       image_url||null, room_type||null, activeJenis, finalTotalMeja, id]
    );

    if (req.user.role === 'superadmin' && admin_id) {
      await dbRun(`INSERT INTO room_assignments (user_id, room_id) VALUES ($1,$2) ON CONFLICT (user_id, room_id) DO NOTHING`,
        [admin_id, id]);
    }

    // Update layouts if provided (or if it's WORKSPACE, auto-set layout)
    if (activeJenis === 'WORKSPACE') {
      await dbRun('UPDATE room_layouts SET deleted_at=NOW() WHERE room_id=$1 AND deleted_at IS NULL', [id]);
      await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1,$2,$3,$4)`,
        [uuidv4(), id, 'Workspace Seating', finalTotalMeja]);
    } else if (layouts && layouts.length > 0) {
      await dbRun('UPDATE room_layouts SET deleted_at=NOW() WHERE room_id=$1 AND deleted_at IS NULL', [id]);
      for (const l of layouts) {
        await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1,$2,$3,$4)`,
          [uuidv4(), id, l.type || l.layout_type, l.capacity]);
      }
    }

    // Update facilities if provided (accept array or object)
    let updatedFacilities = [];
    if (facilities) {
      if (Array.isArray(facilities)) updatedFacilities = facilities;
      else if (typeof facilities === 'object') updatedFacilities = Object.entries(facilities).map(([k, v]) => ({ type: k, quantity: Number(v) }));
    }
    if (updatedFacilities.length > 0) {
      await dbRun('UPDATE room_facilities SET deleted_at=NOW() WHERE room_id=$1 AND deleted_at IS NULL', [id]);
      for (const f of updatedFacilities) {
        await dbRun(`INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES ($1,$2,$3,$4)`,
          [uuidv4(), id, f.type || f.facility_type, f.quantity || f.qty || 0]);
      }
    }

    // If WORKSPACE, check existing desks and generate/delete if changed
    if (activeJenis === 'WORKSPACE' && finalTotalMeja > 0) {
      const existingDesks = await dbAll('SELECT desk_id, status FROM workspace_desks WHERE room_id = $1 ORDER BY desk_id', [id]);
      const currentCount = existingDesks.length;
      if (finalTotalMeja > currentCount) {
        // Add more desks
        for (let i = currentCount + 1; i <= finalTotalMeja; i++) {
          const deskId = `Desk-${String(i).padStart(2, '0')}`;
          await dbRun(`INSERT INTO workspace_desks (room_id, desk_id, status) VALUES ($1, $2, 'VACANT') ON CONFLICT DO NOTHING`, [id, deskId]);
        }
      } else if (finalTotalMeja < currentCount) {
        // Safe delete desks from the end ONLY if they are not occupied
        for (let i = currentCount; i > finalTotalMeja; i--) {
          const deskId = `Desk-${String(i).padStart(2, '0')}`;
          const targetDesk = existingDesks.find(d => d.desk_id === deskId);
          if (targetDesk && targetDesk.status !== 'OCCUPIED') {
            await dbRun(`DELETE FROM workspace_desks WHERE room_id = $1 AND desk_id = $2`, [id, deskId]);
          }
        }
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
    const room = await dbGet('SELECT * FROM rooms WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    if (req.user.role === 'admin') {
      const assigned = await dbGet('SELECT 1 FROM room_assignments WHERE user_id=$1 AND room_id=$2', [req.user.id, id]);
      if (!assigned) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Check active bookings
    const activeBookings = await dbAll(
      `SELECT id FROM bookings WHERE room_id=$1 AND status IN ('pending','confirmed','ongoing') AND deleted_at IS NULL`, [id]
    );
    if (activeBookings.length > 0) {
      const { force } = req.query;
      if (force !== 'true') {
        return res.status(409).json({
          success: false,
          message: 'Ruangan ini memiliki booking aktif. Menghapus ruangan akan membatalkan seluruh booking berjalan.',
          activeBookingsCount: activeBookings.length,
          code: 'HAS_ACTIVE_BOOKINGS'
        });
      }
      // Force: cancel all active bookings
      await dbRun(
        `UPDATE bookings SET status='cancelled', cancel_reason=$1 WHERE room_id=$2 AND status IN ('pending','confirmed','ongoing') AND deleted_at IS NULL`,
        ['Ruangan dihapus oleh administrator', id]
      );
    }

    // Soft delete the room
    await dbRun(`UPDATE rooms SET deleted_at=NOW() WHERE id=$1`, [id]);
    await audit({
      actorId: req.user.id, actorName: `${req.user.name} (${req.user.role})`,
      action: 'DELETE_ROOM', resource: room.name, ip: req.ip,
      before: { status: room.status }, after: { deleted: true }
    });

    res.json({ success: true, message: 'Ruangan berhasil dihapus' });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id/availability?week=YYYY-MM-DD
const getAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { week } = req.query;

    const room = await dbGet('SELECT id, name, restrict_hours, hours_start, hours_end FROM rooms WHERE id=$1 AND status=$2 AND deleted_at IS NULL', [id, 'active']);
    if (!room) return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });

    const monday = week ? new Date(week) : (() => {
      const d = new Date(); const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d;
    })();

    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const placeholders = days.map((_, i) => `$${i + 2}`).join(',');
    const bookings = await dbAll(
      `SELECT b.*, u.name as user_name FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.room_id=$1 AND b.date IN (${placeholders})
       AND b.status IN ('pending','confirmed','ongoing') AND b.deleted_at IS NULL`,
      [id, ...days]
    );

    const blackoutPlaceholders = days.map((_, i) => `$${i + 1}`).join(',');
    const blackouts = await dbAll(
      `SELECT date FROM blackout_dates WHERE date IN (${blackoutPlaceholders}) AND deleted_at IS NULL`,
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
    const roomId = req.params.id;
    const fileUrl = `/uploads/${req.file.filename}`;

    const existing = await dbGet('SELECT COUNT(*) as count FROM room_photos WHERE room_id=$1 AND deleted_at IS NULL', [roomId]);
    const isPrimary = parseInt(existing.count) === 0;

    await dbRun('INSERT INTO room_photos (id, room_id, url, is_primary) VALUES ($1,$2,$3,$4)',
      [uuidv4(), roomId, fileUrl, isPrimary]);

    if (isPrimary) {
      await dbRun('UPDATE rooms SET image_url=$1 WHERE id=$2', [fileUrl, roomId]);
    }

    res.json({ success: true, url: fileUrl });
  } catch (err) { next(err); }
};

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom, getAvailability, uploadPhoto };
