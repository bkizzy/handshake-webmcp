import { NextResponse } from "next/server";

import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { buildNegotiationCertificate } from "@/src/lib/agreements/certificate";
import { AgreementError } from "@/src/lib/agreements/domain";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { sealSignedAgreement, verifyAgreementSeal } from "@/src/lib/agreements/seal";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { agreement: current } = await resolveAgreementAccess(id, request);
    let agreement = current;
    if (agreement.status !== "signed" || !agreement.execution) {
      throw new AgreementError("The execution seal is available after both parties sign.", "not_executed", 409);
    }
    if (!agreement.execution.canonicalJson) {
      agreement = await sealSignedAgreement(agreement);
      await saveAgreement(agreement, { expectedUpdatedAt: current.updatedAt });
    }
    const verification = await verifyAgreementSeal(agreement);
    return NextResponse.json({ verification, certificate: buildNegotiationCertificate(agreement) });
  } catch (error) {
    return apiError(error);
  }
}
