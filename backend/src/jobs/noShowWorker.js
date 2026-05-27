const { getClient, dbAll } = require('../config/database');
const { deleteZoomMeeting } = require('../utils/zoom');
const { randomUUID: uuidv4 } = require('crypto');

async function processNoShows() {
  const now = new Date();
  console.log(`[SYSTEM WORKER] Running ghost booking purge scan at ${now.toISOString()}...`);

  try {
    // Find all active bookings that are confirmed, not checked in, and not soft deleted
    const bookings = await dbAll(
      `SELECT id, room_id, user_id, date, start_time, end_time, status, is_checked_in, zoom_meeting_id, agenda
       FROM bookings
       WHERE status = 'confirmed' AND is_checked_in = FALSE AND deleted_at IS NULL`
    );

    const expiredBookings = bookings.filter(b => {
      // Reconstruct start date/time in local timezone (booking times are stored in local WITA time)
      const bookingStart = new Date(`${b.date}T${b.start_time}:00`);
      const expirationTime = new Date(bookingStart.getTime() + 15 * 60 * 1000); // 15 mins late
      return now > expirationTime;
    });

    if (expiredBookings.length === 0) {
      return;
    }

    console.log(`[SYSTEM WORKER] Found ${expiredBookings.length} expired ghost bookings to purge.`);

    for (const b of expiredBookings) {
      console.log(`[SYSTEM WORKER] Purging ghost booking ${b.id} for room ${b.room_id} (Agenda: "${b.agenda}")...`);
      
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Step 1: Update status to CANCELLED_NOSHOW
        await client.query(
          `UPDATE bookings
           SET status = 'CANCELLED_NOSHOW'
           WHERE id = $1`,
          [b.id]
        );

        // Step 2: Log to global_audit_trail
        const auditId = uuidv4();
        const payload = JSON.stringify({
          booking_id: b.id,
          room_id: b.room_id,
          user_id: b.user_id,
          agenda: b.agenda,
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          old_status: b.status,
          new_status: 'CANCELLED_NOSHOW',
          zoom_meeting_id: b.zoom_meeting_id
        });

        await client.query(
          `INSERT INTO global_audit_trail (id, actor_id, action_type, payload)
           VALUES ($1, $2, $3, $4)`,
          [auditId, 'SYSTEM', 'SYSTEM_AUTO_CANCEL_NOSHOW', payload]
        );

        await client.query('COMMIT');
        console.log(`[SYSTEM WORKER] Database state successfully updated and committed for booking ${b.id}.`);

      } catch (dbErr) {
        await client.query('ROLLBACK');
        console.error(`[SYSTEM WORKER] Database transaction failed for booking ${b.id}:`, dbErr.message);
        continue; // Go to next booking, do not halt the loop
      } finally {
        client.release();
      }

      // Step 3: Delete Zoom meeting asynchronously with local error-isolation
      if (b.zoom_meeting_id) {
        try {
          console.log(`[SYSTEM WORKER] Deleting associated Zoom meeting ${b.zoom_meeting_id} for booking ${b.id}...`);
          await deleteZoomMeeting(b.zoom_meeting_id);
          console.log(`[SYSTEM WORKER] Zoom meeting ${b.zoom_meeting_id} successfully deleted.`);
        } catch (zoomErr) {
          // Log the Zoom API error but do not halt the loop or rollback database update
          console.error(`[SYSTEM WORKER] Zoom API deletion failed for meeting ${b.zoom_meeting_id}:`, zoomErr.message);
        }
      }
    }

  } catch (err) {
    console.error('[SYSTEM WORKER] Error in processNoShows run:', err.message);
  }
}

let intervalId = null;

function startNoShowWorker() {
  if (intervalId) return;
  // Run once immediately on start
  processNoShows();
  // Set interval to run every 1 minute (60,000 milliseconds)
  intervalId = setInterval(processNoShows, 60 * 1000);
  console.log('[SYSTEM WORKER] Ghost booking worker successfully started at 1-minute interval granularity.');
}

function stopNoShowWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[SYSTEM WORKER] Ghost booking worker stopped.');
  }
}

module.exports = { startNoShowWorker, stopNoShowWorker, processNoShows };
