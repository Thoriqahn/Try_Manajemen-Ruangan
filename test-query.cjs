const { pool } = require('./backend/src/config/database');

async function test() {
  try {
    const id = 'bk-upcoming-1';
    const query = `
      SELECT b.id, b.agenda, b.date, b.start_time, b.end_time, b.meeting_type,
             u.name as host_name,
             r.name as room_name, r.building_id
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;
    const res = await pool.query(query, [id]);
    console.log("Result:", res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

test();
