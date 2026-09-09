import crypto from 'node:crypto';

function encoded(value) { return Buffer.from(value).toString('base64url'); }
function decoded(value) { return Buffer.from(value, 'base64url').toString('utf8'); }

export function createAccessToken(userId, secret, now = Math.floor(Date.now() / 1000)) {
  const header = encoded(JSON.stringify({ alg: 'HS256', typ: 'FJORD' }));
  const payload = encoded(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 }));
  const input = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${signature}`;
}

export function verifyAccessToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const parsedHeader = JSON.parse(decoded(header));
    const parsedPayload = JSON.parse(decoded(payload));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'FJORD') return null;
    if (typeof parsedPayload.sub !== 'string' || !/^[a-zA-Z0-9:_-]{1,128}$/.test(parsedPayload.sub)) return null;
    if (!Number.isInteger(parsedPayload.exp) || parsedPayload.exp <= now) return null;
    return { userId: parsedPayload.sub };
  } catch { return null; }
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const value = req.get('authorization') || '';
    const token = value.startsWith('Bearer ') ? value.slice(7) : '';
    const identity = verifyAccessToken(token, secret);
    if (!identity) return res.status(401).json({ error: 'unauthorized' });
    req.user = identity;
    return next();
  };
}
