import { NextResponse } from "next/server";

import { agreementAccessCookieName } from "@/src/lib/agreements/access";
import { AgreementError, exchangeAgreementAccess } from "@/src/lib/agreements/domain";
import { getAgreementById, saveAgreement } from "@/src/lib/agreements/repository";
import { apiError } from "@/src/lib/http";
import { recordSecurityEvent, requestIp } from "@/src/lib/security";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!token) throw new AgreementError("This link is invalid or has expired.", "invalid_access", 403);

    const current = await getAgreementById(id);
    if (!current) throw new AgreementError("This link is invalid or has expired.", "invalid_access", 403);
    const exchanged = exchangeAgreementAccess(current, token);
    await saveAgreement(exchanged.agreement, { expectedUpdatedAt: current.updatedAt });
    await recordSecurityEvent({ eventType: "agreement.link_exchanged", agreementId: id, actorRole: exchanged.role, ipAddress: requestIp(request) });

    const response = NextResponse.json({ ok: true, role: exchanged.role });
    response.cookies.set(agreementAccessCookieName(id), exchanged.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/api/agreements/${id}`,
      expires: new Date(exchanged.expiresAt),
    });
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof AgreementError && ["not_found", "invalid_access", "state_changed"].includes(error.code)) {
      return NextResponse.json(
        { error: { code: "invalid_access", message: "This link is invalid or has expired." } },
        { status: 403 },
      );
    }
    return apiError(error);
  }
}
