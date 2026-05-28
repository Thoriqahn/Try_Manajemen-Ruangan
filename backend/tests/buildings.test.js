import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';

describe('Buildings API Endpoints', () => {
  let userToken;
  let superadminToken;
  let testBuildingId;

  beforeAll(async () => {
    const regularUser = await dbGet("SELECT * FROM users WHERE role = 'USER' LIMIT 1");
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");

    userToken = generateTokens(regularUser).accessToken;
    superadminToken = generateTokens(superUser).accessToken;
  });

  it('should list buildings publicly (no auth required for listing)', async () => {
    const res = await request(app).get('/api/buildings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should deny building creation for regular users', async () => {
    const res = await request(app)
      .post('/api/buildings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'User Building', address: '123 Test St' });
    expect(res.status).toBe(403);
  });

  it('should allow superadmin to create a building', async () => {
    const res = await request(app)
      .post('/api/buildings')
      .set('Authorization', `Bearer ${superadminToken}`)
      .field('name', 'Test Super Building')
      .field('address', '123 Super St')
      .field('lat', -6.200000)
      .field('lng', 106.816666)
      .attach('image', Buffer.from('fake image content'), 'test.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    testBuildingId = res.body.data.id;
  });

  it('should allow superadmin to update a building', async () => {
    const res = await request(app)
      .put(`/api/buildings/${testBuildingId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .field('name', 'Updated Super Building')
      .field('lat', -6.200000)
      .field('lng', 106.816666);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Super Building');
  });

  it('should allow superadmin to create a floor in a building', async () => {
    const res = await request(app)
      .post(`/api/buildings/${testBuildingId}/floors`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Floor 1', level: 1 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should list floors of a building', async () => {
    const res = await request(app).get(`/api/buildings/${testBuildingId}/floors`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should allow superadmin to delete a building', async () => {
    // Delete floor first to maintain referential integrity (assuming cascading is handled or needed)
    // Actually the controller should handle it or the DB has ON DELETE CASCADE. Let's just delete the building.
    const res = await request(app)
      .delete(`/api/buildings/${testBuildingId}`)
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deletion
    const check = await request(app).get('/api/buildings');
    const exists = check.body.data.find(b => b.id === testBuildingId);
    expect(exists).toBeUndefined();
  });
});
