import { NextResponse } from "next/server";

import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { AgreementError, issueSignatureChallenge } from "@/src/lib/agreements/domain";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { signatureCodeRequestSchema } from "@/src/lib/agreements/schemas";
import { sendSignatureCode } from "@/src/lib/email";
import { apiError } from "@/src/lib/http";
import { consumeRateLimit, recordSecurityEvent, requestIp } from "@/src/lib/security";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    signatureCodeRequestSchema.parse(await request.json());
    const { agreement, role } = await resolveAgreementAccess(id);
    const address = requestIp(request);
    const [partyLimit, ipLimit] = await Promise.all([
      consumeRateLimit("signature-code-party", `${id}:${role}:${agreement[role].email}`, 6, 60 * 60),
      consumeRateLimit("signature-code-ip", address, 20, 60 * 60),
    ]);
    if (!partyLimit.available || !ipLimit.available) throw new AgreementError("Signature verification is temporarily unavailable.", "signature_unavailable", 503);
    if (!partyLimit.allowed || !ipLimit.allowed) {
      await recordSecurityEvent({ eventType: "signature.code_rate_limited", agreementId: id, actorRole: role, ipAddress: address });
      throw new AgreementError("Too many signing codes requested. Try again later.", "code_rate_limited", 429, {
        retryAfterSeconds: Math.max(partyLimit.retryAfterSeconds, ipLimit.retryAfterSeconds),
      });
    }
    const issued = issueSignatureChallenge(agreement, role);
    await saveAgreement(issued.agreement, { expectedUpdatedAt: agreement.updatedAt });
    const delivered = await sendSignatureCode(issued.agreement, role, issued.code);
    await recordSecurityEvent({ eventType: "signature.code_requested", agreementId: id, actorRole: role, ipAddress: address, metadata: { delivered } });
    return NextResponse.json({ delivered, email: issued.agreement[role].email });
  } catch (error) {
    return apiError(error);
  }
}
