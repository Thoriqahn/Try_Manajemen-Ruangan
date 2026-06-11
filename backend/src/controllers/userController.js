const { dbGet, dbAll, dbRun } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');
const { audit } = require('../utils/audit');
const { normalizeRole } = require('../utils/roles');

/**
 * Ambil daftar semua pengguna dengan filter opsional.
 * GET /api/users
 *
 * Query params: role, status, search
 * Untuk role 'admin', sertakan juga daftar ruangan yang ditetapkan (assignedRooms).
 * Untuk superadmin: lihat semua user. Untuk admin: hanya user mereka.
 */
const listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let sql = `
      SELECT id, name, email, role, status, created_at,
        (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id = users.id AND b.deleted_at IS NULL) as total_bookings,
        (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id = users.id AND b.status = 'CANCELLED_NOSHOW' AND b.deleted_at IS NULL) as total_noshows
      FROM users 
      WHERE deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;
    if (role) {
      if (role === 'admin') {
        sql += ` AND role IN ('ADMIN_RAPAT', 'ADMIN_KERJA', 'ADMIN')`;
      } else if (role === 'ADMIN_RAPAT' || role === 'ADMIN_KERJA') {
        sql += ` AND role = $${paramIdx++}`;
        params.push(role);
      } else {
        const dbRole = role === 'superadmin' || role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER';
        sql += ` AND role = $${paramIdx++}`;
        params.push(dbRole);
      }
    }
    if (status) { sql += ` AND status = $${paramIdx++}`; params.push(status); }
    if (search) { sql += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`; params.push(`%${search}%`); paramIdx++; }
    sql += ' ORDER BY created_at DESC';
    const users = await dbAll(sql, params);

    // Enrich data: normalisasi role + tambah assignedRooms untuk admin
    for (const user of users) {
      user.rawRole = user.role;
      user.role = normalizeRole(user.role);
      if (user.role === 'admin') {
        const assignments = await dbAll(`
          SELECT ra.room_id, r.name as room_name, b.name as building_name, f.name as floor_name
          FROM room_assignments ra
          LEFT JOIN rooms r ON ra.room_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN floors f ON r.floor_id = f.id
          WHERE ra.user_id = $1
        `, [user.id]);
        user.assignedRooms = assignments;
      }
    }
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

/**
 * Ambil detail satu pengguna berdasarkan ID.
 * GET /api/users/:id
 *
 * Untuk admin: sertakan juga assignedRooms.
 */
const getUser = async (req, res, next) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, status, created_at FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    user.rawRole = user.role;
    user.role = normalizeRole(user.role);
    if (user.role === 'admin') {
      user.assignedRooms = await dbAll(`
        SELECT ra.room_id, r.name, b.name as building, f.name as floor
        FROM room_assignments ra LEFT JOIN rooms r ON ra.room_id=r.id
        LEFT JOIN buildings b ON r.building_id=b.id LEFT JOIN floors f ON r.floor_id=f.id
        WHERE ra.user_id=$1
      `, [user.id]);
    }
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

/**
 * Ubah role pengguna.
 * PUT /api/users/:id/role
 *
 * Proteksi:
 * - Hanya 'Super Admin Utama' (hardcoded id/email) yang bisa menetapkan SUPERADMIN
 * - Tidak bisa mengubah SUPERADMIN kecuali oleh Super Admin Utama
 * - Jika role baru bukan admin, semua room_assignments user dihapus
 */
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['user', 'admin', 'superadmin', 'USER', 'ADMIN_RAPAT', 'ADMIN_KERJA', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ success: false, message: 'Role tidak valid' });
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

    // Super Admin Utama teridentifikasi berdasarkan ID atau email khusus
    const isHyperAdmin = req.user.id === 'u-super' || req.user.email === 'superadmin@oikn.go.id';
    const normalizedUserRole = normalizeRole(user.role);

    if ((role === 'superadmin' || role === 'SUPERADMIN') && !isHyperAdmin) {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin Utama yang dapat menetapkan peran Super Admin' });
    }
    if (normalizedUserRole === 'superadmin' && !isHyperAdmin) {
      return res.status(403).json({ success: false, message: 'Hanya Super Admin Utama yang dapat mengubah peran Super Admin' });
    }

    // Map role input ke format DB
    let dbRole = 'USER';
    if (role === 'superadmin' || role === 'SUPERADMIN') {
      dbRole = 'SUPERADMIN';
    } else if (role === 'admin' || role === 'ADMIN_RAPAT') {
      dbRole = 'ADMIN_RAPAT';
    } else if (role === 'ADMIN_KERJA') {
      dbRole = 'ADMIN_KERJA';
    } else if (role === 'ADMIN') {
      dbRole = 'ADMIN';
    }

    await dbRun('UPDATE users SET role=$1 WHERE id=$2', [dbRole, req.params.id]);

    // Hapus semua room_assignments jika bukan admin lagi
    if (dbRole !== 'ADMIN_RAPAT' && dbRole !== 'ADMIN_KERJA' && dbRole !== 'ADMIN') {
      await dbRun('DELETE FROM room_assignments WHERE user_id=$1', [req.params.id]);
    }

    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_USER_ROLE', resource: user.name, ip: req.ip, before: { role: user.role }, after: { role: dbRole } });
    res.json({ success: true, message: 'Role pengguna diperbarui' });
  } catch (err) { next(err); }
};

/**
 * Ubah status aktif/nonaktif pengguna.
 * PUT /api/users/:id/status
 *
 * Status yang valid: 'active' | 'inactive'
 * Pengguna inactive tidak bisa login meski punya token valid.
 */
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

/**
 * Perbarui daftar ruangan yang ditetapkan ke admin.
 * PUT /api/users/:id/room-assignment
 *
 * Strategi: hard-delete semua yang lama lalu insert ulang semua yang baru.
 * Hanya bisa dipanggil untuk pengguna yang sudah berperan admin.
 *
 * @param {string[]} req.body.roomIds - Array of room ID yang akan ditetapkan
 */
const updateRoomAssignment = async (req, res, next) => {
  try {
    const { roomIds } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!user || normalizeRole(user.role) !== 'admin') return res.status(400).json({ success: false, message: 'Pengguna bukan Admin Ruangan' });

    // Hapus semua assignment lama dan insert baru (replace strategy)
    await dbRun('DELETE FROM room_assignments WHERE user_id=$1', [req.params.id]);
    for (const roomId of (roomIds || [])) {
      await dbRun('INSERT INTO room_assignments (user_id, room_id) VALUES ($1,$2) ON CONFLICT (user_id, room_id) DO NOTHING',
        [req.params.id, roomId]);
    }

    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_ROOM_ASSIGNMENT', resource: user.name, ip: req.ip, after: { roomIds } });
    res.json({ success: true, message: 'Pemetaan wilayah tugas berhasil diperbarui' });
  } catch (err) { next(err); }
};

module.exports = { listUsers, getUser, updateRole, updateStatus, updateRoomAssignment };
