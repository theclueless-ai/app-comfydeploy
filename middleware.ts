import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Routes that don't require authentication
const publicRoutes = ['/login', '/stella', '/api/auth/login', '/api/auth/logout'];

// Routes that require admin API key (not user authentication)
const adminApiRoutes = ['/api/auth/users', '/api/auth/init-db'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // DEBUG: Log hostname and pathname to Vercel logs
  console.log('[Middleware Debug]', { hostname, pathname, url: request.url });

  // Domain redirect: theclueless.es → theclueless.ai (except /interdemo)
  const isTheCluelessEs = hostname.endsWith('theclueless.es') || hostname.includes('theclueless.es:');

  if (isTheCluelessEs) {
    // Paths that should stay on theclueless.es (not redirect to .ai)
    const stayOnEs = pathname.startsWith('/interdemo') ||
                     pathname.startsWith('/login') ||
                     pathname.startsWith('/stella') ||
                     pathname.startsWith('/api');

    if (!stayOnEs) {
      console.log('[Middleware] Redirecting to theclueless.ai', { hostname, pathname });
      const redirectUrl = new URL(pathname + request.nextUrl.search, 'https://theclueless.ai');
      return NextResponse.redirect(redirectUrl, 301);
    }
    console.log('[Middleware] Staying on theclueless.es', { hostname, pathname });
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow admin API routes (they handle their own auth)
  if (adminApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // Static files like .png, .jpg, .css, etc.
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token is invalid, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Clear the invalid cookie
    response.cookies.set('auth-token', '', { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
  ],
};
