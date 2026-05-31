const { pool } = require('./src/config/database');
pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'date'").then(res => {
  console.log(res.rows);
  process.exit(0);
});
