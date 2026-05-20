const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');

// GET /api/users
const listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let sql = `SELECT id, name, email, role, status, created_at FROM users WHERE deleted_at IS NULL`;
    const params = [];
    let paramIdx = 1;
    if (role) { sql += ` AND role = $${paramIdx++}`; params.push(role); }
    if (status) { sql += ` AND status = $${paramIdx++}`; params.push(status); }
    if (search) { sql += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`; params.push(`%${search}%`); paramIdx++; }
    sql += ' ORDER BY created_at DESC';
    const users = await dbAll(sql, params);

    for (const user of users) {
      if (user.role === 'admin') {
        const assignments = await dbAll(`
          SELECT ra.room_id, r.name as room_name, b.name as building_name, f.name as floor_name
          FROM room_assignments ra
          LEFT JOIN rooms r ON ra.room_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN floors f ON r.floor_id = f.id
          WHERE ra.admin_id = $1 AND ra.deleted_at IS NULL
        `, [user.id]);
        user.assignedRooms = assignments;
      }
    }
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, status, created_at FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    if (user.role === 'admin') {
      user.assignedRooms = await dbAll(`
        SELECT ra.room_id, r.name, b.name as building, f.name as floor
        FROM room_assignments ra LEFT JOIN rooms r ON ra.room_id=r.id
        LEFT JOIN buildings b ON r.building_id=b.id LEFT JOIN floors f ON r.floor_id=f.id
        WHERE ra.admin_id=$1 AND ra.deleted_at IS NULL
      `, [user.id]);
    }
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/role
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'superadmin'].includes(role))
      return res.status(400).json({ success: false, message: 'Role tidak valid' });
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

    const isHyperAdmin = req.user.id === 'u-super' || req.user.email === 'superadmin@oikn.go.id';

    if (role === 'superadmin' && !isHyperAdmin) {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin Utama yang dapat menetapkan peran Super Admin' });
    }
    if (user.role === 'superadmin' && !isHyperAdmin) {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin Utama yang dapat mengubah peran Super Admin' });
    }

    await dbRun('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_USER_ROLE', resource: user.name, ip: req.ip, before: { role: user.role }, after: { role } });
    res.json({ success: true, message: 'Role pengguna diperbarui' });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status))
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    await dbRun('UPDATE users SET status=$1 WHERE id=$2', [status, req.params.id]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_USER_STATUS', resource: user.name, ip: req.ip, before: { status: user.status }, after: { status } });
    res.json({ success: true, message: 'Status pengguna diperbarui' });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/room-assignment
const updateRoomAssignment = async (req, res, next) => {
  try {
    const { roomIds } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user || user.role !== 'admin') return res.status(400).json({ success: false, message: 'Pengguna bukan Admin Ruangan' });

    // Soft delete all existing and re-insert
    await dbRun('UPDATE room_assignments SET deleted_at=NOW() WHERE admin_id=$1 AND deleted_at IS NULL', [req.params.id]);
    for (const roomId of (roomIds || [])) {
      await dbRun('INSERT INTO room_assignments (id, admin_id, room_id) VALUES ($1,$2,$3) ON CONFLICT (admin_id, room_id) DO UPDATE SET deleted_at=NULL',
        [uuidv4(), req.params.id, roomId]);
    }

    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_ROOM_ASSIGNMENT', resource: user.name, ip: req.ip, after: { roomIds } });
    res.json({ success: true, message: 'Pemetaan wilayah tugas berhasil diperbarui' });
  } catch (err) { next(err); }
};

module.exports = { listUsers, getUser, updateRole, updateStatus, updateRoomAssignment };
