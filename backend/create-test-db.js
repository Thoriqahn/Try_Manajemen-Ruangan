const { Client } = require('pg');
require('dotenv').config();

async function createTestDb() {
  // Connect to the default 'postgres' database to create a new database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres', // Default maintenance DB
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL default database.');

    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = 'menara_db_test'`);
    
    if (res.rowCount === 0) {
      console.log('Creating database "menara_db_test"...');
      await client.query('CREATE DATABASE menara_db_test');
      console.log('✅ Database "menara_db_test" created successfully!');
    } else {
      console.log('✅ Database "menara_db_test" already exists.');
    }
  } catch (error) {
    console.error('❌ Error creating database:', error);
  } finally {
    await client.end();
  }
}

createTestDb();
