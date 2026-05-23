const { getClient, dbGet, dbAll } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Endpoint 1: Fetch Spatial Floor Plan
 * GET /api/v1/workspaces/:room_id/layout
 */
const getWorkspaceLayout = async (req, res, next) => {
  const { room_id } = req.params;

  try {
    // 1. Verify if room exists and is of type WORKSPACE
    const room = await dbGet(
      `SELECT r.id, r.name, r.jenis_manajemen_ruang, r.image_url
       FROM rooms r WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [room_id]
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Ruangan tidak ditemukan'
      });
    }

    if (room.jenis_manajemen_ruang !== 'WORKSPACE') {
      return res.status(400).json({
        success: false,
        message: 'Ruangan ini bukan jenis WORKSPACE'
      });
    }

    // Fetch all photos for the room
    const photos = await dbAll(
      `SELECT url FROM room_photos WHERE room_id = $1 AND deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC`,
      [room_id]
    );
    
    // Fallback to room.image_url if no photos found in room_photos
    const room_photos = photos.length > 0 
      ? photos.map(p => p.url) 
      : (room.image_url ? [room.image_url] : []);

    // Fetch facilities
    const facilities = await dbAll(
      `SELECT facility_type, quantity FROM room_facilities WHERE room_id = $1 AND deleted_at IS NULL`,
      [room_id]
    );

    // 2. Fetch desk layouts with optimized query under <200ms
    const desks = await dbAll(
      `SELECT 
        wd.desk_id,
        wd.status,
        CASE WHEN wd.status = 'OCCUPIED' THEN u.name ELSE NULL END AS name,
        CASE WHEN wd.status = 'OCCUPIED' THEN u.avatar_url ELSE NULL END AS avatar_url
      FROM workspace_desks wd
      LEFT JOIN users u ON wd.assigned_user_id = u.id
      WHERE wd.room_id = $1
      ORDER BY wd.desk_id ASC`,
      [room_id]
    );

    return res.status(200).json({
      success: true,
      room_name: room.name,
      room_photos,
      facilities,
      desks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Endpoint 2: Submit Seating Request
 * POST /api/v1/workspaces/assignments/request
 */
const submitSeatingRequest = async (req, res, next) => {
  const { room_id, desk_id } = req.body;
  const userId = req.user.id;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Check if desk exists and is VACANT
    const desk = await client.query(
      'SELECT status FROM workspace_desks WHERE room_id = $1 AND desk_id = $2',
      [room_id, desk_id]
    );

    if (desk.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Meja tidak ditemukan di ruangan tersebut'
      });
    }

    if (desk.rows[0].status !== 'VACANT') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Meja tidak tersedia (status bukan VACANT)'
      });
    }

    // 2. Create seating request record
    const requestId = uuidv4();
    await client.query(
      `INSERT INTO seating_requests (id, room_id, desk_id, user_id, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [requestId, room_id, desk_id, userId]
    );

    // 3. Fetch admins assigned to this room
    const admins = await client.query(
      'SELECT user_id FROM room_assignments WHERE room_id = $1',
      [room_id]
    );

    // 4. Create notifications for each admin
    const notificationPromises = admins.rows.map(admin => {
      const notifId = uuidv4();
      const title = 'Permintaan Penugasan Meja Baru';
      const message = `${req.user.name} mengajukan permintaan penugasan meja ${desk_id} di ruangan ${room_id}.`;
      const payload = JSON.stringify({
        request_id: requestId,
        room_id,
        desk_id,
        user_id: userId,
        user_name: req.user.name
      });

      return client.query(
        `INSERT INTO notifications (id, user_id, title, message, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [notifId, admin.user_id, title, message, payload]
      );
    });

    await Promise.all(notificationPromises);

    await client.query('COMMIT');

    // Emit asynchronous notification event mock
    setImmediate(() => {
      console.log(`[NOTIFICATION EVENT] Routed seating request notification to ${admins.rowCount} admins for room ${room_id}`);
    });

    return res.status(201).json({
      success: true,
      message: 'Permintaan penugasan meja berhasil diajukan',
      data: {
        request_id: requestId,
        room_id,
        desk_id,
        user_id: userId,
        status: 'PENDING'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Endpoint 3: Administrative Override Relocation
 * POST /api/v1/workspaces/assignments/relocate
 */
const relocateWorkspaceDesk = async (req, res, next) => {
  const { current_desk_id, target_desk_id, rationale } = req.body;
  const adminId = req.user.id;
  const adminName = req.user.name;
  const rawRole = req.user.rawRole || req.user.role;

  // Verify only ADMIN_KERJA or SUPERADMIN
  if (rawRole !== 'ADMIN_KERJA' && rawRole !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: izin tidak mencukupi untuk melakukan override relocation'
    });
  }

  // Find the occupied source desk
  const occupiedDesks = await dbAll(
    'SELECT room_id, assigned_user_id FROM workspace_desks WHERE desk_id = $1 AND status = $2',
    [current_desk_id, 'OCCUPIED']
  );

  if (occupiedDesks.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Meja asal tidak ditemukan atau sedang tidak ditempati (status tidak OCCUPIED)'
    });
  }

  // Match the correct room by admin assignment or superadmin access
  let targetDeskRecord = null;
  let room_id = null;
  let affectedUserId = null;

  if (rawRole === 'SUPERADMIN') {
    // Superadmin has full access to any occupied desk matching current_desk_id
    // If there are duplicates, we default to the first one, but normally desk_ids are unique enough
    const deskRecord = occupiedDesks[0];
    room_id = deskRecord.room_id;
    affectedUserId = deskRecord.assigned_user_id;
  } else {
    // ADMIN_KERJA must own the room_id via room_assignments
    for (const record of occupiedDesks) {
      const assignment = await dbGet(
        'SELECT 1 FROM room_assignments WHERE user_id = $1 AND room_id = $2',
        [adminId, record.room_id]
      );
      if (assignment) {
        room_id = record.room_id;
        affectedUserId = record.assigned_user_id;
        break;
      }
    }

    if (!room_id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Anda bukan admin penanggung jawab untuk ruangan meja kerja asal ini'
      });
    }
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Validate if target_desk_id in the same room is VACANT
    const targetDesk = await client.query(
      'SELECT status FROM workspace_desks WHERE room_id = $1 AND desk_id = $2',
      [room_id, target_desk_id]
    );

    if (targetDesk.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: `Meja tujuan ${target_desk_id} tidak ditemukan di ruangan yang sama (${room_id})`
      });
    }

    if (targetDesk.rows[0].status !== 'VACANT') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Meja tujuan ${target_desk_id} tidak tersedia (status saat ini: ${targetDesk.rows[0].status})`
      });
    }

    // 2. Free up current_desk_id to VACANT
    await client.query(
      `UPDATE workspace_desks
       SET status = 'VACANT', assigned_user_id = NULL
       WHERE room_id = $1 AND desk_id = $2`,
      [room_id, current_desk_id]
    );

    // 3. Set target_desk_id to OCCUPIED and assign employee
    await client.query(
      `UPDATE workspace_desks
       SET status = 'OCCUPIED', assigned_user_id = $1
       WHERE room_id = $2 AND desk_id = $3`,
      [affectedUserId, room_id, target_desk_id]
    );

    // 4. Log relocation to audit logs
    const auditId = uuidv4();
    const action = 'OVERRIDE_RELOCATION';
    const resource = `Desk Relocation: ${current_desk_id} -> ${target_desk_id}`;
    const payloadBefore = JSON.stringify({
      room_id,
      desk_id: current_desk_id,
      assigned_user_id: affectedUserId
    });
    const payloadAfter = JSON.stringify({
      room_id,
      desk_id: target_desk_id,
      assigned_user_id: affectedUserId,
      rationale
    });

    await client.query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, payload_before, payload_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [auditId, adminId, adminName, action, resource, payloadBefore, payloadAfter]
    );

    // 5. Create notification for the affected employee
    const notifId = uuidv4();
    const title = 'Pemindahan Meja Kerja Administratif';
    const message = `Meja kerja Anda telah dipindahkan secara administratif dari meja ${current_desk_id} ke ${target_desk_id}. Alasan: ${rationale}`;
    const payloadNotif = JSON.stringify({
      current_desk_id,
      target_desk_id,
      rationale,
      admin_name: adminName
    });

    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [notifId, affectedUserId, title, message, payloadNotif]
    );

    await client.query('COMMIT');

    // Emit asynchronous notification event mock
    setImmediate(() => {
      console.log(`[ASYNC NOTIFICATION EVENT] Emitted relocation notification to employee ${affectedUserId}`);
    });

    return res.status(200).json({
      success: true,
      message: 'Pemindahan meja kerja administratif berhasil dilakukan',
      data: {
        room_id,
        user_id: affectedUserId,
        previous_desk_id: current_desk_id,
        new_desk_id: target_desk_id,
        rationale
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Endpoint 4: List Seating Requests for Admin / Superadmin
 * GET /api/v1/workspaces/assignments/requests
 */
const listSeatingRequests = async (req, res, next) => {
  const adminId = req.user.id;
  const rawRole = req.user.rawRole || req.user.role;

  try {
    let requests;
    if (rawRole === 'SUPERADMIN') {
      requests = await dbAll(
        `SELECT 
          sr.id, sr.room_id, sr.desk_id, sr.user_id, sr.status, sr.created_at,
          u.name AS user_name, u.email AS user_email,
          r.name AS room_name,
          f.name AS floor_name,
          b.name AS building_name
        FROM seating_requests sr
        JOIN users u ON sr.user_id = u.id
        JOIN rooms r ON sr.room_id = r.id
        LEFT JOIN buildings b ON r.building_id = b.id
        LEFT JOIN floors f ON r.floor_id = f.id
        ORDER BY sr.created_at DESC`
      );
    } else if (rawRole === 'ADMIN_KERJA') {
      requests = await dbAll(
        `SELECT 
          sr.id, sr.room_id, sr.desk_id, sr.user_id, sr.status, sr.created_at,
          u.name AS user_name, u.email AS user_email,
          r.name AS room_name,
          f.name AS floor_name,
          b.name AS building_name
        FROM seating_requests sr
        JOIN users u ON sr.user_id = u.id
        JOIN rooms r ON sr.room_id = r.id
        JOIN room_assignments ra ON r.id = ra.room_id
        LEFT JOIN buildings b ON r.building_id = b.id
        LEFT JOIN floors f ON r.floor_id = f.id
        WHERE ra.user_id = $1
        ORDER BY sr.created_at DESC`,
        [adminId]
      );
    } else {
      return res.status(403).json({ success: false, message: 'Akses ditolak: wewenang tidak mencukupi' });
    }

    return res.status(200).json({
      success: true,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Endpoint 5: Approve Seating Request
 * POST /api/v1/workspaces/assignments/requests/:id/approve
 */
const approveSeatingRequest = async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user.id;
  const adminName = req.user.name;
  const rawRole = req.user.rawRole || req.user.role;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Get the request
    const requestRes = await client.query(
      `SELECT sr.room_id, sr.desk_id, sr.user_id, sr.status, r.name AS room_name
       FROM seating_requests sr
       JOIN rooms r ON sr.room_id = r.id
       WHERE sr.id = $1`,
      [id]
    );

    if (requestRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Permintaan penugasan meja tidak ditemukan' });
    }

    const request = requestRes.rows[0];

    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Permintaan ini sudah diproses (status: ${request.status})` });
    }

    // 2. Authorization check
    if (rawRole !== 'SUPERADMIN') {
      const assignment = await client.query(
        'SELECT 1 FROM room_assignments WHERE user_id = $1 AND room_id = $2',
        [adminId, request.room_id]
      );
      if (assignment.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan admin penanggung jawab untuk ruangan ini' });
      }
    }

    // 3. Check if desk is still VACANT
    const deskRes = await client.query(
      'SELECT status FROM workspace_desks WHERE room_id = $1 AND desk_id = $2',
      [request.room_id, request.desk_id]
    );

    if (deskRes.rowCount === 0 || deskRes.rows[0].status !== 'VACANT') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Meja yang diajukan sudah terisi atau tidak aktif' });
    }

    // 4. Free user's previous seat in ANY room
    await client.query(
      `UPDATE workspace_desks
       SET status = 'VACANT', assigned_user_id = NULL
       WHERE assigned_user_id = $1`,
      [request.user_id]
    );

    // 5. Assign the new desk to user
    await client.query(
      `UPDATE workspace_desks
       SET status = 'OCCUPIED', assigned_user_id = $1
       WHERE room_id = $2 AND desk_id = $3`,
      [request.user_id, request.room_id, request.desk_id]
    );

    // 6. Update request status to APPROVED
    await client.query(
      `UPDATE seating_requests
       SET status = 'APPROVED'
       WHERE id = $1`,
      [id]
    );

    // 7. Auto-cancel other PENDING requests of this user
    await client.query(
      `UPDATE seating_requests
       SET status = 'CANCELLED'
       WHERE user_id = $1 AND status = 'PENDING' AND id <> $2`,
      [request.user_id, id]
    );

    // 8. Log to audit logs
    const auditId = uuidv4();
    await client.query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, payload_before, payload_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditId,
        adminId,
        adminName,
        'APPROVE_SEATING',
        `Seating request #${id}: Desk ${request.desk_id} in ${request.room_name}`,
        JSON.stringify({ status: 'PENDING' }),
        JSON.stringify({ status: 'APPROVED', user_id: request.user_id })
      ]
    );

    // 9. Send notification
    const notifId = uuidv4();
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        notifId,
        request.user_id,
        'Pengajuan Meja Kerja Disetujui',
        `Pengajuan meja kerja ${request.desk_id} di ruangan ${request.room_name} telah DISETUJUI oleh Admin.`,
        JSON.stringify({ request_id: id, room_id: request.room_id, desk_id: request.desk_id })
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Permintaan penugasan meja berhasil disetujui',
      data: {
        id,
        room_id: request.room_id,
        desk_id: request.desk_id,
        user_id: request.user_id,
        status: 'APPROVED'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Endpoint 6: Reject Seating Request
 * POST /api/v1/workspaces/assignments/requests/:id/reject
 */
const rejectSeatingRequest = async (req, res, next) => {
  const { id } = req.params;
  const { rationale } = req.body;
  const adminId = req.user.id;
  const adminName = req.user.name;
  const rawRole = req.user.rawRole || req.user.role;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Get the request
    const requestRes = await client.query(
      `SELECT sr.room_id, sr.desk_id, sr.user_id, sr.status, r.name AS room_name
       FROM seating_requests sr
       JOIN rooms r ON sr.room_id = r.id
       WHERE sr.id = $1`,
      [id]
    );

    if (requestRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Permintaan penugasan meja tidak ditemukan' });
    }

    const request = requestRes.rows[0];

    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Permintaan ini sudah diproses (status: ${request.status})` });
    }

    // 2. Authorization check
    if (rawRole !== 'SUPERADMIN') {
      const assignment = await client.query(
        'SELECT 1 FROM room_assignments WHERE user_id = $1 AND room_id = $2',
        [adminId, request.room_id]
      );
      if (assignment.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan admin penanggung jawab untuk ruangan ini' });
      }
    }

    // 3. Update status to REJECTED
    await client.query(
      `UPDATE seating_requests
       SET status = 'REJECTED'
       WHERE id = $1`,
      [id]
    );

    // 4. Log to audit trail
    const auditId = uuidv4();
    await client.query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, payload_before, payload_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditId,
        adminId,
        adminName,
        'REJECT_SEATING',
        `Seating request #${id}: Desk ${request.desk_id} in ${request.room_name}`,
        JSON.stringify({ status: 'PENDING' }),
        JSON.stringify({ status: 'REJECTED', rationale })
      ]
    );

    // 5. Send notification
    const notifId = uuidv4();
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        notifId,
        request.user_id,
        'Pengajuan Meja Kerja Ditolak',
        `Pengajuan meja kerja ${request.desk_id} di ruangan ${request.room_name} ditolak. Alasan: ${rationale || '-'}`,
        JSON.stringify({ request_id: id, room_id: request.room_id, desk_id: request.desk_id, rationale })
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Permintaan penugasan meja ditolak',
      data: {
        id,
        room_id: request.room_id,
        desk_id: request.desk_id,
        user_id: request.user_id,
        status: 'REJECTED'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Endpoint 7: Get My Desk Assignment and Pending Requests
 * GET /api/v1/workspaces/assignments/my-desk
 */
const getMyDeskAssignment = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // 1. Get user's current occupied desk (with complete location metadata and photo)
    const currentDesk = await dbGet(
      `SELECT 
        wd.desk_id,
        wd.status,
        wd.room_id,
        r.name AS room_name,
        f.name AS floor_name,
        b.name AS building_name,
        r.image_url AS room_photo
      FROM workspace_desks wd
      JOIN rooms r ON wd.room_id = r.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE wd.assigned_user_id = $1 AND wd.status = 'OCCUPIED'
      LIMIT 1`,
      [userId]
    );

    // 2. Get user's pending seating request (if any)
    const pendingRequest = await dbGet(
      `SELECT 
        sr.id AS request_id,
        sr.room_id,
        sr.desk_id,
        sr.status,
        sr.created_at,
        r.name AS room_name,
        f.name AS floor_name,
        b.name AS building_name,
        r.image_url AS room_photo
      FROM seating_requests sr
      JOIN rooms r ON sr.room_id = r.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE sr.user_id = $1 AND sr.status = 'PENDING'
      ORDER BY sr.created_at DESC
      LIMIT 1`,
      [userId]
    );

    // 3. Get user's most recent resolved seating request (if any)
    const resolvedRequest = await dbGet(
      `SELECT 
        sr.id AS request_id,
        sr.room_id,
        sr.desk_id,
        sr.status,
        sr.created_at,
        r.name AS room_name,
        f.name AS floor_name,
        b.name AS building_name,
        r.image_url AS room_photo,
        (SELECT (payload_after::jsonb)->>'rationale' 
         FROM audit_logs 
         WHERE action = 'REJECT_SEATING' 
           AND resource LIKE '%' || sr.id || '%' 
         ORDER BY created_at DESC LIMIT 1) AS rationale
      FROM seating_requests sr
      JOIN rooms r ON sr.room_id = r.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE sr.user_id = $1 AND sr.status IN ('REJECTED', 'APPROVED')
      ORDER BY sr.created_at DESC
      LIMIT 1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        assigned_desk: currentDesk || null,
        pending_request: pendingRequest || null,
        resolved_request: resolvedRequest || null
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWorkspaceLayout,
  submitSeatingRequest,
  relocateWorkspaceDesk,
  listSeatingRequests,
  approveSeatingRequest,
  rejectSeatingRequest,
  getMyDeskAssignment
};


