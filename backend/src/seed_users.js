const bcrypt = require('bcryptjs');
const { dbRun } = require('./config/database');
const { randomUUID: uuidv4 } = require('crypto');

async function seed() {
  console.log('Seeding extra demo users...');
  const hash = await bcrypt.hash('password123!', 10);
  
  const users = [
    { id: 'u-uji1', name: 'User Ujicoba 1', email: 'ujicoba1@mail.com', role: 'USER', status: 'active' },
    { id: 'u-uji2', name: 'User Ujicoba 2', email: 'ujicoba2@mail.com', role: 'USER', status: 'active' },
    { id: 'u-adma', name: 'Admin Rapat A', email: 'admin_a@mail.com', role: 'ADMIN_RAPAT', status: 'active' },
  ];

  for (const u of users) {
    try {
      await dbRun(
        `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [u.id, u.name, u.email, hash, u.role, u.status]
      );
      console.log(`✅ Inserted ${u.name} (${u.email})`);
    } catch (err) {
      console.error(`❌ Failed to insert ${u.email}:`, err.message);
    }
  }

  process.exit(0);
}

seed();
