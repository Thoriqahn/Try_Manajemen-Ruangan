import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';



describe('Zoom API Endpoints', () => {
  let userToken;
  let superadminToken;
  let testAccountId;

  beforeAll(async () => {
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");

    userToken = generateTokens(regularUser).accessToken;
    superadminToken = generateTokens(superUser).accessToken;
  });

  it('should deny zoom routes for non-superadmin', async () => {
    const res = await request(app)
      .get('/api/zoom/config')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('should allow superadmin to get zoom config', async () => {
    const res = await request(app)
      .get('/api/zoom/config')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow superadmin to save zoom config', async () => {
    const res = await request(app)
      .put('/api/zoom/config')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ client_id: 'test_client', client_secret: 'secret123', account_id: 'test_acc' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow superadmin to test zoom connection', async () => {
    const res = await request(app)
      .post('/api/zoom/test-connection')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('berhasil');
  });

  it('should allow superadmin to add a zoom account', async () => {
    const res = await request(app)
      .post('/api/zoom/accounts')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ email: 'host.test@oikn.go.id', display_name: 'Test Host' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    testAccountId = res.body.data.id;
  });

  it('should list zoom accounts', async () => {
    const res = await request(app)
      .get('/api/zoom/accounts')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should verify zoom account', async () => {
    const res = await request(app)
      .post(`/api/zoom/accounts/${testAccountId}/verify`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_licensed).toBe(true);
  });

  it('should allow superadmin to delete zoom account', async () => {
    const res = await request(app)
      .delete(`/api/zoom/accounts/${testAccountId}`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
