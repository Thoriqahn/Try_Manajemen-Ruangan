const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.NODE_ENV === 'test' ? 'menara_db_test' : (process.env.DB_NAME || 'menara_db'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Promisified helpers matching the old sqlite interface
// NOTE: SQL must use $1, $2, ... parameter placeholders (not ?)

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE).
 * Returns { rows, rowCount }.
 */
const dbRun = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    console.error('[DATABASE ERROR in dbRun]', err.message);
    console.error('[QUERY]', sql);
    console.error('[PARAMS]', params);
    throw err;
  }
};

/**
 * Execute a query and return the first row, or undefined.
 */
const dbGet = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  } catch (err) {
    console.error('[DATABASE ERROR in dbGet]', err.message);
    console.error('[QUERY]', sql);
    console.error('[PARAMS]', params);
    throw err;
  }
};

/**
 * Execute a query and return all rows.
 */
const dbAll = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('[DATABASE ERROR in dbAll]', err.message);
    console.error('[QUERY]', sql);
    console.error('[PARAMS]', params);
    throw err;
  }
};

/**
 * Get a client from the pool for transaction support.
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('INSERT ...', [...]);
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
const getClient = () => pool.connect();

module.exports = { pool, dbRun, dbGet, dbAll, getClient };
