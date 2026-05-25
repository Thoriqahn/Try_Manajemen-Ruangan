const { pool } = require('./backend/src/config/database');

async function test() {
  try {
    const res = await pool.query("SELECT * FROM zoom_accounts");
    console.log("All Zoom Accounts:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

test();
