import { NextResponse } from "next/server";

import {
  executeAgreementAction,
  issueAgreementAccess,
  toAgreementView,
} from "@/src/lib/agreements/domain";
import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { actionRequestSchema } from "@/src/lib/agreements/schemas";
import { apiError } from "@/src/lib/http";
import { sendReviewInvitation } from "@/src/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = actionRequestSchema.parse(await request.json());
    const { agreement, role } = await resolveAgreementAccess(id, request);
    if (body.idempotencyKey && agreement.processedActionKeys.includes(body.idempotencyKey)) {
      return NextResponse.json({ agreement: toAgreementView(agreement, role), replayed: true });
    }

    let updated = executeAgreementAction(agreement, { role, source: body.source }, body.action);
    let invitationToken: string | undefined;
    if ((body.action.type === "invite" || body.action.type === "resend_invitation") && role === "author") {
      const issued = issueAgreementAccess(updated, "signer");
      updated = issued.agreement;
      invitationToken = issued.token;
    }
    if (body.idempotencyKey) {
      updated.processedActionKeys = [...updated.processedActionKeys.slice(-199), body.idempotencyKey];
    }
    await saveAgreement(updated);

    const response: Record<string, unknown> = { agreement: toAgreementView(updated, role) };
    if (invitationToken) {
      const origin = new URL(request.url).origin;
      const url = `${origin}/access/${updated.id}/${invitationToken}`;
      const delivered = await sendReviewInvitation(updated, url);
      response.invitation = {
        email: updated.signer.email,
        url,
        delivered,
      };
    }
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
