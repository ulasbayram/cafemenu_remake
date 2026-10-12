import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function publicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server-side Supabase client for page/render gates. Reads the cookie session
 * so a Server Component can resolve the signed-in user before rendering.
 */
export async function serverSupabase() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = publicKey() as string;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, options);
        } catch {
          /* Called from a Server Component render; cookies are refreshed by
             middleware instead. */
        }
      },
    },
  });
}
