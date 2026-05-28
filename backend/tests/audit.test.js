import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';

describe('Audit API Endpoints', () => {
  let superadminToken;

  beforeAll(async () => {
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
    superadminToken = generateTokens(superUser).accessToken;

    // Seed an audit log for searching
    await dbRun(`
      INSERT INTO audit_logs (id, actor_id, actor_name, action, resource, ip)
      VALUES (gen_random_uuid(), $1, $2, 'TEST_SEARCH', 'Resource X', '127.0.0.1')
    `, [superUser.id, superUser.name]);
  });

  describe('GET /api/audit (Search & Pagination)', () => {
    it('should filter audit logs by action', async () => {
      const res = await request(app)
        .get('/api/audit?action=TEST_SEARCH')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].action).toBe('TEST_SEARCH');
    });

    it('should filter audit logs by actor name', async () => {
      const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
      const res = await request(app)
        .get(`/api/audit?actor=${superUser.name}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].actor_name).toContain(superUser.name);
    });

    it('should search audit logs by generic search param', async () => {
      const res = await request(app)
        .get('/api/audit?search=Resource X')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].resource).toBe('Resource X');
    });

    it('should handle pagination correctly', async () => {
      const res = await request(app)
        .get('/api/audit?limit=2&offset=0')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(2);
    });
  });
});
