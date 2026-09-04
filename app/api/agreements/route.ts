import { NextResponse } from "next/server";

import { toAgreementView } from "@/src/lib/agreements/domain";
import { createStoredAgreement } from "@/src/lib/agreements/repository";
import { createAgreementSchema } from "@/src/lib/agreements/schemas";
import { apiError } from "@/src/lib/http";
import { hasSupabasePublicConfig } from "@/src/lib/supabase/config";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const input = createAgreementSchema.parse(await request.json());
    const user = hasSupabasePublicConfig() ? await getAuthenticatedUser() : null;
    if (hasSupabasePublicConfig() && !user) {
      return NextResponse.json({ error: { code: "sign_in_required", message: "Sign in to create an agreement." } }, { status: 401 });
    }
    if (user?.email && user.email.toLowerCase() !== input.author.email.toLowerCase()) {
      return NextResponse.json(
        { error: { code: "author_email_mismatch", message: `Use your signed-in email (${user.email}) as the author email.` } },
        { status: 403 },
      );
    }
    const { agreement, authorToken } = await createStoredAgreement(input, user?.id);
    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const authorUrl = `${origin}/deal/${agreement.id}#access=${encodeURIComponent(authorToken)}`;
    return NextResponse.json(
      {
        agreement: toAgreementView(agreement, "author"),
        links: { author: authorUrl },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
