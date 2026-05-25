const { pool } = require('./backend/src/config/database');
const crypto = require('crypto');

async function seed() {
  const bookingId = 'bk-ongoing-1'; // Use the ongoing booking instead
  try {
    await pool.query(`
      INSERT INTO meeting_attendees (id, booking_id, user_name, email, institution, position, signature, attendance_type, scanned_at)
      VALUES 
      ($1, $2, 'Ahmad (Eksternal Online)', 'ahmad@ptmaju.com', 'PT Maju Bersama', 'Direktur', 'sig1', 'online', NOW()),
      ($3, $2, 'Siti (Eksternal Offline)', 'siti@cvjaya.com', 'CV Jaya Abadi', 'Manajer', 'sig2', 'offline', NOW() - interval '10 minutes')
    `, [crypto.randomUUID(), bookingId, crypto.randomUUID()]);
    console.log("Seeded successfully");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
seed();
