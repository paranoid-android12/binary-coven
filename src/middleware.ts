import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for subdomain routing and authentication
 *
 * Handles:
 * - Subdomain detection (admin.* vs main domain)
 * - Admin route protection
 * - Student authentication checks
 * - Redirect logic for unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();

  // Get host from headers
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]; // Remove port if present

  // Detect subdomain
  const isAdminSubdomain = hostname.startsWith('admin.');

  // Get session cookies
  const studentSession = request.cookies.get('student_session_id');
  const adminSession = request.cookies.get('admin_session');

  // ============================================
  // ADMIN SUBDOMAIN ROUTING
  // ============================================
  if (isAdminSubdomain) {
    // If accessing admin subdomain but not on /admin path, rewrite to /admin
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }

    // Check if user is trying to access admin login page
    const isAdminLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';

    // If already logged in and trying to access login page, redirect to dashboard
    if (isAdminLoginPage && adminSession) {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    // If not logged in and trying to access protected admin pages, redirect to login
    if (!isAdminLoginPage && !adminSession) {
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    // Admin is authenticated, allow access
    return NextResponse.next();
  }

  // ============================================
  // MAIN DOMAIN (STUDENT) ROUTING
  // ============================================

  // Public routes that don't require authentication (including main page)
  const publicRoutes = [
    '/', // Allow main page access for all users (login modal will handle auth)
    '/student-login',
    '/api/auth/student-login',
    '/api/auth/logout',
    '/api/auth/session',
    '/api/session-codes/validate',
    '/_next',
    '/favicon.ico',
    '/assets',
    '/images',
    '/sounds',
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/game/',
    '/api/analytics/',
  ];

  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

  // Check if accessing student login page
  const isStudentLoginPage = pathname === '/student-login' || pathname === '/student-login/';

  // If already logged in as student and trying to access login page, redirect to game
  if (isStudentLoginPage && studentSession) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // If not logged in and trying to access protected API routes, return 401
  if (isProtectedApiRoute && !studentSession) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Allow access to all public routes (including main page)
  // The login modal will handle authentication when user clicks "Start"
  return NextResponse.next();
}

/**
 * Matcher configuration
 * Specifies which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
};
