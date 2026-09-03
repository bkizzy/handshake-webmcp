import { NextResponse } from "next/server";

import { createStoredAgreement } from "@/src/lib/agreements/repository";
import { createAgreementSchema } from "@/src/lib/agreements/schemas";
import { toAgreementView } from "@/src/lib/agreements/domain";
import { apiError } from "@/src/lib/http";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({
        error: {
          code: "sign_in_required",
          message: "Authenticate the author by email code before creating an agreement.",
        },
      }, { status: 401 });
    }

    const body = await request.json();
    const rawInput = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const rawAuthor = rawInput.author && typeof rawInput.author === "object" && !Array.isArray(rawInput.author)
      ? rawInput.author as Record<string, unknown>
      : {};
    const input = createAgreementSchema.parse({
      ...rawInput,
      author: { ...rawAuthor, email: user.email },
    });
    const { agreement, authorToken } = await createStoredAgreement(input, user?.id, "agent");
    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    return NextResponse.json({ agreement: toAgreementView(agreement, "author"), links: { author: `${origin}/access/${agreement.id}/${authorToken}` } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
