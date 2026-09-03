import { describe, expect, it } from "vitest";

import { buildNegotiationCertificate } from "./certificate";
import { signatureConsentVersion } from "./contract";
import {
  AgreementError,
  accessGrantsFor,
  accessTokenMatches,
  createAccessGrant,
  createAgreement,
  executeAgreementAction,
  issueAgreementAccess,
  issueSignatureChallenge,
  toAgreementView,
} from "./domain";
import { sealSignedAgreement, verifyAgreementSeal } from "./seal";
import type { CreateAgreementInput, StoredAgreement } from "./types";

const input: CreateAgreementInput = {
  title: "Product evaluation NDA",
  kind: "mutual",
  author: { legalName: "Acme Labs, Inc.", address: "1 Market Street, San Francisco, CA 94105", signatoryName: "Avery Author", signatoryTitle: "CEO", email: "avery@example.com" },
  signer: { legalName: "Boris Systems LLC", address: "11 Broadway, New York, NY 10004", signatoryName: "Sam Signer", signatoryTitle: "Founder", email: "sam@example.com" },
  fields: { effectiveDate: "2026-09-01", purpose: "a potential product integration", governingLaw: "New York", preExistingMaterials: "None listed" },
};

const authorHuman = { role: "author", source: "human" } as const;
const signerHuman = { role: "signer", source: "human" } as const;
const signerAgent = { role: "signer", source: "agent" } as const;

function invitedAgreement() {
  return executeAgreementAction(createAgreement(input), authorHuman, { type: "invite" });
}

function readyAgreement() {
  let agreement = invitedAgreement();
  agreement = executeAgreementAction(agreement, authorHuman, { type: "mark_ready" });
  return executeAgreementAction(agreement, signerHuman, { type: "mark_ready" });
}

function signedBy(current: StoredAgreement, role: "author" | "signer") {
  const issued = issueSignatureChallenge(current, role);
  return executeAgreementAction(issued.agreement, role === "author" ? authorHuman : signerHuman, {
    type: "sign",
    typedName: role === "author" ? "Avery Author" : "Sam Signer",
    code: issued.code,
    consentVersion: signatureConsentVersion,
  });
}

function captureError(run: () => StoredAgreement) {
  try { run(); throw new Error("Expected the action to fail"); }
  catch (error) { expect(error).toBeInstanceOf(AgreementError); return error as AgreementError; }
}

describe("agreement lifecycle", () => {
  it("lets only the author edit a draft and records immutable snapshots", () => {
    const original = createAgreement(input);
    const updated = executeAgreementAction(original, authorHuman, { type: "update_document_fields", fields: { governingLaw: "Delaware" } });
    expect(updated.fields.governingLaw).toBe("Delaware");
    expect(updated.version).toBe(2);
    expect(updated.versions.map((item) => item.version)).toEqual([1, 2]);
    expect(original.fields.governingLaw).toBe("New York");
    expect(captureError(() => executeAgreementAction(original, signerHuman, { type: "update_document_fields", fields: { governingLaw: "Delaware" } })).code).toBe("forbidden");
  });

  it("records source-attributed bilateral redlines and responses", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, signerAgent, { type: "propose_redline", target: { kind: "field", id: "preExistingMaterials" }, proposedValue: "Signer’s background orchestration framework", rationale: "Clarify prior work." });
    expect(agreement.redlines[0]).toMatchObject({ proposedBy: "signer", proposedBySource: "agent", status: "open" });
    agreement = executeAgreementAction(agreement, authorHuman, { type: "respond_redline", redlineId: agreement.redlines[0].id, decision: "accept" });
    expect(agreement.fields.preExistingMaterials).toContain("orchestration framework");
    expect(agreement.redlines[0]).toMatchObject({ status: "accepted", resolvedBySource: "human" });
  });

  it("supports a counter without choosing the terms", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, authorHuman, { type: "propose_redline", target: { kind: "section", id: "term" }, proposedValue: "Confidentiality survives five years.", rationale: "Longer protection." });
    agreement = executeAgreementAction(agreement, signerHuman, { type: "respond_redline", redlineId: agreement.redlines[0].id, decision: "counter", counterValue: "Confidentiality survives four years.", rationale: "Middle position." });
    expect(agreement.redlines[0].status).toBe("superseded");
    expect(agreement.redlines[1]).toMatchObject({ proposedBy: "signer", status: "open" });
  });

  it("requires all redlines resolved and both parties to approve", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, signerAgent, { type: "propose_redline", target: { kind: "field", id: "purpose" }, proposedValue: "a specific integration", rationale: "Narrow use." });
    expect(captureError(() => executeAgreementAction(agreement, authorHuman, { type: "mark_ready" })).code).toBe("open_redlines");
    agreement = executeAgreementAction(agreement, authorHuman, { type: "respond_redline", redlineId: agreement.redlines[0].id, decision: "accept" });
    agreement = executeAgreementAction(agreement, authorHuman, { type: "mark_ready" });
    agreement = executeAgreementAction(agreement, signerHuman, { type: "mark_ready" });
    expect(agreement.status).toBe("ready");
  });

  it("keeps signing human-only and requires a verified six-digit code and consent", async () => {
    let agreement = readyAgreement();
    expect(captureError(() => executeAgreementAction(agreement, signerAgent, { type: "sign", typedName: "Sam Signer", code: "000000", consentVersion: signatureConsentVersion })).code).toBe("human_signature_required");
    expect(captureError(() => executeAgreementAction(agreement, signerHuman, { type: "sign", typedName: "Sam Signer", code: "000000", consentVersion: signatureConsentVersion })).code).toBe("signature_code_required");
    agreement = signedBy(agreement, "author");
    expect(agreement.status).toBe("ready");
    agreement = signedBy(agreement, "signer");
    agreement = await sealSignedAgreement(agreement);
    expect(agreement.status).toBe("signed");
    expect(agreement.execution?.sealHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await verifyAgreementSeal(agreement)).valid).toBe(true);
    const certificate = buildNegotiationCertificate(agreement);
    expect(certificate.footer).toContain("Private instructions");
  });

  it("detects a signed record changed after sealing", async () => {
    let agreement = signedBy(signedBy(readyAgreement(), "author"), "signer");
    agreement = await sealSignedAgreement(agreement);
    agreement.fields.purpose = "tampered";
    expect((await verifyAgreementSeal(agreement)).valid).toBe(false);
  });

  it("keeps the seal valid when access and notification metadata change", async () => {
    let agreement = signedBy(signedBy(readyAgreement(), "author"), "signer");
    agreement = await sealSignedAgreement(agreement);
    agreement = issueAgreementAccess(agreement, "author").agreement;
    agreement.notifications.author.acknowledgedThrough = agreement.audit.at(-1)!.sequence;
    expect((await verifyAgreementSeal(agreement)).valid).toBe(true);
  });

  it("allows participant correction and revokes readiness", () => {
    let agreement = readyAgreement();
    agreement = executeAgreementAction(agreement, authorHuman, { type: "update_participant", role: "signer", participant: { email: "new@example.com" } });
    expect(agreement.signer.email).toBe("new@example.com");
    expect(agreement.status).toBe("review");
    expect(agreement.readiness).toEqual({ author: false, signer: false });
  });

  it("supports terminal decline and void states and locks later actions", () => {
    const declined = executeAgreementAction(invitedAgreement(), signerAgent, { type: "decline", reason: "Cannot agree to the purpose." });
    expect(declined.status).toBe("declined");
    expect(captureError(() => executeAgreementAction(declined, authorHuman, { type: "mark_ready" })).code).toBe("agreement_closed");
    const voided = executeAgreementAction(invitedAgreement(), authorHuman, { type: "void", reason: "Deal ended." });
    expect(voided.status).toBe("voided");
  });

  it("never exposes access, challenges, notification state, or idempotency keys", () => {
    const stored = createAgreement(input);
    const view = toAgreementView(stored, "author");
    const json = JSON.stringify(view);
    expect("access" in view).toBe(false);
    expect(json).not.toContain(accessGrantsFor(stored.access.author)[0].tokenHash);
    expect(json).not.toContain("signatureChallenges");
    expect(json).not.toContain("processedActionKeys");
    expect(json).not.toContain("notifications");
  });

  it("supports concurrent party links and explicit revocation", () => {
    const { token, grant } = createAccessGrant();
    expect(grant.tokenHash).not.toBe(token);
    expect(accessTokenMatches(grant, token)).toBe(true);
    const original = createAgreement(input);
    const first = issueAgreementAccess(original, "signer");
    const second = issueAgreementAccess(first.agreement, "signer");
    expect(accessTokenMatches(second.agreement.access.signer, first.token)).toBe(true);
    expect(accessTokenMatches(second.agreement.access.signer, second.token)).toBe(true);
    const replacement = issueAgreementAccess(second.agreement, "signer", { replace: true });
    expect(accessTokenMatches(replacement.agreement.access.signer, first.token)).toBe(false);
    expect(accessTokenMatches(replacement.agreement.access.signer, replacement.token)).toBe(true);
  });

  it("provides monotonic event cursors", () => {
    let agreement = createAgreement(input);
    const initial = toAgreementView(agreement, "author").eventSequence;
    agreement = executeAgreementAction(agreement, authorHuman, { type: "invite" });
    expect(toAgreementView(agreement, "author").eventSequence).toBe(initial + 1);
  });
});
