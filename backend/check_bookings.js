const { pool } = require('./src/config/database');
pool.query("SELECT id, room_id, status, date, start_time, end_time FROM bookings ORDER BY created_at DESC LIMIT 5").then(res => {
  console.log(res.rows);
  process.exit(0);
});
