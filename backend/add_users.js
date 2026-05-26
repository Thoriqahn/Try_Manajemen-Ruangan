const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');

async function addUsers() {
  const hash = await bcrypt.hash('password123!', 10);
  const users = [
    { id: 'u-admin5', name: 'Fajar Nugroho, S.T.', email: 'fajar.nugroho@oikn.go.id', role: 'ADMIN_RAPAT' },
    { id: 'u-user6', name: 'Dimas Anggara', email: 'dimas@oikn.go.id', role: 'USER' },
    { id: 'u-user7', name: 'Rina Melati', email: 'rina@oikn.go.id', role: 'USER' },
  ];
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, status=EXCLUDED.status`,
      [u.id, u.name, u.email, hash, u.role, 'active']
    );
    console.log('✅', u.name, '(' + u.email + ') - Role:', u.role);
  }
  pool.end();
}

addUsers().catch(e => { console.error('❌', e.message); process.exit(1); });
