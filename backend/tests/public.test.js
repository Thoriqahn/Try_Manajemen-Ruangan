import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { dbGet, dbRun } from '../src/config/database';
import { generateTokens } from '../src/utils/jwt';

describe('Public API Endpoints', () => {
  let roomId;
  let bookingId;
  let superadminToken;
  let userToken;
  let qrToken;

  beforeAll(async () => {
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    superadminToken = generateTokens(superUser).accessToken;
    userToken = generateTokens(regularUser).accessToken;

    // 1. Create room
    const roomRes = await request(app).post('/api/rooms')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'TV Display Room', capacity: 10, room_type: 'physical', building_id: 'b1', floor_id: 'f1', layouts: [{ type: 'Classroom', capacity: 10 }] });
    roomId = roomRes.body.data.id;
    qrToken = roomRes.body.data.qr_token;

    // 2. Create ongoing booking (from 1 hour ago to 1 hour from now)
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const start = new Date(now.getTime() - 60 * 60000).toTimeString().substring(0,5);
    const end = new Date(now.getTime() + 60 * 60000).toTimeString().substring(0,5);

    const bookingRes = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: roomId, date: todayStr, start_time: start, end_time: end, agenda: 'Public Meeting', meeting_type: 'offline' });
    bookingId = bookingRes.body.data.id;

    // Check-in to make it ongoing
    await request(app).post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ room_id: roomId, scanned_qr_token: qrToken });
  });

  describe('GET /api/public/bookings/:id', () => {
    it('should return public booking info without auth', async () => {
      const res = await request(app).get(`/api/public/bookings/${bookingId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agenda).toBe('Public Meeting');
      expect(res.body.data.host_name).toBeDefined(); // sensitive data like email shouldn't be here ideally, but we check what it returns
    });

    it('should return 404 for invalid booking ID', async () => {
      const res = await request(app).get(`/api/public/bookings/invalid-id`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/public/qr/:token', () => {
    it('should find active booking by qr token', async () => {
      const res = await request(app).get(`/api/public/qr/${qrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bookingId).toBe(bookingId);
    });

    it('should return 404 if qr token is invalid', async () => {
      const res = await request(app).get(`/api/public/qr/invalid-token`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/public/attendances/:bookingId', () => {
    it('should reject attendance outside of time window', async () => {
      // Modify booking to be in the past to test time window validation
      await dbRun("UPDATE bookings SET date = '2020-01-01' WHERE id = $1", [bookingId]);
      
      const res = await request(app).post(`/api/public/attendances/${bookingId}`)
        .send({ name: 'Guest', email: 'guest@test.com', institution: 'OIKN', position: 'Staff' });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('hanya dapat dilakukan pada hari pelaksanaan');
      
      // Restore booking
      const todayStr = new Date().toISOString().split('T')[0];
      await dbRun("UPDATE bookings SET date = $1 WHERE id = $2", [todayStr, bookingId]);
    });
  });
});
