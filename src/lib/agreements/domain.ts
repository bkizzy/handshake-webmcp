import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createNdaSections } from "./template";
import type {
  ActionContext,
  Agreement,
  AgreementAction,
  AgreementFields,
  AgreementView,
  AccessGrant,
  AuditEvent,
  CreateAgreementInput,
  PartyRole,
  Redline,
  RedlineTarget,
  StoredAgreement,
} from "./types";

export class AgreementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function now() {
  return new Date().toISOString();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createAccessGrant() {
  const token = randomBytes(32).toString("base64url");
  const createdAt = now();
  const grant: AccessGrant = {
    tokenHash: sha256(token),
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };
  return { token, grant };
}

export function accessTokenMatches(grant: AccessGrant | undefined, token: string) {
  return Boolean(grant && token && Date.parse(grant.expiresAt) > Date.now() && grant.tokenHash === sha256(token));
}

function assert(condition: unknown, message: string, code: string, status = 400): asserts condition {
  if (!condition) throw new AgreementError(message, code, status);
}

function audit(
  agreement: StoredAgreement,
  context: ActionContext,
  type: AuditEvent["type"],
  summary: string,
) {
  agreement.audit.push({
    id: randomUUID(),
    type,
    actorRole: context.role,
    actorSource: context.source,
    summary,
    createdAt: now(),
    version: agreement.version,
  });
}

function getTargetValue(agreement: Agreement, target: RedlineTarget) {
  if (target.kind === "field") return agreement.fields[target.id];
  const section = agreement.sections.find((item) => item.id === target.id);
  assert(section, "The document section does not exist.", "target_not_found", 404);
  return section.body;
}

function setTargetValue(agreement: Agreement, target: RedlineTarget, value: string) {
  if (target.kind === "field") {
    agreement.fields[target.id] = value;
    return;
  }
  const section = agreement.sections.find((item) => item.id === target.id);
  assert(section, "The document section does not exist.", "target_not_found", 404);
  section.body = value;
}

function invalidateApproval(agreement: StoredAgreement) {
  agreement.readiness = { author: false, signer: false };
  agreement.signatures = {};
  if (agreement.status !== "draft") agreement.status = "review";
}

function recordVersion(agreement: StoredAgreement) {
  agreement.versions.push({
    version: agreement.version,
    createdAt: agreement.updatedAt,
    fields: structuredClone(agreement.fields),
    sections: structuredClone(agreement.sections),
  });
}

function touchDocument(agreement: StoredAgreement) {
  agreement.version += 1;
  agreement.updatedAt = now();
  invalidateApproval(agreement);
  recordVersion(agreement);
}

function otherRole(role: PartyRole): PartyRole {
  return role === "author" ? "signer" : "author";
}

function createRedline(
  agreement: StoredAgreement,
  context: ActionContext,
  target: RedlineTarget,
  proposedValue: string,
  rationale: string,
): Redline {
  assert(proposedValue.trim(), "A proposed value is required.", "proposal_required");
  const currentValue = getTargetValue(agreement, target);
  assert(currentValue !== proposedValue, "The proposal must change the document.", "no_change");

  const redline: Redline = {
    id: randomUUID(),
    target,
    proposedBy: context.role,
    currentValue,
    proposedValue,
    rationale: rationale.trim(),
    status: "open",
    createdAt: now(),
  };
  agreement.redlines.push(redline);
  agreement.updatedAt = now();
  invalidateApproval(agreement);
  return redline;
}

export function createAgreement(input: CreateAgreementInput, authorAccess?: AccessGrant): StoredAgreement {
  const timestamp = now();
  const access = authorAccess ?? createAccessGrant().grant;
  const agreement: StoredAgreement = {
    id: randomUUID(),
    title: input.title.trim(),
    kind: input.kind,
    status: "draft",
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    author: { ...input.author, role: "author" },
    signer: { ...input.signer, role: "signer" },
    fields: { ...input.fields },
    sections: createNdaSections(input),
    redlines: [],
    readiness: { author: false, signer: false },
    signatures: {},
    versions: [],
    audit: [],
    access: { author: access },
    processedActionKeys: [],
  };
  assert(agreement.title, "A document title is required.", "title_required");
  assert(agreement.author.email, "The author email is required.", "author_email_required");
  assert(agreement.signer.email, "The signer email is required.", "signer_email_required");
  recordVersion(agreement);
  audit(agreement, { role: "author", source: "human" }, "agreement.created", "Created the agreement");
  return agreement;
}

export function issueAgreementAccess(current: StoredAgreement, role: PartyRole) {
  const agreement = structuredClone(current);
  const { token, grant } = createAccessGrant();
  agreement.access[role] = grant;
  agreement.updatedAt = now();
  return { agreement, token };
}

export function executeAgreementAction(
  current: StoredAgreement,
  context: ActionContext,
  action: AgreementAction,
): StoredAgreement {
  const agreement = structuredClone(current);
  assert(agreement.status !== "signed", "A signed agreement is read-only.", "agreement_signed", 409);

  switch (action.type) {
    case "update_document_fields": {
      assert(context.role === "author", "Only the author can edit a draft.", "forbidden", 403);
      assert(agreement.status === "draft", "Direct editing is available only in draft.", "not_draft", 409);
      const entries = Object.entries(action.fields) as [keyof AgreementFields, string][];
      assert(entries.length > 0, "At least one field is required.", "empty_update");
      for (const [key, value] of entries) agreement.fields[key] = value;
      touchDocument(agreement);
      audit(agreement, context, "document.updated", "Updated document details");
      return agreement;
    }
    case "update_draft_section": {
      assert(context.role === "author", "Only the author can edit a draft.", "forbidden", 403);
      assert(agreement.status === "draft", "Direct editing is available only in draft.", "not_draft", 409);
      assert(action.body.trim(), "Section text is required.", "body_required");
      const section = agreement.sections.find((item) => item.id === action.sectionId);
      assert(section, "The document section does not exist.", "section_not_found", 404);
      section.body = action.body;
      touchDocument(agreement);
      audit(agreement, context, "document.updated", `Updated ${section.title}`);
      return agreement;
    }
    case "invite": {
      assert(context.role === "author", "Only the author can send the invitation.", "forbidden", 403);
      assert(agreement.status === "draft", "The agreement has already been sent for review.", "already_invited", 409);
      agreement.status = "review";
      agreement.invitedAt = now();
      agreement.updatedAt = agreement.invitedAt;
      audit(agreement, context, "participant.invited", `Invited ${agreement.signer.email} to review`);
      return agreement;
    }
    case "propose_redline": {
      assert(
        agreement.status === "review" || agreement.status === "ready",
        "Redlines are available after the agreement is invited.",
        "not_in_review",
        409,
      );
      const redline = createRedline(
        agreement,
        context,
        action.target,
        action.proposedValue,
        action.rationale,
      );
      audit(agreement, context, "redline.proposed", `Proposed a change to ${redline.target.id}`);
      return agreement;
    }
    case "respond_redline": {
      assert(agreement.status === "review", "Redline responses are available during review.", "not_in_review", 409);
      const redline = agreement.redlines.find((item) => item.id === action.redlineId);
      assert(redline, "The redline does not exist.", "redline_not_found", 404);
      assert(redline.status === "open", "The redline has already been resolved.", "redline_resolved", 409);
      assert(redline.proposedBy === otherRole(context.role), "The other party must respond to this redline.", "forbidden", 403);
      const resolvedAt = now();
      redline.resolvedAt = resolvedAt;
      redline.resolvedBy = context.role;

      if (action.decision === "accept") {
        redline.status = "accepted";
        setTargetValue(agreement, redline.target, redline.proposedValue);
        touchDocument(agreement);
        audit(agreement, context, "redline.accepted", `Accepted a change to ${redline.target.id}`);
        return agreement;
      }
      if (action.decision === "reject") {
        redline.status = "rejected";
        agreement.updatedAt = resolvedAt;
        audit(agreement, context, "redline.rejected", `Rejected a change to ${redline.target.id}`);
        return agreement;
      }

      const counterValue = action.counterValue;
      assert(
        typeof counterValue === "string" && counterValue.trim().length > 0,
        "Counterproposal text is required.",
        "counter_required",
      );
      redline.status = "superseded";
      const counter = createRedline(
        agreement,
        context,
        redline.target,
        counterValue,
        action.rationale ?? "Counterproposal",
      );
      redline.supersededBy = counter.id;
      audit(agreement, context, "redline.countered", `Countered a change to ${redline.target.id}`);
      return agreement;
    }
    case "resend_invitation": {
      assert(context.role === "author", "Only the author can refresh the invitation.", "forbidden", 403);
      assert(agreement.status !== "draft", "Invite the signer before refreshing their link.", "not_invited", 409);
      agreement.updatedAt = now();
      audit(agreement, context, "participant.reinvited", `Refreshed the review link for ${agreement.signer.email}`);
      return agreement;
    }
    case "mark_ready": {
      assert(agreement.status === "review", "The agreement is not in review.", "not_in_review", 409);
      assert(!agreement.redlines.some((item) => item.status === "open"), "Resolve all open redlines first.", "open_redlines", 409);
      agreement.readiness[context.role] = true;
      agreement.updatedAt = now();
      if (agreement.readiness.author && agreement.readiness.signer) agreement.status = "ready";
      audit(agreement, context, "party.ready", "Marked the current version ready to sign");
      return agreement;
    }
    case "sign": {
      assert(context.source === "human", "An agent cannot sign an agreement.", "human_signature_required", 403);
      assert(agreement.status === "ready", "Both parties must approve the current version before signing.", "not_ready", 409);
      assert(!agreement.signatures[context.role], "This party has already signed.", "already_signed", 409);
      assert(action.typedName.trim(), "Enter the signatory name.", "signature_name_required");
      agreement.signatures[context.role] = {
        role: context.role,
        typedName: action.typedName.trim(),
        signedAt: now(),
        documentVersion: agreement.version,
      };
      agreement.updatedAt = now();
      if (agreement.signatures.author && agreement.signatures.signer) {
        agreement.status = "signed";
        agreement.execution = {
          documentVersion: agreement.version,
          finalizedAt: agreement.updatedAt,
          sha256: sha256(JSON.stringify({
            id: agreement.id,
            title: agreement.title,
            kind: agreement.kind,
            version: agreement.version,
            author: agreement.author,
            signer: agreement.signer,
            fields: agreement.fields,
            sections: agreement.sections,
            signatures: agreement.signatures,
          })),
        };
      }
      audit(agreement, context, "party.signed", "Signed the agreement");
      return agreement;
    }
  }
}

export function toAgreementView(agreement: StoredAgreement, viewerRole: PartyRole): AgreementView {
  const cloned = structuredClone(agreement);
  delete (cloned as Partial<StoredAgreement>).access;
  delete cloned.ownerUserId;
  delete (cloned as Partial<StoredAgreement>).processedActionKeys;
  const publicAgreement = cloned as Agreement;
  const openRedlines = agreement.redlines.some((item) => item.status === "open");
  return {
    ...publicAgreement,
    viewerRole,
    permissions: {
      canEditDraft: viewerRole === "author" && agreement.status === "draft",
      canInvite: viewerRole === "author" && agreement.status === "draft",
      canRedline: agreement.status === "review" || agreement.status === "ready",
      canRespondToRedlines:
        agreement.status === "review" &&
        agreement.redlines.some((item) => item.status === "open" && item.proposedBy !== viewerRole),
      canMarkReady: agreement.status === "review" && !openRedlines && !agreement.readiness[viewerRole],
      canSign: agreement.status === "ready" && !agreement.signatures[viewerRole],
      canResendInvitation:
        viewerRole === "author" && agreement.status !== "draft" && agreement.status !== "signed",
    },
  };
}
