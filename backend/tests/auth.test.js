import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { dbRun, dbGet } from '../src/config/database';

describe('Auth API Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: 'testuser@oikn.go.id',
    password: 'Password123!'
  };

  it('should register a new user successfully', async () => {
    // Clean up test user if exists
    await dbRun('DELETE FROM users WHERE email = $1', [testUser.email]);

    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Registrasi berhasil');
    expect(res.body.userId).toBeDefined();

    // Verify DB
    const user = await dbGet('SELECT * FROM users WHERE email = $1', [testUser.email]);
    expect(user).toBeDefined();
    expect(user.status).toBe('pending'); // User starts as pending
    expect(user.password_hash).not.toBe(testUser.password); // Should be hashed
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'invalid-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for unverified user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Akun belum diverifikasi');
  });

  it('should login successfully for active user', async () => {
    // Force active status for testing login
    await dbRun('UPDATE users SET status = $1 WHERE email = $2', ['active', testUser.email]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Email atau password salah');
  });
});
