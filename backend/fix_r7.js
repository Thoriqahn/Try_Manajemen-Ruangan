const { pool } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function fix() {
  try {
    const r7Facilities = [
      ['tv_monitor', 2], 
      ['projector', 0], 
      ['video_conference', 0], 
      ['sound_system', 0], 
      ['whiteboard', 4], 
      ['outlet', 60]
    ];
    for (const [type, qty] of r7Facilities) {
      await pool.query('INSERT INTO room_facilities (id, room_id, facility_type, quantity) VALUES ($1, $2, $3, $4)', [uuidv4(), 'r7', type, qty]);
    }
    await pool.query('INSERT INTO room_layouts (id, room_id, layout_type, capacity) VALUES ($1, $2, $3, $4)', [uuidv4(), 'r7', 'Open Plan Workspace', 30]);
    console.log('Fixed missing information for r7');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
fix();
