import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'st_session';
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set in production');
  }
  return new TextEncoder().encode(value || 'dev-only-secret-change-me-dev-only-secret');
}

export function adminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD must be set in production');
  }
  return value || 'admin123';
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSessionToken() {
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySessionToken(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60
};
