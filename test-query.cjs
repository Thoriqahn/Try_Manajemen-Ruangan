const { pool } = require('./backend/src/config/database');

async function test() {
  try {
    const id = 'bk-upcoming-1';
    const query = `
      SELECT b.id, b.room_id, b.status, b.meeting_type, b.created_at, r.name as room_name, r.approval_type, r.room_type 
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE r.name = 'TestRu1'
      ORDER BY b.created_at DESC
    `;
    const res = await pool.query(query);
    console.log("Result:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

test();
