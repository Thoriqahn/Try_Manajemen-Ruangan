require('dotenv').config();
const { pool } = require('./src/config/database');

async function updateDb() {
  try {
    console.log('Dropping old constraint...');
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    
    console.log('Adding new constraint...');
    await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'SUPERADMIN', 'ADMIN_RAPAT', 'ADMIN_KERJA', 'ADMIN'));");
    
    console.log('Success!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
updateDb();
