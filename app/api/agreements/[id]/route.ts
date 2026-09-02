import { NextResponse } from "next/server";

import { toAgreementView } from "@/src/lib/agreements/domain";
import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { agreement, role, profile } = await resolveAgreementAccess(id, request);
    return NextResponse.json({ agreement: toAgreementView(agreement, role), profile });
  } catch (error) {
    return apiError(error);
  }
}
