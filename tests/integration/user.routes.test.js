// @ts-nocheck
/**
 * User Routes Integration Tests
 * Tests for user API endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../server');
const User = require('../../models/User');
const { 
  connectDB, 
  disconnectDB, 
  clearDatabase 
} = require('../setup/testDatabase');
const { 
  generateTestUser, 
  generateTestAdmin,
  generateTestToken,
  authenticatedRequest,
  maliciousPayloads 
} = require('../setup/testUtils');

describe('User Routes', () => {
  let authToken;
  let adminToken;
  let testUser;
  let testAdmin;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test user
    testUser = await User.create(generateTestUser());
    authToken = generateTestToken(testUser._id.toString(), testUser.role);

    // Create test admin
    testAdmin = await User.create(generateTestAdmin());
    adminToken = generateTestToken(testAdmin._id.toString(), testAdmin.role);
  });

  describe('GET /api/users/profile', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', testUser._id.toString());
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = generateTestToken(testUser._id.toString(), testUser.role, '-1h');
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update current user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+26612345678',
        bio: 'New bio text',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updates.firstName);
      expect(response.body.data.lastName).toBe(updates.lastName);
      expect(response.body.data.phone).toBe(updates.phone);
      expect(response.body.data.bio).toBe(updates.bio);

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.firstName).toBe(updates.firstName);
      expect(updatedUser.bio).toBe(updates.bio);
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          phone: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should sanitize XSS attempts', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: maliciousPayloads.xssPayloads[0],
          bio: maliciousPayloads.xssPayloads[1],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).not.toContain('<script>');
      expect(response.body.data.bio).not.toContain('onerror=');
    });

    it('should reject large payloads', async () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`field${i}`] = 'x'.repeat(100);
      }

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData);

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID (self)', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testUser._id.toString());
    });

    it('should get user by ID (admin)', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny access to other users', async () => {
      const otherUser = await User.create(generateTestUser());
      const otherToken = generateTestToken(otherUser._id.toString(), otherUser.role);

      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user (self)', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'SelfUpdated',
          phone: '+26687654321',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('SelfUpdated');
    });

    it('should update user (admin)', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'AdminUpdated',
          role: 'student',
          isVerified: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('AdminUpdated');
      expect(response.body.data.role).toBe('student');
      expect(response.body.data.isVerified).toBe(true);
    });

    it('should prevent non-admin from changing role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'admin',
          isVerified: true,
        });

      expect(response.status).toBe(200);
      
      // Verify role didn't change
      const user = await User.findById(testUser._id);
      expect(user.role).toBe('user');
      expect(user.isVerified).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user (admin)', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is deleted/deactivated
      const deletedUser = await User.findById(testUser._id);
      if (process.env.SOFT_DELETE === 'true') {
        expect(deletedUser.isActive).toBe(false);
      } else {
        expect(deletedUser).toBeNull();
      }
    });

    it('should prevent self-deletion', async () => {
      const response = await request(app)
        .delete(`/api/users/${testAdmin._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot delete your own');
    });

    it('should deny non-admin deletion', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/users/change-password', () => {
    it('should change password with valid credentials', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: generateTestUser().password,
          newPassword: 'NewPass@123',
          confirmPassword: 'NewPass@123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPass@123',
          newPassword: 'NewPass@123',
          confirmPassword: 'NewPass@123',
        });

      expect(response.status).toBe(401);
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: generateTestUser().password,
          newPassword: 'weak',
          confirmPassword: 'weak',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users (admin only)', () => {
    it('should list all users for admin', async () => {
      // Create additional users
      await Promise.all([
        User.create(generateTestUser()),
        User.create(generateTestUser()),
        User.create(generateTestUser()),
      ]);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(4); // testUser + 3 new
    });

    it('should support filtering and pagination', async () => {
      await Promise.all([
        User.create(generateTestUser({ role: 'student' })),
        User.create(generateTestUser({ role: 'student' })),
        User.create(generateTestUser({ role: 'company' })),
      ]);

      const response = await request(app)
        .get('/api/users?role=student&page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every(u => u.role === 'student')).toBe(true);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should deny non-admin access', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/users/statistics (admin only)', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('byRole');
      expect(response.body.data.overview.total).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit requests', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(403); // CSRF token missing
    });

    it('should accept valid CSRF token', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`);

      const csrfToken = csrfResponse.body.csrfToken;

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });
});