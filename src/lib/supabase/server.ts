import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { AgreementError } from "@/src/lib/agreements/domain";
import type { StoredAgreement } from "@/src/lib/agreements/types";
import { hasSupabasePublicConfig, hasSupabaseServerConfig } from "./config";

export async function getAuthenticatedUser() {
  if (!hasSupabasePublicConfig()) return null;
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          try {
            for (const { name, value, options } of values) cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot always write cookies; route handlers can.
          }
        },
      },
    },
  );
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AgreementError("Sign in with your email to author an agreement.", "authentication_required", 401);
  return user;
}

export async function requireAgreementAuthor(agreement: StoredAgreement) {
  if (!agreement.ownerUserId) return;
  const user = await requireAuthenticatedUser();
  if (user.id !== agreement.ownerUserId) {
    throw new AgreementError("This agreement belongs to another author.", "forbidden", 403);
  }
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseServerConfig()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
