import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/simulaciones', '/admin'];
const ADMIN_ONLY_PREFIXES = ['/admin'];
const AUTH_PAGES = ['/login', '/registro'];

/**
 * Refreshes the Supabase session cookie and performs optimistic route
 * protection. Called from `proxy.ts` (Next.js 16 renamed `middleware.ts` to
 * `proxy.ts`; the underlying request lifecycle hook is unchanged).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (isAdminOnly && user) {
    const role = user.user_metadata?.role;
    if (role !== 'admin_pjm') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  if (isAuthPage && user) {
    const role = user.user_metadata?.role;
    const url = request.nextUrl.clone();
    url.pathname = role === 'admin_pjm' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
