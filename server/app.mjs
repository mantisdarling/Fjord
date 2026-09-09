import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { batchSchema, eventsQuerySchema } from './schema.mjs';
import { requireAuth } from './auth.mjs';

export function createApp({ repository, authSecret = process.env.JWT_SECRET, corsOrigin = process.env.CORS_ORIGIN || false } = {}) {
  if (!repository) throw new Error('repository is required');
  if (!authSecret) throw new Error('JWT_SECRET is required');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: corsOrigin, credentials: true, methods: ['GET', 'POST', 'DELETE'] }));
  app.use(express.json({ limit: '256kb', strict: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fjord-api' }));
  app.use('/api/v1', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/v1', requireAuth(authSecret));

  app.post('/api/v1/events/batch', async (req, res, next) => {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten().fieldErrors });
    try {
      const result = await repository.insertBatch(req.user.userId, parsed.data.idempotencyKey, parsed.data.events);
      return res.status(result.duplicate ? 200 : 201).json({ ok: true, ...result });
    } catch (error) { return next(error); }
  });

  app.get('/api/v1/events', async (req, res, next) => {
    const parsed = eventsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try { return res.json({ events: await repository.listEvents(req.user.userId, parsed.data) }); } catch (error) { return next(error); }
  });

  app.get('/api/v1/summary', async (req, res, next) => {
    const parsed = eventsQuerySchema.pick({ from: true, to: true }).safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try { return res.json(await repository.summary(req.user.userId, parsed.data.from, parsed.data.to)); } catch (error) { return next(error); }
  });

  app.delete('/api/v1/events', async (req, res, next) => {
    const before = typeof req.query.before === 'string' ? req.query.before : '';
    if (!before || Number.isNaN(Date.parse(before)) || new Date(before) >= new Date()) return res.status(400).json({ error: 'before must be a past ISO date' });
    try { return res.json({ ok: true, ...(await repository.deleteBefore(req.user.userId, new Date(before).toISOString())) }); } catch (error) { return next(error); }
  });

  app.use((error, _req, res, _next) => {
    console.error(JSON.stringify({ level: 'error', message: error.message, code: error.code }));
    return res.status(500).json({ error: 'internal_error' });
  });
  return app;
}

export async function startServer() {
  const { Pool } = await import('pg');
  const { PgRepository } = await import('./repository.mjs');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true } });
  const repository = new PgRepository(pool);
  await repository.migrate();
  const app = createApp({ repository });
  const port = Number(process.env.PORT || 8787);
  return app.listen(port, () => console.log(`Fjord API listening on ${port}`));
}

if (import.meta.url === `file://${process.argv[1]}`) startServer().catch((error) => { console.error(error.message); process.exit(1); });
