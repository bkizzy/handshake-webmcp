import { describe, expect, it } from "vitest";

import {
  AgreementError,
  accessTokenMatches,
  createAccessGrant,
  createAgreement,
  executeAgreementAction,
  issueAgreementAccess,
  toAgreementView,
} from "./domain";
import type { CreateAgreementInput, StoredAgreement } from "./types";

const input: CreateAgreementInput = {
  title: "Product evaluation NDA",
  kind: "mutual",
  author: {
    legalName: "Acme Labs, Inc.",
    address: "1 Market Street, San Francisco, CA 94105",
    signatoryName: "Avery Author",
    signatoryTitle: "CEO",
    email: "avery@example.com",
  },
  signer: {
    legalName: "Boris Systems LLC",
    address: "11 Broadway, New York, NY 10004",
    signatoryName: "Sam Signer",
    signatoryTitle: "Founder",
    email: "sam@example.com",
  },
  fields: {
    effectiveDate: "2026-09-01",
    purpose: "a potential product integration",
    governingLaw: "New York",
    preExistingMaterials: "None listed",
  },
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

function captureError(run: () => StoredAgreement) {
  try {
    run();
    throw new Error("Expected the action to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(AgreementError);
    return error as AgreementError;
  }
}

describe("agreement lifecycle", () => {
  it("allows the author, but not the signer, to edit a draft", () => {
    const original = createAgreement(input);
    const updated = executeAgreementAction(original, authorHuman, {
      type: "update_document_fields",
      fields: { governingLaw: "Delaware" },
    });

    expect(updated.fields.governingLaw).toBe("Delaware");
    expect(updated.version).toBe(2);
    expect(original.fields.governingLaw).toBe("New York");

    const error = captureError(() =>
      executeAgreementAction(original, signerHuman, {
        type: "update_document_fields",
        fields: { governingLaw: "Delaware" },
      }),
    );
    expect(error.code).toBe("forbidden");
  });

  it("moves a draft into bilateral review when invited", () => {
    const agreement = invitedAgreement();
    expect(agreement.status).toBe("review");
    expect(agreement.invitedAt).toBeTruthy();
  });

  it("lets either party propose a redline and the other party accept it", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, signerAgent, {
      type: "propose_redline",
      target: { kind: "field", id: "preExistingMaterials" },
      proposedValue: "Signer’s background orchestration framework",
      rationale: "Clarify materials that predate the evaluation.",
    });

    const redline = agreement.redlines[0];
    expect(redline.proposedBy).toBe("signer");
    expect(redline.status).toBe("open");

    agreement = executeAgreementAction(agreement, authorHuman, {
      type: "respond_redline",
      redlineId: redline.id,
      decision: "accept",
    });
    expect(agreement.fields.preExistingMaterials).toContain("orchestration framework");
    expect(agreement.redlines[0].status).toBe("accepted");
    expect(agreement.version).toBe(2);
  });

  it("supports a counterproposal without choosing negotiation terms for either party", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, authorHuman, {
      type: "propose_redline",
      target: { kind: "section", id: "term" },
      proposedValue: "Confidentiality obligations survive for five years.",
      rationale: "Longer protection requested.",
    });
    const first = agreement.redlines[0];
    agreement = executeAgreementAction(agreement, signerHuman, {
      type: "respond_redline",
      redlineId: first.id,
      decision: "counter",
      counterValue: "Confidentiality obligations survive for four years.",
      rationale: "A middle position.",
    });

    expect(agreement.redlines[0].status).toBe("superseded");
    expect(agreement.redlines[1]).toMatchObject({ proposedBy: "signer", status: "open" });
    expect(agreement.redlines[0].supersededBy).toBe(agreement.redlines[1].id);
  });

  it("blocks readiness while a redline is open, then requires both parties", () => {
    let agreement = invitedAgreement();
    agreement = executeAgreementAction(agreement, signerAgent, {
      type: "propose_redline",
      target: { kind: "field", id: "purpose" },
      proposedValue: "evaluation of a specific integration",
      rationale: "Narrow the permitted use.",
    });
    const error = captureError(() =>
      executeAgreementAction(agreement, authorHuman, { type: "mark_ready" }),
    );
    expect(error.code).toBe("open_redlines");

    agreement = executeAgreementAction(agreement, authorHuman, {
      type: "respond_redline",
      redlineId: agreement.redlines[0].id,
      decision: "accept",
    });
    agreement = executeAgreementAction(agreement, authorHuman, { type: "mark_ready" });
    expect(agreement.status).toBe("review");
    agreement = executeAgreementAction(agreement, signerHuman, { type: "mark_ready" });
    expect(agreement.status).toBe("ready");
  });

  it("requires a human to sign and completes after both human signatures", () => {
    let agreement = readyAgreement();
    const error = captureError(() =>
      executeAgreementAction(agreement, signerAgent, { type: "sign", typedName: "Sam Signer" }),
    );
    expect(error.code).toBe("human_signature_required");

    agreement = executeAgreementAction(agreement, authorHuman, {
      type: "sign",
      typedName: "Avery Author",
    });
    expect(agreement.status).toBe("ready");
    agreement = executeAgreementAction(agreement, signerHuman, {
      type: "sign",
      typedName: "Sam Signer",
    });
    expect(agreement.status).toBe("signed");
    expect(agreement.execution?.documentVersion).toBe(agreement.version);
    expect(agreement.execution?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("invalidates readiness and a partial signature when a new change is proposed", () => {
    let agreement = readyAgreement();
    agreement = executeAgreementAction(agreement, authorHuman, {
      type: "sign",
      typedName: "Avery Author",
    });
    agreement = executeAgreementAction(agreement, signerAgent, {
      type: "propose_redline",
      target: { kind: "field", id: "governingLaw" },
      proposedValue: "California",
      rationale: "Requested venue.",
    });

    expect(agreement.status).toBe("review");
    expect(agreement.readiness).toEqual({ author: false, signer: false });
    expect(agreement.signatures).toEqual({});
  });

  it("never exposes access tokens in a document view", () => {
    const stored = createAgreement(input);
    const view = toAgreementView(stored, "author");
    expect("access" in view).toBe(false);
    expect(JSON.stringify(view)).not.toContain(stored.access.author?.tokenHash);
    expect(view.viewerRole).toBe("author");
  });

  it("stores only access hashes and invalidates a replaced signer link", () => {
    const { token, grant } = createAccessGrant();
    expect(grant.tokenHash).not.toBe(token);
    expect(accessTokenMatches(grant, token)).toBe(true);

    const original = createAgreement(input);
    const first = issueAgreementAccess(original, "signer");
    const second = issueAgreementAccess(first.agreement, "signer");
    expect(accessTokenMatches(second.agreement.access.signer, first.token)).toBe(false);
    expect(accessTokenMatches(second.agreement.access.signer, second.token)).toBe(true);
  });

  it("keeps immutable snapshots for each document version", () => {
    const original = createAgreement(input);
    const updated = executeAgreementAction(original, authorHuman, {
      type: "update_document_fields",
      fields: { purpose: "a narrower evaluation" },
    });
    expect(updated.versions.map((item) => item.version)).toEqual([1, 2]);
    expect(updated.versions[0].fields.purpose).toBe(input.fields.purpose);
    expect(updated.versions[1].fields.purpose).toBe("a narrower evaluation");
  });
});
