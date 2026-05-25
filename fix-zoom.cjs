const { pool } = require('./backend/src/config/database');

async function fix() {
  try {
    await pool.query(`
      INSERT INTO zoom_accounts (email, display_name, is_verified, license_type, status)
      VALUES 
      ('sari.dewi@oikn.go.id', 'Sari Dewi (Virtual Room 1)', true, 'licensed', 'active'),
      ('budi.santoso@oikn.go.id', 'Budi Santoso (Virtual Room 2)', true, 'licensed', 'active')
      ON CONFLICT (email) DO UPDATE SET is_verified = true, status = 'active'
    `);
    console.log("Inserted mock Zoom accounts successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fix();
