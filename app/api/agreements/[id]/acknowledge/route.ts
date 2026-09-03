import { NextResponse } from "next/server";

import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { acknowledgeAgreementUpdates, toAgreementView } from "@/src/lib/agreements/domain";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { acknowledgeRequestSchema } from "@/src/lib/agreements/schemas";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = acknowledgeRequestSchema.parse(await request.json());
    const { agreement, role } = await resolveAgreementAccess(id, request);
    const updated = acknowledgeAgreementUpdates(agreement, role, body.throughSequence);
    if (updated.updatedAt !== agreement.updatedAt) {
      await saveAgreement(updated, { expectedUpdatedAt: agreement.updatedAt });
    }
    return NextResponse.json({ agreement: toAgreementView(updated, role) });
  } catch (error) {
    return apiError(error);
  }
}
