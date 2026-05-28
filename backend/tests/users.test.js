import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';

describe('Users API Endpoints', () => {
  let userToken;
  let superadminToken;
  let testUserId;
  let adminUserId;
  let dummyUserId;

  beforeAll(async () => {
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    const adminUser = await dbGet("SELECT * FROM users WHERE role = 'ADMIN_KERJA' OR role = 'ADMIN_RAPAT' LIMIT 1");
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");

    userToken = generateTokens(regularUser).accessToken;
    superadminToken = generateTokens(superUser).accessToken;
    testUserId = regularUser.id;
    adminUserId = adminUser.id;

    // Create a dummy user specifically for mutating role and status
    dummyUserId = 'dummy-user-123';
    await dbRun("INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1, 'Dummy', 'dummy@test.com', 'hash', 'USER', 'active') ON CONFLICT DO NOTHING", [dummyUserId]);
  });

  it('should deny non-superadmin from listing users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('should allow superadmin to list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should allow superadmin to get user details', async () => {
    const res = await request(app)
      .get(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testUserId);
  });

  it('should allow superadmin to update user role', async () => {
    // Update role
    const res = await request(app)
      .put(`/api/users/${dummyUserId}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'ADMIN_KERJA' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Revert role back to USER
    await request(app)
      .put(`/api/users/${dummyUserId}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'USER' });
  });

  it('should allow superadmin to update user status', async () => {
    // Suspend user
    const res = await request(app)
      .put(`/api/users/${dummyUserId}/status`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Revert status to active
    await request(app)
      .put(`/api/users/${dummyUserId}/status`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ status: 'active' });
  });

  it('should allow superadmin to update admin user room assignment', async () => {
    const res = await request(app)
      .put(`/api/users/${adminUserId}/room-assignment`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ roomIds: ['r1'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
