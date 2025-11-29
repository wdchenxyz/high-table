import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // If credentials are not configured, skip auth to avoid locking out unexpectedly.
  if (!user || !pass) return NextResponse.next();

  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [providedUser, providedPass] = decoded.split(':');

    if (providedUser === user && providedPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}

export const config = {
  // Protect everything except Next.js internals and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
