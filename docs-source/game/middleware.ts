import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();

  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  const isAdminSubdomain = hostname.startsWith('admin.');

  const studentSession = request.cookies.get('student_session_id');
  const adminSession = request.cookies.get('admin_session');

  if (isAdminSubdomain) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }

    const isAdminLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';

    if (isAdminLoginPage && adminSession) {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    if (!isAdminLoginPage && !adminSession) {
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // API routes handle their own authentication
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const protocol = request.headers.get('x-forwarded-proto') ||
                     (hostname.includes('localhost') || hostname.includes('127.0.0.1') ? 'http' : 'https');
    
    let adminHost: string;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const port = host.split(':')[1] || '';
      adminHost = `admin.localhost${port ? `:${port}` : ''}`;
    } else {
      const parts = hostname.split('.');
      const rootDomain = parts.length >= 2
        ? parts.slice(-2).join('.')
        : hostname;
      adminHost = `admin.${rootDomain}`;
    }
    
    const adminUrl = `${protocol}://${adminHost}${pathname}`;
    return NextResponse.redirect(adminUrl);
  }

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

  const protectedApiRoutes = [
    '/api/game/',
    '/api/analytics/',
  ];

  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

  const isStudentLoginPage = pathname === '/student-login' || pathname === '/student-login/';

  if (isStudentLoginPage && studentSession) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (isProtectedApiRoute && !studentSession) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

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
