import { NextResponse } from "next/server";

import { isAdminEmail } from "@/src/lib/admin-auth";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  return NextResponse.json(
    { email: user?.email ?? null, isAdmin: isAdminEmail(user?.email) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
