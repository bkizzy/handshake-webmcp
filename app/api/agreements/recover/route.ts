import { NextResponse } from "next/server";

import { issueAgreementAccess } from "@/src/lib/agreements/domain";
import { getAgreementById, saveAgreement } from "@/src/lib/agreements/repository";
import { recoverAgreementSchema } from "@/src/lib/agreements/schemas";
import type { PartyRole } from "@/src/lib/agreements/types";
import { sendAgreementRecovery } from "@/src/lib/email";
import { apiError } from "@/src/lib/http";
import { consumeRateLimit, recordSecurityEvent, requestIp } from "@/src/lib/security";

const genericResponse = {
  message: "If those details match an agreement, a fresh secure link is on its way.",
};

export async function POST(request: Request) {
  try {
    const input = recoverAgreementSchema.parse(await request.json());
    const address = requestIp(request);
    const [emailLimit, ipLimit] = await Promise.all([
      consumeRateLimit("agreement-recovery-email", input.email, 5, 60 * 60),
      consumeRateLimit("agreement-recovery-ip", address, 20, 60 * 60),
    ]);
    if (!emailLimit.available || !ipLimit.available) {
      return NextResponse.json({ error: { code: "recovery_unavailable", message: "Agreement recovery is temporarily unavailable." } }, { status: 503 });
    }
    if (!emailLimit.allowed || !ipLimit.allowed) {
      await recordSecurityEvent({ eventType: "agreement.recovery_rate_limited", agreementId: input.agreementId, ipAddress: address });
      return NextResponse.json(genericResponse);
    }
    const current = await getAgreementById(input.agreementId);
    if (!current) return NextResponse.json(genericResponse);
    const email = input.email.toLowerCase();
    const role = (["author", "signer"] as PartyRole[]).find(
      (candidate) => current[candidate].email.toLowerCase() === email,
    );
    if (!role) return NextResponse.json(genericResponse);
    const sentAt = current.notifications[role].recoverySentAt;
    if (sentAt && Date.now() - Date.parse(sentAt) < 60_000) return NextResponse.json(genericResponse);

    const issued = issueAgreementAccess(current, role, { replace: true });
    issued.agreement.notifications[role].recoverySentAt = new Date().toISOString();
    await saveAgreement(issued.agreement, { expectedUpdatedAt: current.updatedAt });
    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    await sendAgreementRecovery(issued.agreement, role, `${origin}/deal/${issued.agreement.id}#access=${encodeURIComponent(issued.token)}`);
    await recordSecurityEvent({ eventType: "agreement.recovery_sent", agreementId: issued.agreement.id, actorRole: role, ipAddress: address });
    return NextResponse.json(genericResponse);
  } catch (error) {
    return apiError(error);
  }
}
