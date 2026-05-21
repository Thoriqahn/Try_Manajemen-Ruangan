const { dbRun, dbAll, dbGet } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function initSchema() {
  console.log('📦 Running database migrations...');

  // Enable uuid-ossp extension for gen_random_uuid()
  await dbRun(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // Migrate existing users role column values first to avoid check constraint errors on table alter
  try {
    // FIRST drop the old constraint if it exists, so we can change the roles to uppercase
    await dbRun(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);

    // THEN update the roles to uppercase
    await dbRun(`UPDATE users SET role = 'SUPERADMIN' WHERE role = 'superadmin'`);
    await dbRun(`UPDATE users SET role = 'ADMIN_RAPAT' WHERE role = 'admin'`);
    await dbRun(`UPDATE users SET role = 'USER' WHERE role = 'user'`);
    await dbRun(`UPDATE users SET role = 'USER' WHERE role = 'api'`);
  } catch (err) {
    console.log('Migration info (users role updates):', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('SUPERADMIN','ADMIN_RAPAT','ADMIN_KERJA','USER')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','inactive')),
    otp TEXT,
    otp_expires BIGINT,
    otp_type TEXT,
    refresh_token TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  // Apply new check constraint to users role
  try {
    await dbRun(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await dbRun(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPERADMIN','ADMIN_RAPAT','ADMIN_KERJA','USER'))`);
    await dbRun(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
  } catch (err) {
    console.log('Migration info (users constraint/avatar update):', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    lat TEXT,
    lng TEXT,
    image_url TEXT,
    total_floors INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS floors (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    building_id TEXT REFERENCES buildings(id),
    floor_id TEXT REFERENCES floors(id),
    admin_id TEXT REFERENCES users(id),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    approval_type TEXT NOT NULL DEFAULT 'instant' CHECK(approval_type IN ('instant','manual')),
    restrict_hours BOOLEAN NOT NULL DEFAULT FALSE,
    hours_start TEXT,
    hours_end TEXT,
    image_url TEXT,
    room_type TEXT NOT NULL DEFAULT 'physical' CHECK(room_type IN ('physical','digital','hybrid')),
    jenis_manajemen_ruang TEXT NOT NULL DEFAULT 'MEETING_ROOM' CHECK(jenis_manajemen_ruang IN ('MEETING_ROOM', 'WORKSPACE')),
    total_meja_kerja INTEGER,
    qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_workspace_desk_count CHECK (
      (jenis_manajemen_ruang <> 'WORKSPACE') OR
      (jenis_manajemen_ruang = 'WORKSPACE' AND total_meja_kerja IS NOT NULL AND total_meja_kerja > 0)
    )
  )`);

  // Migrate existing rooms table for classification, desk count, and QR code token
  try {
    await dbRun(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'physical'`);
    await dbRun(`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check`);
    await dbRun(`ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_check CHECK (room_type IN ('physical','digital','hybrid'))`);
    
    // Add jenis_manajemen_ruang
    await dbRun(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS jenis_manajemen_ruang TEXT NOT NULL DEFAULT 'MEETING_ROOM'`);
    await dbRun(`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_jenis_manajemen_ruang_check`);
    await dbRun(`ALTER TABLE rooms ADD CONSTRAINT rooms_jenis_manajemen_ruang_check CHECK (jenis_manajemen_ruang IN ('MEETING_ROOM', 'WORKSPACE'))`);
    
    // Add total_meja_kerja
    await dbRun(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS total_meja_kerja INTEGER`);
    await dbRun(`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS chk_workspace_desk_count`);
    await dbRun(`ALTER TABLE rooms ADD CONSTRAINT chk_workspace_desk_count CHECK (
      (jenis_manajemen_ruang <> 'WORKSPACE') OR
      (jenis_manajemen_ruang = 'WORKSPACE' AND total_meja_kerja IS NOT NULL AND total_meja_kerja > 0)
    )`);
    
    // Add qr_token with default
    await dbRun(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid()`);
    await dbRun(`UPDATE rooms SET qr_token = gen_random_uuid() WHERE qr_token IS NULL`);
    await dbRun(`ALTER TABLE rooms ALTER COLUMN qr_token SET NOT NULL`);
    await dbRun(`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_qr_token_key`);
    await dbRun(`ALTER TABLE rooms ADD CONSTRAINT rooms_qr_token_key UNIQUE (qr_token)`);
  } catch (err) {
    console.log('Migration info (rooms updates):', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS room_photos (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS room_layouts (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    layout_type TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS room_facilities (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    facility_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  // Recreate room_assignments junction table with composite primary key and indexes
  try {
    await dbRun(`DROP TABLE IF EXISTS room_assignments CASCADE`);
  } catch (err) {
    console.log('Junction table drop info:', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS room_assignments (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, room_id)
  )`);

  try {
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_room_assignments_user_id ON room_assignments (user_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_room_assignments_room_id ON room_assignments (room_id)`);
  } catch (err) {
    console.log('Junction table index info:', err.message);
  }

  // Create dependent workspace_desks table
  await dbRun(`CREATE TABLE IF NOT EXISTS workspace_desks (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    desk_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VACANT' CHECK(status IN ('VACANT', 'OCCUPIED', 'DISABLED')),
    assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, desk_id)
  )`);

  try {
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_workspace_desks_room_id ON workspace_desks (room_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_workspace_desks_assigned_user_id ON workspace_desks (assigned_user_id)`);
  } catch (err) {
    console.log('workspace_desks index info:', err.message);
  }

  // Create seating_requests table
  await dbRun(`CREATE TABLE IF NOT EXISTS seating_requests (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    desk_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (room_id, desk_id) REFERENCES workspace_desks(room_id, desk_id) ON DELETE CASCADE
  )`);

  try {
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_seating_requests_user_id ON seating_requests (user_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_seating_requests_room_desk ON seating_requests (room_id, desk_id)`);
  } catch (err) {
    console.log('seating_requests index info:', err.message);
  }

  // Create notifications table
  await dbRun(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  try {
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`);
  } catch (err) {
    console.log('notifications index info:', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    agenda TEXT NOT NULL,
    participants INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','ongoing','completed','cancelled','rejected','CANCELLED_NOSHOW')),
    rejection_reason TEXT,
    cancel_reason TEXT,
    surat_terkait TEXT,
    meeting_type TEXT NOT NULL DEFAULT 'offline' CHECK(meeting_type IN ('offline','online','hybrid')),
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_passcode TEXT,
    zoom_host_email TEXT,
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  // Migrate existing bookings table for is_checked_in column and status constraint
  try {
    await dbRun(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT FALSE`);
    await dbRun(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check`);
    await dbRun(`ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK(status IN ('pending','confirmed','ongoing','completed','cancelled','rejected','CANCELLED_NOSHOW'))`);
  } catch (err) {
    console.log('Migration info (bookings constraint and column update):', err.message);
  }

  // Create global_audit_trail table
  await dbRun(`CREATE TABLE IF NOT EXISTS global_audit_trail (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS global_policy (
    id INTEGER PRIMARY KEY DEFAULT 1,
    max_duration_hours INTEGER DEFAULT 4,
    max_days_ahead INTEGER DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS blackout_dates (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT NOT NULL UNIQUE,
    secret_hash TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'read' CHECK(access_level IN ('read','read-write')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
    last_used TIMESTAMPTZ,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS api_logs (
    id TEXT PRIMARY KEY,
    token_id TEXT REFERENCES api_tokens(id),
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    ip TEXT,
    payload_before TEXT,
    payload_after TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  // ─── Zoom Integration Tables ───────────────────────────────────────────
  await dbRun(`CREATE TABLE IF NOT EXISTS zoom_config (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    account_id TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS zoom_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    license_type TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS zoom_meeting_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    booking_id TEXT NOT NULL REFERENCES bookings(id),
    zoom_account_id TEXT REFERENCES zoom_accounts(id),
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_passcode TEXT,
    action TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE')),
    status TEXT NOT NULL CHECK(status IN ('success','failed')),
    error_message TEXT,
    api_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  console.log('✅ Schema created/verified.');
}

async function seedData() {
  // Check if already seeded
  const existing = await dbAll('SELECT id FROM users LIMIT 1');
  if (existing.length > 0) {
    console.log('ℹ️  Database already seeded. Skipping.');
    return;
  }

  console.log('🌱 Seeding demo data...');
  const hash = await bcrypt.hash('password123!', 10);

  // Seed default policy
  await dbRun(`INSERT INTO global_policy (id, max_duration_hours, max_days_ahead) VALUES (1, 4, 30) ON CONFLICT (id) DO NOTHING`);

  // Users
  const users = [
    { id: 'u-super', name: 'Super Admin', email: 'superadmin@oikn.go.id', role: 'SUPERADMIN', status: 'active' },
    { id: 'u-admin1', name: 'Ahmad Fauzi', email: 'admin@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active' },
    { id: 'u-admin2', name: 'Sari Dewi', email: 'sari.dewi@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active' },
    { id: 'u-admin3', name: 'Bima Pradana', email: 'bima.pradana@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active' },
    { id: 'u-admin4', name: 'Rina Kusuma', email: 'rina.kusuma@oikn.go.id', role: 'ADMIN_KERJA', status: 'active' },
    { id: 'u-user1', name: 'Budi Santoso', email: 'user@oikn.go.id', role: 'USER', status: 'active' },
    { id: 'u-user2', name: 'Dewi Rahayu', email: 'dewi.rahayu@oikn.go.id', role: 'USER', status: 'active' },
    { id: 'u-api1', name: 'Admin Sistem IKNOW', email: 'api-iknow@system.oikn.go.id', role: 'USER', status: 'active' },
  ];
  for (const u of users) {
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u.id, u.name, u.email, hash, u.role, u.status]
    );
  }

  // Buildings
  const buildings = [
    { id: 'b1', name: 'Gedung IKN Tower', address: 'Kawasan Inti IKN, Kalimantan Timur' },
    { id: 'b2', name: 'Gedung Serba Guna', address: 'Kawasan IKN, Kalimantan Timur' },
    { id: 'b3', name: 'Gedung Teknologi', address: 'Kawasan IKN, Kalimantan Timur' },
  ];
  for (const b of buildings) {
    await dbRun(`INSERT INTO buildings (id, name, address) VALUES ($1,$2,$3)`, [b.id, b.name, b.address]);
  }

  // Floors
  const floors = [
    { id: 'f1', building_id: 'b1', name: 'Lantai 2', level: 2 },
    { id: 'f2', building_id: 'b1', name: 'Lantai 5', level: 5 },
    { id: 'f3', building_id: 'b1', name: 'Lantai 8', level: 8 },
    { id: 'f4', building_id: 'b2', name: 'Lantai 1', level: 1 },
    { id: 'f5', building_id: 'b3', name: 'Lantai 2', level: 2 },
    { id: 'f6', building_id: 'b3', name: 'Lantai 3', level: 3 },
  ];
  for (const f of floors) {
    await dbRun(`INSERT INTO floors (id, building_id, name, level) VALUES ($1,$2,$3,$4)`, [f.id, f.building_id, f.name, f.level]);
  }

  // Rooms
  const rooms = [
    { id: 'r1', name: 'Ruang Rapat Eksekutif A', building_id: 'b1', floor_id: 'f3', admin_id: 'u-admin1', description: 'Ruang rapat premium untuk rapat eksekutif dan tamu VVIP.', status: 'active', approval_type: 'manual', restrict_hours: true, hours_start: '07:00', hours_end: '18:00', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r2', name: 'Ruang Diskusi Inovasi', building_id: 'b1', floor_id: 'f2', admin_id: 'u-admin2', description: 'Ruang kolaborasi untuk sesi brainstorming dan workshop tim.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '08:00', hours_end: '17:00', image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r3', name: 'Aula Serbaguna Nusantara', building_id: 'b2', floor_id: 'f4', admin_id: 'u-admin3', description: 'Aula besar untuk acara skala besar, seminar, dan pelantikan.', status: 'active', approval_type: 'manual', restrict_hours: false, hours_start: null, hours_end: null, image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r4', name: 'Ruang Focus Work 01', building_id: 'b3', floor_id: 'f6', admin_id: 'u-admin4', description: 'Ruang kecil untuk meeting tim kecil dan sesi focus work.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '07:00', hours_end: '20:00', image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r5', name: 'Ruang Pelatihan Digital', building_id: 'b3', floor_id: 'f5', admin_id: 'u-admin4', description: 'Ruang pelatihan lengkap dengan perangkat teknologi terkini.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '08:00', hours_end: '16:00', image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r6', name: 'Lounge Kreatif B2', building_id: 'b1', floor_id: 'f1', admin_id: 'u-admin1', description: 'Ruang santai kreatif. Saat ini dalam renovasi.', status: 'inactive', approval_type: 'instant', restrict_hours: true, hours_start: '09:00', hours_end: '17:00', image_url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=400&q=80', jenis_manajemen_ruang: 'MEETING_ROOM' },
    { id: 'r7', name: 'Ruang Kerja Bersama Level 5', building_id: 'b1', floor_id: 'f2', admin_id: 'u-admin4', description: 'Ruang kerja bersama (coworking space) premium dengan pemandangan sayap barat.', status: 'active', approval_type: 'manual', restrict_hours: false, hours_start: null, hours_end: null, image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80', jenis_manajemen_ruang: 'WORKSPACE' },
  ];
  for (const r of rooms) {
    await dbRun(
      `INSERT INTO rooms (id, name, building_id, floor_id, admin_id, description, status, approval_type, restrict_hours, hours_start, hours_end, image_url, jenis_manajemen_ruang) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [r.id, r.name, r.building_id, r.floor_id, r.admin_id, r.description, r.status, r.approval_type, r.restrict_hours, r.hours_start, r.hours_end, r.image_url, r.jenis_manajemen_ruang]
    );
  }

  // Room layouts
  const layouts = [
    { room_id: 'r1', layout_type: 'Boardroom', capacity: 16 },
    { room_id: 'r1', layout_type: 'U-Shape', capacity: 12 },
    { room_id: 'r2', layout_type: 'Classroom', capacity: 30 },
    { room_id: 'r2', layout_type: 'U-Shape', capacity: 20 },
    { room_id: 'r2', layout_type: 'Theater', capacity: 40 },
    { room_id: 'r3', layout_type: 'Theater', capacity: 200 },
    { room_id: 'r3', layout_type: 'Standing Setup', capacity: 300 },
    { room_id: 'r3', layout_type: 'Classroom', capacity: 120 },
    { room_id: 'r4', layout_type: 'Boardroom', capacity: 8 },
    { room_id: 'r5', layout_type: 'Classroom', capacity: 40 },
    { room_id: 'r6', layout_type: 'Standing Setup', capacity: 50 },
    { room_id: 'r6', layout_type: 'Boardroom', capacity: 10 },
  ];
  for (const l of layouts) {
    await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1,$2,$3,$4)`,
      [uuidv4(), l.room_id, l.layout_type, l.capacity]);
  }

  // Room facilities
  const facilities = [
    { room_id: 'r1', items: [['tv_monitor',2],['projector',1],['video_conference',1],['sound_system',1],['whiteboard',2],['outlet',12]] },
    { room_id: 'r2', items: [['tv_monitor',1],['projector',2],['video_conference',1],['sound_system',1],['whiteboard',3],['outlet',20]] },
    { room_id: 'r3', items: [['tv_monitor',4],['projector',3],['video_conference',2],['sound_system',4],['whiteboard',1],['outlet',40]] },
    { room_id: 'r4', items: [['tv_monitor',1],['projector',0],['video_conference',0],['sound_system',0],['whiteboard',1],['outlet',8]] },
    { room_id: 'r5', items: [['tv_monitor',2],['projector',2],['video_conference',1],['sound_system',2],['whiteboard',2],['outlet',40]] },
    { room_id: 'r6', items: [['tv_monitor',1],['projector',0],['video_conference',0],['sound_system',1],['whiteboard',2],['outlet',16]] },
  ];
  for (const f of facilities) {
    for (const [type, qty] of f.items) {
      await dbRun(`INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES ($1,$2,$3,$4)`,
        [uuidv4(), f.room_id, type, qty]);
    }
  }

  // Room assignments (junction table seed)
  const assignments = [
    { user_id: 'u-admin1', room_id: 'r1' },
    { user_id: 'u-admin1', room_id: 'r6' },
    { user_id: 'u-admin2', room_id: 'r2' },
    { user_id: 'u-admin3', room_id: 'r3' },
    { user_id: 'u-admin4', room_id: 'r4' },
    { user_id: 'u-admin4', room_id: 'r5' },
    { user_id: 'u-admin4', room_id: 'r7' },
  ];
  for (const a of assignments) {
    await dbRun(`INSERT INTO room_assignments (user_id, room_id) VALUES ($1,$2) ON CONFLICT (user_id, room_id) DO NOTHING`,
      [a.user_id, a.room_id]);
  }

  // Sample bookings (using today-relative dates)
  const today = new Date();
  const fmtDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };

  const bookings = [
    { id: 'bk1', room_id: 'r1', user_id: 'u-user1', date: fmtDate(addDays(today,1)), start_time: '09:00', end_time: '11:00', agenda: 'Rapat Koordinasi Anggaran Q2', participants: 12, status: 'confirmed', meeting_type: 'offline' },
    { id: 'bk2', room_id: 'r2', user_id: 'u-user1', date: fmtDate(addDays(today,1)), start_time: '13:00', end_time: '15:00', agenda: 'Workshop Digital Transformation', participants: 25, status: 'confirmed', meeting_type: 'hybrid' },
    { id: 'bk3', room_id: 'r1', user_id: 'u-user2', date: fmtDate(addDays(today,2)), start_time: '10:00', end_time: '12:00', agenda: 'Presentasi Laporan Tahunan', participants: 14, status: 'pending', meeting_type: 'offline' },
    { id: 'bk4', room_id: 'r3', user_id: 'u-admin3', date: fmtDate(addDays(today,3)), start_time: '08:00', end_time: '17:00', agenda: 'Seminar Nasional SPBE', participants: 180, status: 'pending', meeting_type: 'hybrid', surat_terkait: 'Surat Edaran No. SE-012/OIKN/2026' },
    { id: 'bk5', room_id: 'r4', user_id: 'u-user1', date: fmtDate(today), start_time: '14:00', end_time: '16:00', agenda: 'Review Kode Aplikasi', participants: 5, status: 'ongoing', meeting_type: 'online' },
    { id: 'bk6', room_id: 'r2', user_id: 'u-user1', date: fmtDate(addDays(today,-8)), start_time: '09:00', end_time: '11:00', agenda: 'Sprint Planning', participants: 8, status: 'completed', meeting_type: 'offline' },
    { id: 'bk7', room_id: 'r1', user_id: 'u-user2', date: fmtDate(addDays(today,-6)), start_time: '13:00', end_time: '15:00', agenda: 'Rapat Direksi Bulanan', participants: 10, status: 'cancelled', meeting_type: 'offline' },
    { id: 'bk8', room_id: 'r2', user_id: 'u-user2', date: fmtDate(addDays(today,4)), start_time: '09:00', end_time: '11:00', agenda: 'Onboarding Karyawan Baru', participants: 15, status: 'confirmed', meeting_type: 'offline' },
    { id: 'bk9', room_id: 'r5', user_id: 'u-admin4', date: fmtDate(addDays(today,2)), start_time: '09:00', end_time: '12:00', agenda: 'Pelatihan Digital Transformasi', participants: 35, status: 'confirmed', meeting_type: 'offline' },
  ];
  for (const bk of bookings) {
    await dbRun(`INSERT INTO bookings (id, room_id, user_id, date, start_time, end_time, agenda, participants, status, meeting_type, surat_terkait) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [bk.id, bk.room_id, bk.user_id, bk.date, bk.start_time, bk.end_time, bk.agenda, bk.participants, bk.status, bk.meeting_type, bk.surat_terkait || null]);
  }

  // API Tokens
  const tokenSecret = await bcrypt.hash('secret-iknow-2025', 10);
  await dbRun(`INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level, status, request_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ['t1', 'IKNOW Application', 'client_iknow_prod', tokenSecret, 'read-write', 'active', 1248]);
  await dbRun(`INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level, status, request_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ['t2', 'Dashboard Monitoring', 'client_dashboard_01', tokenSecret, 'read', 'active', 5621]);
  await dbRun(`INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level, status, request_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ['t3', 'Test Integration', 'client_test_123', tokenSecret, 'read', 'revoked', 42]);

  // Audit logs
  const auditLogs = [
    { id: 'al1', actor_id: 'u-admin1', actor_name: 'Ahmad Fauzi (Admin)', action: 'FORCE_CANCEL', resource: 'Booking #bk1 - Ruang Rapat Eksekutif A', ip: '10.0.1.45', payload_before: null, payload_after: JSON.stringify({ reason: 'Persiapan kunjungan tamu negara mendadak' }) },
    { id: 'al2', actor_id: 'u-super', actor_name: 'Super Admin', action: 'UPDATE_POLICY', resource: 'Kebijakan Global - Batas durasi booking', ip: '10.0.0.1', payload_before: JSON.stringify({ max_duration_hours: 4 }), payload_after: JSON.stringify({ max_duration_hours: 6 }) },
    { id: 'al3', actor_id: 'u-admin2', actor_name: 'Sari Dewi (Admin)', action: 'APPROVE_BOOKING', resource: 'Booking #bk3 - Ruang Diskusi Inovasi', ip: '10.0.2.33', payload_before: JSON.stringify({ status: 'pending' }), payload_after: JSON.stringify({ status: 'confirmed' }) },
    { id: 'al4', actor_id: 'u-super', actor_name: 'Super Admin', action: 'CREATE_ROOM', resource: 'Ruang Focus Work 01', ip: '10.0.0.1', payload_before: null, payload_after: JSON.stringify({ id: 'r4', name: 'Ruang Focus Work 01' }) },
    { id: 'al5', actor_id: 'u-api1', actor_name: 'API: IKNOW System', action: 'CREATE_BOOKING', resource: 'Booking via API - Ruang Diskusi Inovasi', ip: '172.16.5.20', payload_before: null, payload_after: JSON.stringify({ room: 'r2', date: fmtDate(today) }) },
    { id: 'al6', actor_id: 'u-super', actor_name: 'Super Admin', action: 'REVOKE_TOKEN', resource: 'API Token: client_test_123 (Read-Only)', ip: '10.0.0.1', payload_before: JSON.stringify({ status: 'active' }), payload_after: JSON.stringify({ status: 'revoked' }) },
    { id: 'al7', actor_id: 'u-admin3', actor_name: 'Bima Pradana (Admin)', action: 'UPDATE_ROOM', resource: 'Aula Serbaguna Nusantara', ip: '10.0.3.55', payload_before: JSON.stringify({ capacity: 150 }), payload_after: JSON.stringify({ capacity: 200 }) },
  ];
  for (const al of auditLogs) {
    await dbRun(`INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, ip, payload_before, payload_after) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [al.id, al.actor_id, al.actor_name, al.action, al.resource, al.ip, al.payload_before, al.payload_after]);
  }

  // Workspace Desks Seeding for r7
  console.log('🌱 Seeding workspace desks for r7...');
  await dbRun(`UPDATE rooms SET total_meja_kerja = 20 WHERE id = 'r7'`);
  for (let i = 1; i <= 20; i++) {
    const deskId = `Desk-${String(i).padStart(2, '0')}`;
    const isOccupied = i === 12;
    const isDisabled = i === 17;
    const status = isOccupied ? 'OCCUPIED' : isDisabled ? 'DISABLED' : 'VACANT';
    const assignedUser = isOccupied ? 'u-user1' : null;
    await dbRun(
      `INSERT INTO workspace_desks (room_id, desk_id, status, assigned_user_id) 
       VALUES ('r7', $1, $2, $3)
       ON CONFLICT (room_id, desk_id) DO UPDATE SET status = $2, assigned_user_id = $3`,
      [deskId, status, assignedUser]
    );
  }

  console.log('✅ Seed data inserted successfully.');
  console.log('\n📋 Demo Credentials:');
  console.log('  👤 User:        user@oikn.go.id / password123!');
  console.log('  🔑 Admin:       admin@oikn.go.id / password123!');
  console.log('  👑 SuperAdmin:  superadmin@oikn.go.id / password123!');
}

module.exports = { initSchema, seedData };
