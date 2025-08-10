// middleware.ts (gyökér)
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './app/lib/auth';

const PROTECTED_API = [
  /^\/api\/send-draft/,
  /^\/api\/links/,
  /^\/api\/revoke/,
  /^\/api\/resend/,
  /^\/api\/upload/,
  /^\/api\/list-pdfs/,
];

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/login(?:\/.*)?$/,
  /^\/r\//,
  /^\/koszonjuk/,
  /^\/api\/link\//,
  /^\/api\/ack/,
  /^\/_next\//,
  /^\/uploads\//,
  /^\/favicon\.ico$/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth')?.value || null;
  const session = await verifySession(token); // <- ASYNC!

  if (pathname.startsWith('/admin')) {
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (PROTECTED_API.some((re) => re.test(pathname))) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map)).*)',
  ],
};