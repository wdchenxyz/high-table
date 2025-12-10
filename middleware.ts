import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // If credentials are not configured, skip auth to avoid locking out unexpectedly.
  if (!user || !pass) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow access to login page and auth API without authentication
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authToken = req.cookies.get('auth_token')?.value;

  if (authToken) {
    try {
      const decoded = Buffer.from(authToken, 'base64').toString();
      const [providedUser, providedPass] = decoded.split(':');

      if (providedUser === user && providedPass === pass) {
        return NextResponse.next();
      }
    } catch {
      // Invalid token, redirect to login
    }
  }

  // Also support Basic Auth header for API clients
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const [providedUser, providedPass] = decoded.split(':');

    if (providedUser === user && providedPass === pass) {
      return NextResponse.next();
    }
  }

  // Redirect to login page
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect everything except Next.js internals and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
