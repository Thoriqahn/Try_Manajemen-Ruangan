const { pool } = require('./src/config/database');

async function seedTestData() {
  const future = new Date(Date.now() + 60*60000);
  const now = new Date();
  const fTime = (d) => d.toTimeString().substring(0, 5);

  // 1. Create a hybrid booking that Dimas is attending (Current)
  await pool.query(`
    INSERT INTO bookings (id, room_id, user_id, date, start_time, end_time, agenda, participants, status, meeting_type, zoom_join_url)
    VALUES ('bk-test-current', 'r2', 'u-admin1', $1, $2, $3, 'Test E2E Hybrid Meeting (Bug 6, 2, 4, 3)', 5, 'confirmed', 'hybrid', 'https://zoom.us/j/123')
    ON CONFLICT (id) DO UPDATE SET date=$1, start_time=$2, end_time=$3
  `, [now.toISOString().split('T')[0], fTime(new Date(now.getTime() - 15*60000)), fTime(new Date(now.getTime() + 45*60000))]);

  // Make Dimas attend it
  await pool.query(`
    INSERT INTO meeting_attendees (id, booking_id, user_id, user_name, email, attendance_type, scanned_at)
    VALUES ('att-test-1', 'bk-test-current', 'u-user6', 'Dimas Anggara', 'dimas@oikn.go.id', 'online', NOW())
    ON CONFLICT DO NOTHING
  `);

  console.log('✅ Data test berhasil di-inject ke database.');
  pool.end();
}
seedTestData().catch(console.error);
