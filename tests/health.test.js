// Set required env vars BEFORE importing the app
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key-for-jest';

const request = require('supertest');
const app = require('../server');

describe('Health Check Endpoint', () => {
  it('GET /api/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});

describe('404 Handler', () => {
  it('GET /api/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'Endpoint not found');
  });
});
