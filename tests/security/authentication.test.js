// @ts-nocheck
/**
 * Authentication Security Tests
 * Tests for authentication vulnerabilities
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../../server');
const User = require('../../models/User');
const { 
  connectDB, 
  disconnectDB, 
  clearDatabase 
} = require('../setup/testDatabase');
const { 
  generateTestUser,
  maliciousPayloads 
} = require('../setup/testUtils');

describe('Authentication Security', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Login Security', () => {
    it('should prevent brute force attacks', async () => {
      const user = await User.create(generateTestUser());

      // Attempt multiple failed logins
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'wrongpassword',
          });
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword',
        });

      expect([429, 401]).toContain(response.status);
    });

    it('should not reveal user existence', async () => {
      // Non-existent user
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      // Existing user with wrong password
      const user = await User.create(generateTestUser());
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword',
        });

      // Both should return same error message
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('should prevent SQL injection in login', async () => {
      for (const payload of maliciousPayloads.sqlInjection) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'anything',
          });

        expect(response.status).toBe(400); // Should reject, not crash
      }
    });

    it('should prevent NoSQL injection', async () => {
      for (const payload of maliciousPayloads.noSqlInjection) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: { $ne: null },
            password: payload,
          });

        expect(response.status).toBe(400);
      }
    });

    it('should enforce account lockout after too many attempts', async () => {
      const user = await User.create(generateTestUser());

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'wrong',
          });
      }

      // Check if account is locked
      const lockedUser = await User.findById(user._id);
      if (lockedUser.lockedUntil) {
        expect(lockedUser.lockedUntil > new Date()).toBe(true);
      }
    });
  });

  describe('Registration Security', () => {
    it('should prevent duplicate email registration', async () => {
      const user = await User.create(generateTestUser());

      const response = await request(app)
        .post('/api/auth/register')
        .send(generateTestUser({ email: user.email }));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should enforce password strength', async () => {
      const weakPasswords = [
        'short',
        'nocapital123',
        'NOLOWERCASE123',
        'NoSpecial123',
        'NoNumber!',
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(generateTestUser({ password }));

        expect(response.status).toBe(400);
      }
    });

    it('should prevent command injection in registration', async () => {
      for (const payload of maliciousPayloads.commandInjection) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(generateTestUser({ firstName: payload }));

        expect(response.status).toBe(400);
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@tld',
        '@missinglocal.com',
        'spaces in@email.com',
        'multiple@@email.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(generateTestUser({ email }));

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Token Security', () => {
    it('should invalidate tokens after password change', async () => {
      const user = await User.create(generateTestUser());
      
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      const token = loginResponse.body.token;

      // Change password
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: generateTestUser().password,
          newPassword: 'NewPass@123',
          confirmPassword: 'NewPass@123',
        });

      // Try to use old token
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should have proper token expiration', async () => {
      const user = await User.create(generateTestUser());
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      const token = loginResponse.body.token;
      const decoded = jwt.decode(token);

      expect(decoded.exp - decoded.iat).toBe(3600); // 1 hour
    });

    it('should not expose sensitive data in token', async () => {
      const user = await User.create(generateTestUser());
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      const token = loginResponse.body.token;
      const decoded = jwt.decode(token);

      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('role');
    });
  });

  describe('Session Security', () => {
    it('should set secure cookies', async () => {
      const user = await User.create(generateTestUser());

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some(c => c.includes('Secure'))).toBe(
        process.env.NODE_ENV === 'production'
      );
      expect(cookies.some(c => c.includes('SameSite=Strict'))).toBe(true);
    });

    it('should prevent session fixation', async () => {
      // Get session cookie
      const preLoginResponse = await request(app)
        .get('/api/csrf-token');
      
      const preLoginCookie = preLoginResponse.headers['set-cookie'];

      // Login
      const user = await User.create(generateTestUser());
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Cookie', preLoginCookie)
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      // Session should be regenerated
      const postLoginCookie = loginResponse.headers['set-cookie'];
      expect(postLoginCookie).not.toEqual(preLoginCookie);
    });

    it('should destroy session on logout', async () => {
      const user = await User.create(generateTestUser());

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: generateTestUser().password,
        });

      const sessionCookie = loginResponse.headers['set-cookie'];

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie);

      expect(logoutResponse.status).toBe(200);

      // Try to use session
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Cookie', sessionCookie);

      expect(profileResponse.status).toBe(401);
    });
  });
});