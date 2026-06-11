require('dotenv').config();
const { pool } = require('./src/config/database');
pool.query('SELECT name, email, role FROM users LIMIT 10', (err, res) => {
  if (err) console.error(err);
  else console.table(res.rows);
  pool.end();
});
