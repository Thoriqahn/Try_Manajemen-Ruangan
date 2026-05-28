import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';

describe('Policy API Endpoints (Advanced)', () => {
  let superadminToken;
  let userToken;

  beforeAll(async () => {
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    superadminToken = generateTokens(superUser).accessToken;
    userToken = generateTokens(regularUser).accessToken;
  });

  describe('Blackout Auto-Cancel', () => {
    it('should auto-cancel existing bookings when a blackout date is added', async () => {
      // 1. Create a room
      const roomRes = await request(app).post('/api/rooms')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'Blackout Room', capacity: 10, room_type: 'physical', building_id: 'b1', floor_id: 'f1', layouts: [{ type: 'Classroom', capacity: 10 }] });
      const roomId = roomRes.body.data.id;

      // 2. Create a booking for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const bookingRes = await request(app).post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ room_id: roomId, date: tomorrowStr, start_time: '10:00', end_time: '11:00', agenda: 'Will be auto cancelled', meeting_type: 'offline' });
      const bookingId = bookingRes.body.data.id;

      // 3. Add blackout date for tomorrow
      const blackoutRes = await request(app).post('/api/policy/blackout')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ date: tomorrowStr, reason: 'Maintenance' });
      expect(blackoutRes.status).toBe(201);
      expect(blackoutRes.body.message).toContain('dibatalkan');

      // 4. Verify booking is cancelled
      const fetchBooking = await dbGet('SELECT status, cancel_reason FROM bookings WHERE id = $1', [bookingId]);
      expect(fetchBooking.status).toBe('cancelled');
      expect(fetchBooking.cancel_reason).toBe('Maintenance');
      
      // Cleanup blackout date so it doesn't affect other tests
      await request(app).delete(`/api/policy/blackout/${tomorrowStr}`).set('Authorization', `Bearer ${superadminToken}`);
    });
  });
});
