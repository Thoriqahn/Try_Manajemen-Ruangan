const { pool } = require('./backend/src/config/database');

// A 5x5 blue square as a dummy signature
const dummySignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

async function update() {
  const bookingId = 'bk-ongoing-1';
  try {
    await pool.query(`
      UPDATE meeting_attendees 
      SET signature = $1 
      WHERE booking_id = $2 AND (signature = 'sig1' OR signature = 'sig2')
    `, [dummySignature, bookingId]);
    console.log("Signatures updated successfully to base64 images.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
update();
