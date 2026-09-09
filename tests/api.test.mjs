import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server/app.mjs';
import { MemoryRepository } from '../server/repository.mjs';
import { createAccessToken } from '../server/auth.mjs';

const secret = 'test-only-secret';
const repo = new MemoryRepository();
const app = createApp({ repository: repo, authSecret: secret, corsOrigin: 'http://localhost:4173' });
const tokenA = createAccessToken('user-a', secret);
const tokenB = createAccessToken('user-b', secret);
const event = { eventId: '11111111-1111-4111-8111-111111111111', ts: '2026-09-09T12:00:00Z', eventType: 'page_visit', domain: 'github.com', title: 'Issues', durationSec: 120, category: 'development', device: 'chrome-desktop' };
const batch = { idempotencyKey: '22222222-2222-4222-8222-222222222222', events: [event] };

test('health is public but API routes require auth', async () => {
  assert.equal((await request(app).get('/api/health')).status, 200);
  assert.equal((await request(app).get('/api/v1/events')).status, 401);
});

test('rejects malformed batches before persistence', async () => {
  const response = await request(app).post('/api/v1/events/batch').set('Authorization', `Bearer ${tokenA}`).send({ idempotencyKey: 'bad', events: [] });
  assert.equal(response.status, 400);
});

test('accepts a batch once and makes retries idempotent', async () => {
  const first = await request(app).post('/api/v1/events/batch').set('Authorization', `Bearer ${tokenA}`).send(batch);
  const second = await request(app).post('/api/v1/events/batch').set('Authorization', `Bearer ${tokenA}`).send(batch);
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, { ok: true, inserted: 1, duplicate: false });
  assert.equal(second.status, 200);
  assert.deepEqual(second.body, { ok: true, inserted: 0, duplicate: true });
});

test('isolates reads by authenticated user', async () => {
  const own = await request(app).get('/api/v1/events').set('Authorization', `Bearer ${tokenA}`);
  const other = await request(app).get('/api/v1/events').set('Authorization', `Bearer ${tokenB}`);
  assert.equal(own.body.events.length, 1);
  assert.equal(other.body.events.length, 0);
});
