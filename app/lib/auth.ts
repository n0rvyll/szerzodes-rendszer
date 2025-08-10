// app/lib/auth.ts
// Web Crypto alapú HMAC-SHA-256 aláírás (Edge + Node kompatibilis)

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

function b64urlEncode(data: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : (data instanceof Uint8Array ? data : new Uint8Array(data));
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importHmacKey(secret: string) {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export type SessionPayload = {
  u: string;   // username
  iat: number; // issued at (s)
  exp: number; // expires at (s)
};

export async function createSession(username: string, ttlSeconds = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { u: username, iat: now, exp: now + ttlSeconds };
  const bodyJson = JSON.stringify(payload);
  const bodyB64u = b64urlEncode(bodyJson);

  const key = await importHmacKey(SECRET);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyB64u));
  const sigB64u = b64urlEncode(sigBuf);

  return `${bodyB64u}.${sigB64u}`;
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [bodyB64u, sigB64u] = parts;

  const key = await importHmacKey(SECRET);
  const expectedSigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyB64u));
  const expectedSigB64u = b64urlEncode(expectedSigBuf);
  if (sigB64u !== expectedSigB64u) return null;

  try {
    // base64url -> json
    const b64 = bodyB64u.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}