const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, pool } = require('./src/config/database');

async function seedUsers() {
  try {
    const hash = await bcrypt.hash('password123!', 10);
    
    // User 1
    const u1 = uuidv4();
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u1, 'Pengguna Uji Coba 1', 'user1@oikn.go.id', hash, 'USER', 'active']
    );
    console.log('✅ Created User 1: user1@oikn.go.id / password123!');

    // User 2
    const u2 = uuidv4();
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u2, 'Pengguna Uji Coba 2', 'user2@oikn.go.id', hash, 'USER', 'active']
    );
    console.log('✅ Created User 2: user2@oikn.go.id / password123!');

    // User 3
    const u3 = uuidv4();
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u3, 'Dimas Anggara', 'dimas@oikn.go.id', hash, 'USER', 'active']
    );
    console.log('✅ Created User 3: dimas@oikn.go.id / password123!');

    // User 4
    const u4 = uuidv4();
    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u4, 'Rina Melati', 'rina@oikn.go.id', hash, 'USER', 'active']
    );
    console.log('✅ Created User 4: rina@oikn.go.id / password123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

seedUsers();
