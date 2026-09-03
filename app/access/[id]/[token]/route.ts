import { NextResponse } from "next/server";

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

    const destination = new URL(`/deal/${agreement.id}`, request.url);
    destination.hash = `access=${encodeURIComponent(token)}`;
    const response = NextResponse.redirect(destination);
    response.headers.set("cache-control", "no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
