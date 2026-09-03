import { NextResponse } from "next/server";

import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { issueSignatureChallenge } from "@/src/lib/agreements/domain";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { signatureCodeRequestSchema } from "@/src/lib/agreements/schemas";
import { sendSignatureCode } from "@/src/lib/email";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    signatureCodeRequestSchema.parse(await request.json());
    const { agreement, role } = await resolveAgreementAccess(id, request);
    const issued = issueSignatureChallenge(agreement, role);
    await saveAgreement(issued.agreement, { expectedUpdatedAt: agreement.updatedAt });
    const delivered = await sendSignatureCode(issued.agreement, role, issued.code);
    return NextResponse.json({ delivered, email: issued.agreement[role].email });
  } catch (error) {
    return apiError(error);
  }
}
