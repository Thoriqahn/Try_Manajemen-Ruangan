const { dbRun, dbAll, dbGet } = require('./database');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');

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

  await dbRun(`CREATE TABLE IF NOT EXISTS meeting_attendees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    email TEXT,
    institution TEXT,
    position TEXT,
    signature TEXT,
    attendance_type TEXT DEFAULT 'offline',
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, user_id, email)
  )`);

  // Migrate existing meeting_attendees table
  try {
    await dbRun(`ALTER TABLE meeting_attendees ALTER COLUMN user_id DROP NOT NULL`);
    await dbRun(`ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS email TEXT`);
    await dbRun(`ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS institution TEXT`);
    await dbRun(`ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS position TEXT`);
    await dbRun(`ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS signature TEXT`);
    await dbRun(`ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS attendance_type TEXT DEFAULT 'offline'`);
    await dbRun(`ALTER TABLE meeting_attendees DROP CONSTRAINT IF EXISTS meeting_attendees_booking_id_user_id_key`);
    await dbRun(`ALTER TABLE meeting_attendees ADD CONSTRAINT meeting_attendees_booking_id_user_id_email_key UNIQUE(booking_id, user_id, email)`);
  } catch (err) {
    console.log('Migration info (meeting_attendees updates):', err.message);
  }

  await dbRun(`CREATE TABLE IF NOT EXISTS zoom_meeting_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    zoom_account_id TEXT REFERENCES zoom_accounts(id) ON DELETE SET NULL,
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_passcode TEXT,
    action TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE')),
    status TEXT NOT NULL CHECK(status IN ('success','failed')),
    error_message TEXT,
    api_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS meeting_attendee_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  console.log('✅ Schema created/verified.');
}

async function seedData() {
  console.log('🧹 Wiping all existing tables to prepare fresh showcase seed...');
  await dbRun(`
    TRUNCATE TABLE
      meeting_attendees,
      seating_requests,
      workspace_desks,
      room_photos,
      room_layouts,
      room_facilities,
      room_assignments,
      bookings,
      rooms,
      floors,
      buildings,
      audit_logs,
      api_logs,
      api_tokens,
      notifications,
      users,
      global_policy,
      blackout_dates,
      zoom_meeting_logs,
      zoom_config,
      zoom_accounts,
      global_audit_trail
      CASCADE
  `);

  console.log('🌱 Seeding premium OIKN showcase data...');
  const hash = await bcrypt.hash('password123!', 10);

  // Seed default policy
  await dbRun(`INSERT INTO global_policy (id, max_duration_hours, max_days_ahead) VALUES (1, 6, 30) ON CONFLICT (id) DO NOTHING`);

  // Users
  const users = [
    { id: 'u-super', name: 'Super Admin', email: 'superadmin@oikn.go.id', role: 'SUPERADMIN', status: 'active' },
    { id: 'u-admin1', name: 'Ahmad Fauzi, S.Kom.', email: 'admin@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
    { id: 'u-admin2', name: 'Sari Dewi, M.T.', email: 'sari.dewi@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80' },
    { id: 'u-admin3', name: 'Bima Pradana, M.B.A.', email: 'bima.pradana@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' },
    { id: 'u-admin4', name: 'Rina Kusuma, S.E.', email: 'rina.kusuma@oikn.go.id', role: 'ADMIN_KERJA', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80' },
    { id: 'u-admin5', name: 'Fajar Nugroho, S.T.', email: 'fajar.nugroho@oikn.go.id', role: 'ADMIN_RAPAT', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80' },
    { id: 'u-user1', name: 'Budi Santoso, M.Eng.', email: 'user@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80' },
    { id: 'u-user2', name: 'Dewi Rahayu, S.I.P.', email: 'dewi.rahayu@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
    { id: 'u-user3', name: 'Eko Prasetyo, S.H.', email: 'eko.prasetyo@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80' },
    { id: 'u-user4', name: 'Siti Aminah, M.Si.', email: 'siti.aminah@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80' },
    { id: 'u-user5', name: 'Rian Hidayat, B.Eng.', email: 'rian.hidayat@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80' },
    { id: 'u-user6', name: 'Dimas Anggara', email: 'dimas@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80' },
    { id: 'u-user7', name: 'Rina Melati', email: 'rina@oikn.go.id', role: 'USER', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80' },
    { id: 'u-api1', name: 'Admin Sistem IKNOW Core', email: 'api-iknow@system.oikn.go.id', role: 'USER', status: 'active' }
  ];

  for (const u of users) {
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status, avatar_url) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [u.id, u.name, u.email, hash, u.role, u.status, u.avatar_url || null]
    );
  }

  // Buildings
  const buildings = [
    { id: 'b1', name: 'Gedung IKN Tower A', address: 'Kawasan Inti Pusat Pemerintahan (KIPP), Sepaku, Penajam Paser Utara, Kalimantan Timur', lat: '-0.9634', lng: '116.7089', total_floors: 12, image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80' },
    { id: 'b2', name: 'Gedung Serba Guna Nusantara', address: 'Kawasan Hunian ASN IKN, Sepaku, Kalimantan Timur', lat: '-0.9650', lng: '116.7110', total_floors: 3, image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80' },
    { id: 'b3', name: 'Gedung Teknologi & Inovasi', address: 'Kawasan Technopark IKN, Sepaku, Kalimantan Timur', lat: '-0.9610', lng: '116.7040', total_floors: 5, image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&q=80' },
  ];
  for (const b of buildings) {
    await dbRun(
      `INSERT INTO buildings (id, name, address, lat, lng, total_floors, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [b.id, b.name, b.address, b.lat, b.lng, b.total_floors, b.image_url]
    );
  }

  // Floors
  const floors = [
    { id: 'f1', building_id: 'b1', name: 'Lantai 1 - Lobby & Resepsionis', level: 1 },
    { id: 'f2', building_id: 'b1', name: 'Lantai 2 - Perencanaan Tata Ruang', level: 2 },
    { id: 'f3', building_id: 'b1', name: 'Lantai 3 - Bidang Infrastruktur', level: 3 },
    { id: 'f4', building_id: 'b1', name: 'Lantai 5 - Deputi Teknologi Informasi', level: 5 },
    { id: 'f5', building_id: 'b2', name: 'Lantai Dasar - Hall Utama', level: 1 },
    { id: 'f6', building_id: 'b3', name: 'Lantai 2 - Pusat Inkubasi Startup', level: 2 },
    { id: 'f7', building_id: 'b3', name: 'Lantai 3 - Smart City Center', level: 3 },
  ];
  for (const f of floors) {
    await dbRun(`INSERT INTO floors (id, building_id, name, level) VALUES ($1,$2,$3,$4)`, [f.id, f.building_id, f.name, f.level]);
  }

  // Rooms
  const rooms = [
    { id: 'r1', name: 'Ruang Rapat Eksekutif Garuda', building_id: 'b1', floor_id: 'f4', admin_id: 'u-admin1', description: 'Ruang rapat premium dengan fasilitas video conference VVIP, kedap suara, dan view KIPP IKN.', status: 'active', approval_type: 'manual', restrict_hours: true, hours_start: '07:00', hours_end: '18:00', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'physical' },
    { id: 'r2', name: 'Ruang Kolaborasi Nusantara', building_id: 'b1', floor_id: 'f2', admin_id: 'u-admin2', description: 'Ruang kolaborasi tim kreatif dilengkapi dengan interactive screens dan smart whiteboard.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '08:00', hours_end: '17:00', image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'hybrid' },
    { id: 'r3', name: 'Auditorium Bung Karno', building_id: 'b2', floor_id: 'f5', admin_id: 'u-admin3', description: 'Auditorium megah untuk seminar besar, upacara pelantikan, dan simposium nasional.', status: 'active', approval_type: 'manual', restrict_hours: false, hours_start: null, hours_end: null, image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'hybrid' },
    { id: 'r4', name: 'Ruang Focus Work Smart City', building_id: 'b3', floor_id: 'f7', admin_id: 'u-admin4', description: 'Ruang kecil kedap suara untuk rapat tim kecil dan sesi kerja fokus individu.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '07:00', hours_end: '20:00', image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'digital' },
    { id: 'r5', name: 'Lab Pelatihan Komputer & GIS', building_id: 'b3', floor_id: 'f6', admin_id: 'u-admin4', description: 'Laboratorium pelatihan teknis geospasial (GIS) dengan komputer spesifikasi tinggi.', status: 'active', approval_type: 'instant', restrict_hours: true, hours_start: '08:00', hours_end: '18:00', image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'hybrid' },
    { id: 'r6', name: 'Studio Podcast OIKN', building_id: 'b1', floor_id: 'f1', admin_id: 'u-admin1', description: 'Studio rekaman podcast Humas OIKN. Saat ini dalam pemeliharaan perangkat sound system.', status: 'inactive', approval_type: 'manual', restrict_hours: true, hours_start: '09:00', hours_end: '17:00', image_url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=600&q=80', jenis_manajemen_ruang: 'MEETING_ROOM', room_type: 'physical' },
    { id: 'r7', name: 'Ruang Kerja Bersama Level 5', building_id: 'b1', floor_id: 'f4', admin_id: 'u-admin4', description: 'Coworking space modern untuk staf OIKN dan deputi dengan fasilitas meja ergonomic dan high-speed Wi-Fi.', status: 'active', approval_type: 'manual', restrict_hours: false, hours_start: null, hours_end: null, image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80', jenis_manajemen_ruang: 'WORKSPACE', room_type: 'physical', total_meja_kerja: 30 },
  ];
  for (const r of rooms) {
    await dbRun(
      `INSERT INTO rooms (id, name, building_id, floor_id, admin_id, description, status, approval_type, restrict_hours, hours_start, hours_end, image_url, jenis_manajemen_ruang, room_type, total_meja_kerja) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [r.id, r.name, r.building_id, r.floor_id, r.admin_id, r.description, r.status, r.approval_type, r.restrict_hours, r.hours_start, r.hours_end, r.image_url, r.jenis_manajemen_ruang, r.room_type, r.total_meja_kerja || null]
    );
  }

  // Room layouts
  const layouts = [
    { room_id: 'r1', layout_type: 'Boardroom Setup', capacity: 20 },
    { room_id: 'r1', layout_type: 'U-Shape Class', capacity: 16 },
    { room_id: 'r2', layout_type: 'Creative Lounge', capacity: 35 },
    { room_id: 'r2', layout_type: 'Workshop Setup', capacity: 25 },
    { room_id: 'r3', layout_type: 'Theater Style', capacity: 250 },
    { room_id: 'r3', layout_type: 'Classroom Setup', capacity: 150 },
    { room_id: 'r4', layout_type: 'Individual Booths', capacity: 8 },
    { room_id: 'r5', layout_type: 'PC Training Lab', capacity: 40 },
    { room_id: 'r6', layout_type: 'Studio Setup', capacity: 6 },
    { room_id: 'r7', layout_type: 'Open Plan Workspace', capacity: 30 },
  ];
  for (const l of layouts) {
    await dbRun(`INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1,$2,$3,$4)`,
      [uuidv4(), l.room_id, l.layout_type, l.capacity]);
  }

  // Room facilities
  const facilities = [
    { room_id: 'r1', items: [['tv_monitor',2],['projector',1],['video_conference',1],['sound_system',1],['whiteboard',2],['outlet',16]] },
    { room_id: 'r2', items: [['tv_monitor',3],['projector',2],['video_conference',1],['sound_system',2],['whiteboard',4],['outlet',24]] },
    { room_id: 'r3', items: [['tv_monitor',6],['projector',4],['video_conference',2],['sound_system',6],['whiteboard',2],['outlet',80]] },
    { room_id: 'r4', items: [['tv_monitor',1],['projector',0],['video_conference',0],['sound_system',0],['whiteboard',1],['outlet',8]] },
    { room_id: 'r5', items: [['tv_monitor',2],['projector',2],['video_conference',1],['sound_system',2],['whiteboard',2],['outlet',45]] },
    { room_id: 'r6', items: [['tv_monitor',1],['projector',0],['video_conference',0],['sound_system',2],['whiteboard',1],['outlet',12]] },
    { room_id: 'r7', items: [['tv_monitor',2],['projector',0],['video_conference',0],['sound_system',0],['whiteboard',4],['outlet',60]] },
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

  // Bookings (using today-relative dates and dynamic hours)
  const today = new Date();
  const fmtDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };

  const pad = (n) => String(n).padStart(2, '0');
  const nowHour = today.getUTCHours();

  // Dynamic booking times to make sure "ongoing" matches actual time
  const ongoingStart = `${pad((nowHour - 1 + 24) % 24)}:00`;
  const ongoingEnd = `${pad((nowHour + 2) % 24)}:00`;

  // FGD starts 5 minutes ago so it is ongoing but within the 15-minute check-in grace period
  const fmtTime = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const fiveMinAgo = new Date(today.getTime() - 5 * 60 * 1000);
  const oneHourLater = new Date(today.getTime() + 60 * 60 * 1000);
  const FGDDate = fmtDate(fiveMinAgo);
  const FGDStart = fmtTime(fiveMinAgo);
  const FGDEnd = fmtTime(oneHourLater);

  const bookings = [
    // 1. Sedang Berjalan (Claimed, Ongoing)
    { 
      id: 'bk-ongoing-1', 
      room_id: 'r2', 
      user_id: 'u-user1', // Budi Santoso
      date: fmtDate(today), 
      start_time: ongoingStart, 
      end_time: ongoingEnd, 
      agenda: 'Rapat Pleno Koordinasi Implementasi SPBE OIKN', 
      participants: 15, 
      status: 'ongoing', 
      meeting_type: 'hybrid',
      is_checked_in: true,
      zoom_meeting_id: '987 6543 2100',
      zoom_join_url: 'https://zoom.us/j/98765432100',
      zoom_passcode: 'SPBE2026',
      zoom_host_email: 'sari.dewi@oikn.go.id',
      surat_terkait: 'S-142/OIKN/TI/2026'
    },
    // 2. Sedang Berjalan (Unclaimed/Confirmed, ready to scan QR code live!)
    { 
      id: 'bk-ongoing-2', 
      room_id: 'r1', 
      user_id: 'u-user2', // Dewi Rahayu
      date: FGDDate, 
      start_time: FGDStart, 
      end_time: FGDEnd, 
      agenda: 'FGD Masterplan Kawasan Inti Pusat Pemerintahan (KIPP) Barat', 
      participants: 8, 
      status: 'confirmed', 
      meeting_type: 'offline',
      is_checked_in: false,
      surat_terkait: 'S-143/OIKN/PLAN/2026'
    },
    // 3. Mendatang (Upcoming, Confirmed)
    { 
      id: 'bk-upcoming-1', 
      room_id: 'r2', 
      user_id: 'u-user1', 
      date: fmtDate(addDays(today, 1)), 
      start_time: '09:00', 
      end_time: '11:30', 
      agenda: 'Workshop Penyusunan Peta Rencana Smart City IKN', 
      participants: 25, 
      status: 'confirmed', 
      meeting_type: 'hybrid',
      is_checked_in: false,
      zoom_meeting_id: '987 6543 2101',
      zoom_join_url: 'https://zoom.us/j/98765432101',
      zoom_passcode: 'SMARTCITY',
      zoom_host_email: 'sari.dewi@oikn.go.id',
      surat_terkait: 'S-145/OIKN/TI/2026'
    },
    // 4. Mendatang (Upcoming, Pending - to show admin approval workflow)
    { 
      id: 'bk-upcoming-2', 
      room_id: 'r1', 
      user_id: 'u-user1', 
      date: fmtDate(addDays(today, 2)), 
      start_time: '13:30', 
      end_time: '15:00', 
      agenda: 'Rapat Koordinasi Anggaran Divisi Teknologi Informasi Q3', 
      participants: 12, 
      status: 'pending', 
      meeting_type: 'offline',
      is_checked_in: false
    },
    // 5. Mendatang (Upcoming, Pending)
    { 
      id: 'bk-upcoming-3', 
      room_id: 'r3', 
      user_id: 'u-admin3', 
      date: fmtDate(addDays(today, 5)), 
      start_time: '08:00', 
      end_time: '12:00', 
      agenda: 'Seminar Keamanan Siber dan Sistem Proteksi Data IKN', 
      participants: 180, 
      status: 'pending', 
      meeting_type: 'hybrid',
      is_checked_in: false,
      surat_terkait: 'SE-022/OIKN/BSSN/2026'
    },
    // 6. Riwayat (Past, Completed, with attendees history)
    { 
      id: 'bk-past-1', 
      room_id: 'r1', 
      user_id: 'u-user1', 
      date: fmtDate(addDays(today, -3)), 
      start_time: '09:00', 
      end_time: '11:00', 
      agenda: 'Sprint Planning & Evaluasi Teknis Aplikasi Menara v1.0', 
      participants: 8, 
      status: 'completed', 
      meeting_type: 'offline',
      is_checked_in: true
    },
    // 7. Riwayat (Past, Cancelled)
    { 
      id: 'bk-past-2', 
      room_id: 'r2', 
      user_id: 'u-user2', 
      date: fmtDate(addDays(today, -5)), 
      start_time: '14:00', 
      end_time: '16:00', 
      agenda: 'Koordinasi Teknis Integrasi GIS Kementerian ATR/BPN', 
      participants: 15, 
      status: 'cancelled', 
      meeting_type: 'hybrid',
      is_checked_in: false,
      cancel_reason: 'Perubahan jadwal kementerian mitra teknis'
    },
    // 8. Riwayat (Past, CANCELLED_NOSHOW - anti-ghost booking display)
    { 
      id: 'bk-past-3', 
      room_id: 'r4', 
      user_id: 'u-user3', 
      date: fmtDate(addDays(today, -1)), 
      start_time: '10:00', 
      end_time: '12:00', 
      agenda: 'Review Draft Hukum Perjanjian Kerja Sama IKN-Lembaga Donor', 
      participants: 2, 
      status: 'CANCELLED_NOSHOW', 
      meeting_type: 'offline',
      is_checked_in: false,
      cancel_reason: 'Rapat dibatalkan otomatis oleh sistem karena tidak ada presensi check-in fisik di ruangan dalam batas toleransi 15 menit.'
    }
  ];

  for (const bk of bookings) {
    await dbRun(
      `INSERT INTO bookings (id, room_id, user_id, date, start_time, end_time, agenda, participants, status, meeting_type, is_checked_in, zoom_meeting_id, zoom_join_url, zoom_passcode, zoom_host_email, surat_terkait, cancel_reason) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [bk.id, bk.room_id, bk.user_id, bk.date, bk.start_time, bk.end_time, bk.agenda, bk.participants, bk.status, bk.meeting_type, bk.is_checked_in, bk.zoom_meeting_id || null, bk.zoom_join_url || null, bk.zoom_passcode || null, bk.zoom_host_email || null, bk.surat_terkait || null, bk.cancel_reason || null]
    );
  }

  // Attendees Seeding for Rapat SPBE (bk-ongoing-1)
  console.log('🌱 Seeding meeting attendees...');
  const now = new Date();
  
  const attendeesOngoing = [
    { booking_id: 'bk-ongoing-1', user_id: 'u-user1', user_name: 'Budi Santoso, M.Eng.', offsetMinutes: -55 },
    { booking_id: 'bk-ongoing-1', user_id: 'u-user2', user_name: 'Dewi Rahayu, S.I.P.', offsetMinutes: -50 },
    { booking_id: 'bk-ongoing-1', user_id: 'u-user3', user_name: 'Eko Prasetyo, S.H.', offsetMinutes: -45 },
    { booking_id: 'bk-ongoing-1', user_id: 'u-admin1', user_name: 'Ahmad Fauzi, S.Kom.', offsetMinutes: -40 }
  ];
  for (const att of attendeesOngoing) {
    const scanTime = new Date(now.getTime() + att.offsetMinutes * 60 * 1000);
    await dbRun(
      `INSERT INTO meeting_attendees (id, booking_id, user_id, user_name, scanned_at) VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), att.booking_id, att.user_id, att.user_name, scanTime.toISOString()]
    );
  }

  // Attendees Seeding for Past Meeting (bk-past-1)
  const pastDateStr = fmtDate(addDays(today, -3));
  const scanTime1 = new Date(`${pastDateStr}T09:02:00Z`);
  const scanTime2 = new Date(`${pastDateStr}T09:05:00Z`);
  const scanTime3 = new Date(`${pastDateStr}T09:07:00Z`);
  const scanTime4 = new Date(`${pastDateStr}T09:12:00Z`);

  const attendeesPast = [
    { booking_id: 'bk-past-1', user_id: 'u-user1', user_name: 'Budi Santoso, M.Eng.', scanTime: scanTime1 },
    { booking_id: 'bk-past-1', user_id: 'u-user2', user_name: 'Dewi Rahayu, S.I.P.', scanTime: scanTime2 },
    { booking_id: 'bk-past-1', user_id: 'u-admin1', user_name: 'Ahmad Fauzi, S.Kom.', scanTime: scanTime3 },
    { booking_id: 'bk-past-1', user_id: 'u-user5', user_name: 'Rian Hidayat, B.Eng.', scanTime: scanTime4 }
  ];
  for (const att of attendeesPast) {
    await dbRun(
      `INSERT INTO meeting_attendees (id, booking_id, user_id, user_name, scanned_at) VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), att.booking_id, att.user_id, att.user_name, att.scanTime.toISOString()]
    );
  }

  // Workspace Desks Seeding for r7 (Ruang Kerja Bersama Level 5)
  console.log('🌱 Seeding workspace desks for r7...');
  for (let i = 1; i <= 30; i++) {
    const deskId = `Desk-${String(i).padStart(2, '0')}`;
    let status = 'VACANT';
    let assignedUser = null;

    if (i === 5) {
      status = 'OCCUPIED';
      assignedUser = 'u-user1'; // Budi Santoso (primary user)
    } else if (i === 12) {
      status = 'OCCUPIED';
      assignedUser = 'u-user2'; // Dewi Rahayu
    } else if (i === 18) {
      status = 'OCCUPIED';
      assignedUser = 'u-user3'; // Eko Prasetyo
    } else if (i === 24) {
      status = 'OCCUPIED';
      assignedUser = 'u-user4'; // Siti Aminah
    } else if (i === 10 || i === 20) {
      status = 'DISABLED'; // Under maintenance
    }

    await dbRun(
      `INSERT INTO workspace_desks (room_id, desk_id, status, assigned_user_id) 
       VALUES ('r7', $1, $2, $3)
       ON CONFLICT (room_id, desk_id) DO UPDATE SET status = $2, assigned_user_id = $3`,
      [deskId, status, assignedUser]
    );
  }

  // Seating Requests
  console.log('🌱 Seeding seating requests...');
  const requests = [
    { id: 'req-seating-1', room_id: 'r7', desk_id: 'Desk-03', user_id: 'u-user2', status: 'PENDING' },
    { id: 'req-seating-2', room_id: 'r7', desk_id: 'Desk-14', user_id: 'u-user1', status: 'PENDING' }, // Budi's pending request
    { id: 'req-seating-3', room_id: 'r7', desk_id: 'Desk-08', user_id: 'u-user5', status: 'APPROVED' },
    { id: 'req-seating-4', room_id: 'r7', desk_id: 'Desk-21', user_id: 'u-user3', status: 'REJECTED' }
  ];
  for (const req of requests) {
    await dbRun(
      `INSERT INTO seating_requests (id, room_id, desk_id, user_id, status) VALUES ($1,$2,$3,$4,$5)`,
      [req.id, req.room_id, req.desk_id, req.user_id, req.status]
    );
  }

  // Notifications
  console.log('🌱 Seeding notifications...');
  const notifications = [
    { id: 'notif-1', user_id: 'u-user1', title: 'Reservasi Rapat Dikonfirmasi', message: 'Reservasi Anda untuk "Workshop Penyusunan Peta Rencana Smart City IKN" di Ruang Kolaborasi Nusantara telah dikonfirmasi oleh Sari Dewi.', is_read: false },
    { id: 'notif-2', user_id: 'u-user1', title: 'Penempatan Meja Kerja Aktif', message: 'Anda telah resmi ditempatkan di Desk-05 di Ruang Kerja Bersama Level 5. Selamat bekerja!', is_read: true },
    { id: 'notif-3', user_id: 'u-user1', title: 'Peringatan Anti-Ghost Booking', message: 'Reservasi "FGD Teknis GIS" kemarin dibatalkan otomatis oleh sistem karena tidak terdeteksi presensi fisik di ruangan.', is_read: false },
    { id: 'notif-4', user_id: 'u-admin4', title: 'Pengajuan Pemindahan Meja Baru', message: 'Dewi Rahayu mengajukan pemindahan meja kerja ke Desk-03 di Ruang Kerja Bersama Level 5.', is_read: false }
  ];
  for (const notif of notifications) {
    await dbRun(
      `INSERT INTO notifications (id, user_id, title, message, is_read) VALUES ($1,$2,$3,$4,$5)`,
      [notif.id, notif.user_id, notif.title, notif.message, notif.is_read]
    );
  }

  // API Tokens
  const tokenSecret = await bcrypt.hash('secret-iknow-2025', 10);
  await dbRun(`INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level, status, request_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ['t1', 'IKNOW Core Application', 'client_iknow_prod', tokenSecret, 'read-write', 'active', 1248]);
  await dbRun(`INSERT INTO api_tokens (id, name, client_id, secret_hash, access_level, status, request_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ['t2', 'Dashboard Hub Monitoring', 'client_dashboard_01', tokenSecret, 'read', 'active', 5621]);

  // Audit Logs
  console.log('🌱 Seeding audit logs...');
  const auditLogs = [
    { id: 'al1', actor_id: 'u-admin1', actor_name: 'Ahmad Fauzi (Admin)', action: 'FORCE_CANCEL', resource: 'Booking #bk-past-2 - Ruang Kolaborasi Nusantara', ip: '10.0.1.45', payload_before: null, payload_after: JSON.stringify({ reason: 'Perubahan jadwal kementerian mitra teknis' }) },
    { id: 'al2', actor_id: 'u-super', actor_name: 'Super Admin', action: 'UPDATE_POLICY', resource: 'Kebijakan Global - Batas durasi booking', ip: '10.0.0.1', payload_before: JSON.stringify({ max_duration_hours: 4 }), payload_after: JSON.stringify({ max_duration_hours: 6 }) },
    { id: 'al3', actor_id: 'u-admin4', actor_name: 'Rina Kusuma (Admin)', action: 'APPROVE_SEATING', resource: 'Seating Request #req-seating-3: Desk Desk-08 to Rian Hidayat', ip: '10.0.2.33', payload_before: JSON.stringify({ status: 'PENDING' }), payload_after: JSON.stringify({ status: 'APPROVED' }) },
    { id: 'al4', actor_id: 'u-super', actor_name: 'Super Admin', action: 'CREATE_ROOM', resource: 'Ruang Kerja Bersama Level 5 (WORKSPACE)', ip: '10.0.0.1', payload_before: null, payload_after: JSON.stringify({ id: 'r7', name: 'Ruang Kerja Bersama Level 5' }) },
  ];
  for (const al of auditLogs) {
    await dbRun(`INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, ip, payload_before, payload_after) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [al.id, al.actor_id, al.actor_name, al.action, al.resource, al.ip, al.payload_before, al.payload_after]);
  }

  console.log('✅ Premium OIKN Seed data inserted successfully.');
  console.log('\n📋 Premium Demo Credentials:');
  console.log('  👤 Regular User: user@oikn.go.id / password123!');
  console.log('  🔑 Admin Rapat:  admin@oikn.go.id / password123!');
  console.log('  👑 Super Admin: superadmin@oikn.go.id / password123!');
}

module.exports = { initSchema, seedData };
