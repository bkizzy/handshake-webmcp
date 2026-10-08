import { NextResponse } from "next/server";

import { processAgreementAction } from "@/src/lib/agreements/action-handler";
import { AgreementError } from "@/src/lib/agreements/domain";
import { isUserActivatedSameOriginNavigation } from "@/src/lib/human-signature";

type RouteContext = { params: Promise<{ id: string }> };

function redirectToAgreement(request: Request, id: string, result: "success" | string) {
  const url = new URL(`/deal/${id}`, request.url);
  if (result === "success") url.searchParams.set("signed", "1");
  else url.searchParams.set("signError", result);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    if (!isUserActivatedSameOriginNavigation(request.headers)) {
      throw new AgreementError(
        "Signing requires a direct action in a supported browser.",
        "human_signature_required",
        403,
      );
    }

    const form = await request.formData();
    if (form.get("consent") !== "on") {
      throw new AgreementError("Confirm your electronic-signature consent.", "signature_consent_required", 409);
    }
    await processAgreementAction(request, id, "human", {
      allowHumanSignature: true,
      body: {
        expectedEventSequence: Number(form.get("expectedEventSequence")),
        action: {
          type: "sign",
          typedName: form.get("typedName"),
          code: form.get("code"),
          consentVersion: form.get("consentVersion"),
        },
      },
    });
    return redirectToAgreement(request, id, "success");
  } catch (error) {
    const message = error instanceof AgreementError ? error.message : "The signature could not be applied.";
    return redirectToAgreement(request, id, message);
  }
}
