import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/editor/:path*",
    "/enterprise/package-a",
    "/modules/erp",
  ],
};

/**
 * Authentication gate for protected page routes. Entitlement (package/module)
 * is enforced by the route's own server component; this only ensures a signed
 * in cookie session exists before any protected page renders.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list)
          response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(
      request.nextUrl.pathname + request.nextUrl.search,
    )}`;
    return NextResponse.redirect(login);
  }
  return response;
}
