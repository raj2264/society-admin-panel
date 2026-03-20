import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSupabaseCookieName() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  return `sb-${projectId}-auth-token`;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Cookie-based session check without network calls
  const authToken = request.cookies.get(getSupabaseCookieName())?.value;
  const hasSession = !!authToken;

  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!hasSession) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth routes
  if (path.startsWith('/auth') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
