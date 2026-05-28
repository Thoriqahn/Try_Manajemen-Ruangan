import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet } from '../src/config/database';

describe('Token API Endpoints', () => {
  let superadminToken;
  let userToken;
  let generatedTokenId;

  beforeAll(async () => {
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    superadminToken = generateTokens(superUser).accessToken;
    userToken = generateTokens(regularUser).accessToken;
  });

  describe('POST /api/tokens', () => {
    it('should deny token generation for regular users', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Token' });
      expect(res.status).toBe(403);
    });

    it('should allow superadmin to generate token', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'Test Token', access_level: 'read' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.clientId).toBeDefined();
      
      generatedTokenId = res.body.data.id;
    });

    it('should reject token generation without name', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ access_level: 'read' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tokens', () => {
    it('should list tokens for superadmin', async () => {
      const res = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Ensure secret is NOT returned in the list
      expect(res.body.data[0].secret).toBeUndefined();
    });
  });

  describe('GET /api/tokens/logs', () => {
    it('should fetch token usage logs for superadmin', async () => {
      const res = await request(app)
        .get('/api/tokens/logs')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rpmData).toBeDefined();
    });
  });

  describe('DELETE /api/tokens/:id', () => {
    it('should allow superadmin to revoke a token', async () => {
      const res = await request(app)
        .delete(`/api/tokens/${generatedTokenId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify status changed to revoked
      const token = await dbGet('SELECT status FROM api_tokens WHERE id = $1', [generatedTokenId]);
      expect(token.status).toBe('revoked');
    });
  });
});
