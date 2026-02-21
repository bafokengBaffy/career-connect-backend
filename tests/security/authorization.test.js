// @ts-nocheck
/**
 * Authorization Security Tests
 * Tests for authorization vulnerabilities
 */

const request = require('supertest');
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
  generateTestToken 
} = require('../setup/testUtils');

describe('Authorization Security', () => {
  let userToken;
  let adminToken;
  let user;
  let admin;
  let otherUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create regular user
    user = await User.create(generateTestUser());
    userToken = generateTestToken(user._id.toString(), user.role);

    // Create admin
    admin = await User.create(generateTestAdmin());
    adminToken = generateTestToken(admin._id.toString(), admin.role);

    // Create another user
    otherUser = await User.create(generateTestUser());
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny regular user access to admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow user to access their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny user access to other user profiles', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to access any user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Privilege Escalation', () => {
    it('should prevent user from escalating to admin', async () => {
      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'admin',
          permissions: ['*'],
        });

      expect(response.status).toBe(200);

      // Check that role wasn't changed
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.role).toBe('user');
    });

    it('should prevent user from modifying other users', async () => {
      const response = await request(app)
        .put(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Hacked',
        });

      expect(response.status).toBe(403);

      // Verify not changed
      const unchangedUser = await User.findById(otherUser._id);
      expect(unchangedUser.firstName).not.toBe('Hacked');
    });

    it('should prevent user from deleting other users', async () => {
      const response = await request(app)
        .delete(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent IDOR attacks', async () => {
      // Try to access resource with sequential IDs
      for (let i = 1; i <= 10; i++) {
        const response = await request(app)
          .get(`/api/users/${i}`)
          .set('Authorization', `Bearer ${userToken}`);

        // Should either be 403 (unauthorized) or 404 (not found)
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  describe('Admin Functions', () => {
    it('should allow admin to modify user roles', async () => {
      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'student',
        });

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.role).toBe('student');
    });

    it('should allow admin to verify users', async () => {
      const response = await request(app)
        .put(`/api/users/${user._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isVerified).toBe(true);
    });

    it('should allow admin to toggle user status', async () => {
      const response = await request(app)
        .put(`/api/users/${user._id}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isActive).toBe(!user.isActive);
    });

    it('should prevent admin from toggling own status', async () => {
      const response = await request(app)
        .put(`/api/users/${admin._id}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('JWT Manipulation', () => {
    it('should reject tokens with tampered payload', async () => {
      // Create token and modify payload
      const token = generateTestToken(user._id.toString(), user.role);
      const [header, payload, signature] = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...JSON.parse(atob(payload)), role: 'admin' })
      ).toString('base64').replace(/=/g, '');

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tokens with invalid signature', async () => {
      const token = generateTestToken(user._id.toString(), user.role);
      const invalidToken = token.slice(0, -5) + 'xxxxx';

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tokens from wrong issuer', async () => {
      const token = jwt.sign(
        { id: user._id.toString(), role: user.role },
        'different-secret'
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Path Traversal', () => {
    it('should prevent path traversal attacks', async () => {
      for (const payload of maliciousPayloads.pathTraversal) {
        const response = await request(app)
          .get(`/api/users/${payload}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent authorization checks', async () => {
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get(`/api/users/${user._id}`)
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain authorization state during concurrent updates', async () => {
      const updateRequests = [];
      for (let i = 0; i < 10; i++) {
        updateRequests.push(
          request(app)
            .put(`/api/users/${user._id}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ firstName: `Update${i}` })
        );
      }

      const responses = await Promise.all(updateRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});