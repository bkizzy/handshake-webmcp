import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  return NextResponse.json(
    { email: user?.email ?? null },
    { headers: { "cache-control": "private, no-store" } },
  );
}
