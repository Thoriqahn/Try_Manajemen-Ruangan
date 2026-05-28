import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet } from '../src/config/database';

describe('System Support API Endpoints', () => {
  let userToken;
  let adminToken;
  let superadminToken;

  beforeAll(async () => {
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    const adminUser = await dbGet("SELECT * FROM users WHERE role = 'ADMIN_RAPAT' LIMIT 1");
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");

    userToken = generateTokens(regularUser).accessToken;
    adminToken = generateTokens(adminUser).accessToken;
    superadminToken = generateTokens(superUser).accessToken;
  });

  describe('Stats API', () => {
    it('should deny stats access to regular users', async () => {
      const res = await request(app)
        .get('/api/stats/admin')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow admin to get admin stats', async () => {
      const res = await request(app)
        .get('/api/stats/admin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should allow superadmin to get global stats', async () => {
      const res = await request(app)
        .get('/api/stats/global')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Policy API', () => {
    it('should allow any user to get policy', async () => {
      const res = await request(app)
        .get('/api/policy')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should allow superadmin to update policy', async () => {
      const res = await request(app)
        .put('/api/policy')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ max_booking_duration: 300 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow superadmin to add blackout date', async () => {
      const date = '2027-01-01';
      const res = await request(app)
        .post('/api/policy/blackout')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ date, reason: 'Tahun Baru' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow superadmin to remove blackout date', async () => {
      const date = '2027-01-01';
      const res = await request(app)
        .delete(`/api/policy/blackout/${date}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Audit API', () => {
    it('should deny audit log access to regular users', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow superadmin to view audit logs', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
