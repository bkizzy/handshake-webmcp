import { afterEach, describe, expect, it, vi } from "vitest";

import { createAgreement } from "./agreements/domain";
import type { CreateAgreementInput } from "./agreements/types";
import { scheduleAgreementSurvey } from "./email";

const input: CreateAgreementInput = {
  title: "Product evaluation NDA",
  kind: "mutual",
  author: { legalName: "Acme Labs, Inc.", address: "1 Market Street", signatoryName: "Avery Author", signatoryTitle: "CEO", email: "avery@example.com" },
  signer: { legalName: "Signal Forge LLC", address: "200 Example Avenue", signatoryName: "Sam Signer", signatoryTitle: "Founder", email: "sam@example.com" },
  fields: { effectiveDate: "2026-10-07", purpose: "a product evaluation", governingLaw: "New York", authorPreviouslyKnownInformation: "None disclosed.", signerPreviouslyKnownInformation: "None disclosed." },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("scheduleAgreementSurvey", () => {
  it("schedules one non-agent survey email exactly 24 hours after creation", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Mutual Assent AI <hello@mutualassent.com>");
    vi.stubEnv("CONTACT_EMAIL", "hello@mutualassent.com");
    vi.stubEnv("SURVEY_URL", "https://docs.google.com/forms/example/viewform");
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", request);
    const agreement = createAgreement(input);
    agreement.createdAt = "2026-10-07T14:30:00.000Z";

    expect(await scheduleAgreementSurvey(agreement)).toBe(true);
    const [url, options] = request.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect(body).toMatchObject({
      to: ["avery@example.com"],
      scheduled_at: "2026-10-08T14:30:00.000Z",
    });
    expect(body.html).toContain("Share feedback");
    expect(body.html).not.toContain("Want your agent to handle this?");
    expect(new Headers(options.headers).get("idempotency-key")).toBe(`agreement-survey-${agreement.id}`);
  });

  it("does nothing when no survey URL is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Mutual Assent AI <hello@mutualassent.com>");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    expect(await scheduleAgreementSurvey(createAgreement(input))).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
