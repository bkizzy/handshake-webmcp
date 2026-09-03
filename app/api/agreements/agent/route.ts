import { NextResponse } from "next/server";

import { createStoredAgreement } from "@/src/lib/agreements/repository";
import { createAgreementSchema } from "@/src/lib/agreements/schemas";
import { toAgreementView } from "@/src/lib/agreements/domain";
import { apiError } from "@/src/lib/http";
import { hasSupabasePublicConfig } from "@/src/lib/supabase/config";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const input = createAgreementSchema.parse(await request.json());
    const user = hasSupabasePublicConfig() ? await getAuthenticatedUser() : null;
    if (user?.email && user.email.toLowerCase() !== input.author.email.toLowerCase()) {
      return NextResponse.json({ error: { code: "author_email_mismatch", message: `Use your signed-in email (${user.email}) as the author email.` } }, { status: 403 });
    }
    const { agreement, authorToken } = await createStoredAgreement(input, user?.id, "agent");
    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    return NextResponse.json({ agreement: toAgreementView(agreement, "author"), links: { author: `${origin}/access/${agreement.id}/${authorToken}` } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
