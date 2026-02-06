import request from 'supertest';
import app from '../../app.js';

// Mock auth and rbac middlewares to bypass real auth and permission checks for integration test
jest.mock('../../middleware/authMiddleware.js', () => ({
  authenticateToken: (req, res, next) => { req.user = { userId: 1, church_id: 1 }; next(); }
}));

jest.mock('../../middleware/rbacMiddleware.js', () => ({
  requirePermission: () => (req, res, next) => next()
}));

describe('Leadership reject integration', () => {
  it('returns 400 when reject reason is missing', async () => {
    const res = await request(app)
      .post('/api/leadership/1/reject')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body?.error || res.body?.message).toMatch(/reason is required/i);
  }, 10000);
});
