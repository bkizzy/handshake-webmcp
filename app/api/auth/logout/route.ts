import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hasSupabasePublicConfig } from "@/src/lib/supabase/config";

export async function POST(request: Request) {
  if (hasSupabasePublicConfig()) {
    const cookieStore = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (values) => {
            for (const { name, value, options } of values) cookieStore.set(name, value, options);
          },
        },
      },
    );
    await client.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
