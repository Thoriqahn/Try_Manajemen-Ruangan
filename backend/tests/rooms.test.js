import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateTokens } from '../src/utils/jwt';
import { dbGet } from '../src/config/database';

describe('Rooms API Endpoints', () => {
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

  it('should deny unauthenticated users from listing rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow authenticated users to list rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should deny room creation for regular users', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ 
        name: 'Test Room', 
        capacity: 10, 
        room_type: 'physical',
        building_id: 'b1',
        floor_id: 'f1',
        layouts: [{ type: 'Classroom', capacity: 10 }]
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow room creation for superadmin', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ 
        name: 'Super Room', 
        capacity: 20, 
        room_type: 'physical',
        building_id: 'b1',
        floor_id: 'f1',
        layouts: [{ type: 'Classroom', capacity: 20 }]
      });
      
    console.log(res.body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Super Room');
  });

  it('should reject invalid room type format (validation check)', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        name: 'Invalid Room', 
        capacity: 10, 
        room_type: 'magic' // Not in enum
      });

    expect(res.status).toBe(400); // Bad request due to validation
    expect(res.body.success).toBe(false);
  });

  describe('Room CRUD Operations', () => {
    let createdRoomId;

    it('should create a room to test CRUD', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'CRUD Test Room',
          capacity: 15,
          room_type: 'physical',
          building_id: 'b1',
          floor_id: 'f1',
          layouts: [{ type: 'U-Shape', capacity: 15 }]
        });
      
      expect(res.status).toBe(201);
      createdRoomId = res.body.data.id;
    });

    it('should allow authenticated users to get a specific room by ID', async () => {
      const res = await request(app)
        .get(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdRoomId);
      expect(res.body.data.name).toBe('CRUD Test Room');
    });

    it('should allow admin/superadmin to update a room', async () => {
      const res = await request(app)
        .put(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Updated CRUD Room',
          capacity: 25,
          room_type: 'physical',
          building_id: 'b1',
          floor_id: 'f1',
          layouts: [{ type: 'U-Shape', capacity: 25 }]
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify update
      const getRes = await request(app)
        .get(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getRes.body.data.name).toBe('Updated CRUD Room');
    });

    it('should deny regular users from updating a room', async () => {
      const res = await request(app)
        .put(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked Room',
          capacity: 999,
          room_type: 'physical',
          building_id: 'b1',
          floor_id: 'f1'
        });
      
      expect(res.status).toBe(403);
    });

    it('should return availability for a specific room and date', async () => {
      // Assuming GET /api/rooms/:id/availability?week=YYYY-MM-DD
      const date = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/rooms/${createdRoomId}/availability?week=${date}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.availability)).toBe(true);
      // It should return an array of availability for each day of the week
    });

    it('should return rooms filtered by capacity', async () => {
      const res = await request(app)
        .get('/api/rooms?capacity=1000') // extremely high capacity
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Should be empty because no room has 1000 capacity
    });

  describe('Room Image Upload', () => {
    it('should reject non-image file uploads', async () => {
      // Create a dummy PDF buffer
      const dummyPdf = Buffer.from('%PDF-1.4 dummy content');
      
      const res = await request(app)
        .post(`/api/rooms/${createdRoomId}/upload`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .attach('photo', dummyPdf, 'test.pdf');
      
      // Multer filter throws error if not image
      expect(res.status).toBeGreaterThanOrEqual(400); // 400 or 500
    });

    it('should accept valid image uploads', async () => {
      // Create a dummy JPG buffer
      const dummyJpg = Buffer.from('fake image data');
      
      const res = await request(app)
        .post(`/api/rooms/${createdRoomId}/upload`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .attach('photo', dummyJpg, { filename: 'test.jpg', contentType: 'image/jpeg' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toBeDefined();
    });
  });

  describe('Room Deletion', () => {
    it('should allow admin/superadmin to delete a room', async () => {
      const res = await request(app)
        .delete(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion (should return 404)
      const getRes = await request(app)
        .get(`/api/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(getRes.status).toBe(404);
    });
  });
  
  }); // End of Room CRUD Operations

});
