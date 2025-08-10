import { NextResponse } from 'next/server';
import { createSession } from '../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const U = process.env.ADMIN_USER || 'admin';
  const P = process.env.ADMIN_PASS || 'password';

  if (username !== U || password !== P) {
    return NextResponse.json({ error: 'Hibás felhasználónév vagy jelszó' }, { status: 401 });
  }

  const token = await createSession(username); // <- ASYNC!
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
