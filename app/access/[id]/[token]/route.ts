import { NextResponse } from "next/server";

import { agreementAccessCookieName } from "@/src/lib/agreements/access";
import { getAgreementByAccess, claimAgreementForUser } from "@/src/lib/agreements/repository";
import { apiError } from "@/src/lib/http";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string; token: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id, token } = await context.params;
    const access = await getAgreementByAccess(id, token);
    let agreement = access.agreement;
    const role = access.role;
    const user = await getAuthenticatedUser();
    if (role === "author" && user && !agreement.ownerUserId) {
      agreement = await claimAgreementForUser(agreement, { id: user.id, email: user.email });
    }

    const response = NextResponse.redirect(new URL(`/deal/${agreement.id}`, request.url));
    response.cookies.set(agreementAccessCookieName(agreement.id), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      expires: new Date(agreement.access[role]!.expiresAt),
      path: "/",
    });
    response.headers.set("cache-control", "no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
