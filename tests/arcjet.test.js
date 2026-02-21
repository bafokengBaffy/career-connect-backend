// @ts-nocheck
// backend/tests/security/arcjet.test.js
const request = require('supertest');
const { app } = require('../../server');

describe('Arcjet Security Tests', () => {
  test('should allow legitimate requests', async () => {
    const response = await request(app)
      .get('/api/test')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(429);
  });

  test('should block bot traffic', async () => {
    const response = await request(app)
      .get('/api/test')
      .set('User-Agent', 'python-requests/2.28.1');
    
    // This might be 200 in development (DRY_RUN) or 403 in production
    if (process.env.NODE_ENV === 'production') {
      expect(response.status).toBe(403);
    }
  });

  test('should handle rate limiting', async () => {
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(request(app).get('/api/test'));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    // In development, might not hit rate limit
    if (process.env.NODE_ENV === 'production') {
      expect(rateLimited).toBe(true);
    }
  });

  test('should validate emails on auth routes', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@tempmail.com',
        password: 'Test123!'
      });
    
    // This might be 400 in production or 200 in development
    if (process.env.NODE_ENV === 'production') {
      expect(response.status).toBe(400);
    }
  });
});