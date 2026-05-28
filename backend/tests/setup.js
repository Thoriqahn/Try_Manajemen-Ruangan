import { initSchema, seedData } from '../src/config/migrate';
import { pool } from '../src/config/database';

export async function setup() {
  process.env.NODE_ENV = 'test';
  
  try {
    console.log('Running test database migrations globally...');
    await initSchema();
    await seedData();
    console.log('Test database prepared globally.');
  } catch (error) {
    console.error('Failed to prepare test database:', error);
    process.exit(1);
  }
}

export async function teardown() {
  await pool.end();
}
