const { pool } = require('./backend/src/config/database');

async function test() {
  try {
    const res = await pool.query("SELECT * FROM zoom_accounts WHERE status = 'active' AND is_verified = TRUE");
    console.log("Active Zoom Accounts:", res.rows);

    const bookings = await pool.query("SELECT id, date, start_time, end_time, status, zoom_host_email FROM bookings WHERE zoom_host_email IS NOT NULL");
    console.log("Bookings with Zoom:", bookings.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

test();
