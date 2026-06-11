import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet, dbRun } from '../src/config/database';

describe('E2E Workspace Flow (Super Admin -> Admin -> User)', () => {
  let superadminToken;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let testRoomId;
  let requestId;
  const desk1 = 'E2E-DESK-01';
  const desk2 = 'E2E-DESK-02';

  beforeAll(async () => {
    // 1. Dapatkan superadmin
    const superUser = await dbGet("SELECT * FROM users WHERE role = 'SUPERADMIN' LIMIT 1");
    superadminToken = generateTokens(superUser).accessToken;

    // 2. Buat user dummy untuk E2E
    const adminEmail = `admin_e2e_${Date.now()}@oikn.go.id`;
    const userEmail = `user_e2e_${Date.now()}@oikn.go.id`;
    
    await dbRun("INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'USER', 'active')", ['u-e2e-admin', 'E2E Admin', adminEmail, 'hashedpw']);
    await dbRun("INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'USER', 'active')", ['u-e2e-user', 'E2E User', userEmail, 'hashedpw']);
    
    adminUser = await dbGet("SELECT * FROM users WHERE id = 'u-e2e-admin'");
    regularUser = await dbGet("SELECT * FROM users WHERE id = 'u-e2e-user'");
    userToken = generateTokens(regularUser).accessToken;

    // 3. Buat Ruangan Workspace E2E via API
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'E2E Workspace Room',
        capacity: 10,
        room_type: 'physical',
        jenis_manajemen_ruang: 'WORKSPACE',
        total_meja_kerja: 10,
        building_id: 'b1',
        floor_id: 'f1',
        layouts: [{ type: 'Workspace', capacity: 10 }]
      });
    testRoomId = res.body.data.id;

    // 4. Masukkan Meja
    await dbRun("INSERT INTO workspace_desks (desk_id, room_id, status) VALUES ($1, $2, 'VACANT')", [desk1, testRoomId]);
    await dbRun("INSERT INTO workspace_desks (desk_id, room_id, status) VALUES ($1, $2, 'VACANT')", [desk2, testRoomId]);
  });

  afterAll(async () => {
    // Cleanup data
    await dbRun("DELETE FROM room_assignments WHERE user_id = 'u-e2e-admin'");
    await workspaceCleanup();
    await dbRun("DELETE FROM users WHERE id IN ('u-e2e-admin', 'u-e2e-user')");
    await dbRun("DELETE FROM rooms WHERE id = $1", [testRoomId]);
  });

  async function workspaceCleanup() {
    await dbRun("DELETE FROM workspace_desks WHERE room_id = $1", [testRoomId]);
  }

  it('Fase 1: Super Admin memberikan akses ADMIN_KERJA dan menugaskan ruangan', async () => {
    // a. Update role to ADMIN_KERJA
    const resRole = await request(app)
      .put(`/api/users/${adminUser.id}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'ADMIN_KERJA' });
    expect(resRole.status).toBe(200);

    // b. Refresh adminUser & token
    adminUser = await dbGet("SELECT * FROM users WHERE id = 'u-e2e-admin'");
    adminToken = generateTokens(adminUser).accessToken;

    // c. Assign room
    const resRoom = await request(app)
      .put(`/api/users/${adminUser.id}/room-assignment`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ roomIds: [testRoomId] });
    expect(resRoom.status).toBe(200);
  });

  it('Fase 2: User mengajukan meja kerja (Request)', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces/assignments/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        room_id: testRoomId,
        desk_id: desk1,
        rationale: 'E2E Request'
      });
    expect(res.status).toBe(201);
    requestId = res.body.data.request_id;
  });

  it('Fase 3: Admin Ruangan menyetujui permintaan meja (Approve)', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/assignments/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`); // using adminToken!
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Verify desk status
    const desk = await dbGet("SELECT status FROM workspace_desks WHERE desk_id = $1 AND room_id = $2", [desk1, testRoomId]);
    expect(desk.status).toBe('OCCUPIED');
  });

  it('Fase 4: Admin merelokasi meja User (Mutasi)', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces/assignments/relocate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        current_desk_id: desk1,
        target_desk_id: desk2,
        rationale: 'E2E Relocation'
      });
    expect(res.status).toBe(200);
    
    // Verify desk statuses
    const d1 = await dbGet("SELECT status FROM workspace_desks WHERE desk_id = $1 AND room_id = $2", [desk1, testRoomId]);
    expect(d1.status).toBe('VACANT');
    const d2 = await dbGet("SELECT status FROM workspace_desks WHERE desk_id = $1 AND room_id = $2", [desk2, testRoomId]);
    expect(d2.status).toBe('OCCUPIED');
  });

  it('Fase 5: Admin mencabut akses meja User (Revoke)', async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/assignments/${testRoomId}/${desk2}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    
    // Verify desk status is VACANT
    const d2 = await dbGet("SELECT status FROM workspace_desks WHERE desk_id = $1 AND room_id = $2", [desk2, testRoomId]);
    expect(d2.status).toBe('VACANT');
  });
  it('Fase 6: Super Admin mengubah role menjadi ADMIN (Gabungan) dan verifikasi akses baca', async () => {
    // a. Update role to ADMIN
    const resRole = await request(app)
      .put(`/api/users/${adminUser.id}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'ADMIN' });
    expect(resRole.status).toBe(200);

    // b. Refresh adminUser & token
    adminUser = await dbGet("SELECT * FROM users WHERE id = 'u-e2e-admin'");
    adminToken = generateTokens(adminUser).accessToken;

    // c. Verifikasi bisa akses requests
    const resReq = await request(app)
      .get('/api/v1/workspaces/assignments/requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resReq.status).toBe(200);
    expect(resReq.body.success).toBe(true);

    // d. Verifikasi bisa baca kelola workspace (semua penugasan)
    const resAll = await request(app)
      .get('/api/v1/workspaces/assignments/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
  });
});
