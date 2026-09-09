export class MemoryRepository {
  constructor() { this.events = []; this.batches = new Map(); }
  async insertBatch(userId, idempotencyKey, events) {
    const key = `${userId}:${idempotencyKey}`;
    if (this.batches.has(key)) return { inserted: 0, duplicate: true };
    this.batches.set(key, true);
    this.events.push(...events.map((event) => ({ ...event, userId })));
    return { inserted: events.length, duplicate: false };
  }
  async listEvents(userId, query) {
    return this.events.filter((event) => event.userId === userId && (!query.from || event.ts >= query.from) && (!query.to || event.ts <= query.to)).slice(query.cursor, query.cursor + query.limit);
  }
  async summary(userId, from, to) {
    const events = await this.listEvents(userId, { from, to, cursor: 0, limit: 5000 });
    const byCategory = Object.fromEntries(events.reduce((map, event) => map.set(event.category, (map.get(event.category) || 0) + (event.durationSec || 0)), new Map()));
    return { eventCount: events.length, activeSeconds: events.reduce((sum, event) => sum + (event.durationSec || 0), 0), byCategory };
  }
}

export class PgRepository {
  constructor(pool) { this.pool = pool; }
  async migrate() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS activity_events (id BIGSERIAL PRIMARY KEY, user_id VARCHAR(128) NOT NULL, event_id UUID NOT NULL, idempotency_key UUID NOT NULL, ts TIMESTAMPTZ NOT NULL, event_type VARCHAR(32) NOT NULL, domain VARCHAR(253) NOT NULL, url_hash CHAR(64), title VARCHAR(240), duration_sec INTEGER, category VARCHAR(32) NOT NULL, device VARCHAR(32) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, event_id), UNIQUE(user_id, idempotency_key)); CREATE INDEX IF NOT EXISTS activity_events_user_ts_idx ON activity_events(user_id, ts DESC);`);
  }
  async insertBatch(userId, idempotencyKey, events) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT 1 FROM activity_events WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1', [userId, idempotencyKey]);
      if (existing.rowCount) { await client.query('ROLLBACK'); return { inserted: 0, duplicate: true }; }
      for (const event of events) await client.query('INSERT INTO activity_events (user_id,event_id,idempotency_key,ts,event_type,domain,url_hash,title,duration_sec,category,device) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [userId, event.eventId, idempotencyKey, event.ts, event.eventType, event.domain, event.urlHash || null, event.title || null, event.durationSec || 0, event.category, event.device]);
      await client.query('COMMIT');
      return { inserted: events.length, duplicate: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async listEvents(userId, query) {
    const result = await this.pool.query('SELECT event_id AS "eventId", ts, event_type AS "eventType", domain, url_hash AS "urlHash", title, duration_sec AS "durationSec", category, device FROM activity_events WHERE user_id = $1 AND ($2::timestamptz IS NULL OR ts >= $2) AND ($3::timestamptz IS NULL OR ts <= $3) ORDER BY ts DESC LIMIT $4 OFFSET $5', [userId, query.from || null, query.to || null, query.limit, query.cursor]);
    return result.rows;
  }
  async summary(userId, from, to) {
    const result = await this.pool.query('SELECT COUNT(*)::int AS "eventCount", COALESCE(SUM(duration_sec),0)::int AS "activeSeconds", category, COALESCE(SUM(duration_sec),0)::int AS seconds FROM activity_events WHERE user_id = $1 AND ($2::timestamptz IS NULL OR ts >= $2) AND ($3::timestamptz IS NULL OR ts <= $3) GROUP BY category', [userId, from || null, to || null]);
    return { eventCount: result.rows.reduce((sum, row) => sum + row.eventCount, 0), activeSeconds: result.rows.reduce((sum, row) => sum + row.seconds, 0), byCategory: Object.fromEntries(result.rows.map((row) => [row.category, row.seconds])) };
  }
}
