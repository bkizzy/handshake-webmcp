import { NextResponse } from "next/server";

import { toAgreementView } from "@/src/lib/agreements/domain";
import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { apiError } from "@/src/lib/http";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { sealSignedAgreement } from "@/src/lib/agreements/seal";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { agreement: current, role, profile } = await resolveAgreementAccess(id, request);
    let agreement = current;
    if (agreement.status === "signed" && !agreement.execution?.canonicalJson) {
      agreement = await sealSignedAgreement(agreement);
      await saveAgreement(agreement, { expectedUpdatedAt: current.updatedAt });
    }
    return NextResponse.json({ agreement: toAgreementView(agreement, role), profile });
  } catch (error) {
    return apiError(error);
  }
}
