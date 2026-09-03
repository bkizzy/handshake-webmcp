import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

import { knownInformationField, reviewBaseline, signatureConsentVersion, templateForKind } from "./contract";
import { createNdaSections } from "./template";
import type {
  AccessGrant,
  ActionContext,
  Agreement,
  AgreementAction,
  AgreementFields,
  AgreementView,
  AuditEvent,
  CreateAgreementInput,
  NotificationState,
  Party,
  PartyRole,
  Redline,
  RedlineTarget,
  SignatureChallenge,
  StoredAgreement,
} from "./types";

const terminalStatuses = new Set(["signed", "declined", "voided"]);
const accessLifetimeMs = 90 * 24 * 60 * 60 * 1000;
const signatureCodeLifetimeMs = 10 * 60 * 1000;

export class AgreementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function now() {
  return new Date().toISOString();
}

function nextTimestamp(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

function advanceUpdatedAt(agreement: Pick<StoredAgreement, "updatedAt">) {
  agreement.updatedAt = nextTimestamp(agreement.updatedAt);
  return agreement.updatedAt;
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
    expiresAt: new Date(Date.parse(createdAt) + accessLifetimeMs).toISOString(),
  };
  return { token, grant };
}

export function accessGrantsFor(value: AccessGrant | AccessGrant[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function accessTokenMatches(value: AccessGrant | AccessGrant[] | undefined, token: string) {
  if (!token) return false;
  const tokenHash = sha256(token);
  return accessGrantsFor(value).some(
    (grant) => Date.parse(grant.expiresAt) > Date.now() && grant.tokenHash === tokenHash,
  );
}

function defaultNotificationState(): NotificationState {
  return { notifiedThrough: 0, acknowledgedThrough: 0 };
}

export function latestEventSequence(agreement: Pick<Agreement, "audit">) {
  return agreement.audit.reduce((latest, event) => Math.max(latest, event.sequence ?? 0), 0);
}

export function normalizeAgreement(current: StoredAgreement): StoredAgreement {
  const agreement = structuredClone(current);
  const legacyFields = agreement.fields as AgreementFields & { preExistingMaterials?: string };
  legacyFields.authorPreviouslyKnownInformation ??= "None disclosed.";
  legacyFields.signerPreviouslyKnownInformation ??= legacyFields.preExistingMaterials ?? "None disclosed.";
  delete legacyFields.preExistingMaterials;
  agreement.template ??= templateForKind(agreement.kind);
  agreement.signatureChallenges ??= {};
  agreement.notifications ??= {
    author: defaultNotificationState(),
    signer: defaultNotificationState(),
  };
  agreement.notifications.author ??= defaultNotificationState();
  agreement.notifications.signer ??= defaultNotificationState();
  agreement.processedActionKeys ??= [];
  agreement.access ??= {};
  agreement.profileAccess ??= agreement.ownerUserId ? { author: agreement.ownerUserId } : {};
  if (agreement.ownerUserId) agreement.profileAccess.author ??= agreement.ownerUserId;

  agreement.audit = (agreement.audit ?? []).map((event, index) => ({
    ...event,
    sequence: event.sequence || index + 1,
  }));
  agreement.redlines = (agreement.redlines ?? []).map((redline) => ({
    ...redline,
    proposedBySource: redline.proposedBySource ?? "human",
    resolvedBySource: redline.resolvedBy
      ? redline.resolvedBySource ?? "human"
      : undefined,
  }));
  for (const role of ["author", "signer"] as PartyRole[]) {
    const signature = agreement.signatures?.[role];
    if (!signature) continue;
    signature.verifiedEmail ??= agreement[role].email;
    signature.verificationMethod ??= "legacy_capability";
    signature.consentVersion ??= "legacy-consent-v0";
  }
  agreement.versions = (agreement.versions ?? []).map((version) => {
    const fields = version.fields as AgreementFields & { preExistingMaterials?: string };
    return {
      ...version,
      fields: {
        effectiveDate: fields.effectiveDate,
        purpose: fields.purpose,
        governingLaw: fields.governingLaw,
        authorPreviouslyKnownInformation: fields.authorPreviouslyKnownInformation ?? "None disclosed.",
        signerPreviouslyKnownInformation:
          fields.signerPreviouslyKnownInformation ?? fields.preExistingMaterials ?? "None disclosed.",
      },
      author: version.author ?? structuredClone(agreement.author),
      signer: version.signer ?? structuredClone(agreement.signer),
    };
  });
  if (!agreement.versions.length) recordVersion(agreement);
  return agreement;
}

function assert(
  condition: unknown,
  message: string,
  code: string,
  status = 400,
  details?: Record<string, unknown>,
): asserts condition {
  if (!condition) throw new AgreementError(message, code, status, details);
}

function audit(
  agreement: StoredAgreement,
  context: ActionContext,
  type: AuditEvent["type"],
  summary: string,
  details?: Record<string, unknown>,
) {
  agreement.audit.push({
    id: randomUUID(),
    sequence: latestEventSequence(agreement) + 1,
    type,
    actorRole: context.role,
    actorSource: context.source,
    summary,
    createdAt: now(),
    version: agreement.version,
    details,
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
  agreement.signatureChallenges = {};
  if (agreement.status !== "draft") agreement.status = "review";
}

function recordVersion(agreement: StoredAgreement) {
  agreement.versions.push({
    version: agreement.version,
    createdAt: agreement.updatedAt,
    fields: structuredClone(agreement.fields),
    sections: structuredClone(agreement.sections),
    author: structuredClone(agreement.author),
    signer: structuredClone(agreement.signer),
  });
}

function touchDocument(agreement: StoredAgreement) {
  agreement.version += 1;
  advanceUpdatedAt(agreement);
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
  baseValue?: string,
): Redline {
  assert(proposedValue.trim(), "A proposed value is required.", "proposal_required");
  const currentValue = baseValue ?? getTargetValue(agreement, target);
  assert(currentValue !== proposedValue, "The proposal must change the document.", "no_change");
  assert(
    !agreement.redlines.some((item) => item.status === "open" && item.target.kind === target.kind && item.target.id === target.id),
    "Resolve the existing proposal for this term before adding another.",
    "target_has_open_redline",
    409,
  );

  const redline: Redline = {
    id: randomUUID(),
    target,
    proposedBy: context.role,
    proposedBySource: context.source,
    currentValue,
    proposedValue,
    rationale: rationale.trim(),
    status: "open",
    createdAt: now(),
  };
  agreement.redlines.push(redline);
  advanceUpdatedAt(agreement);
  invalidateApproval(agreement);
  return redline;
}

export function createAgreement(
  input: CreateAgreementInput,
  authorAccess?: AccessGrant,
  source: ActionContext["source"] = "human",
): StoredAgreement {
  const timestamp = now();
  const access = authorAccess ?? createAccessGrant().grant;
  const agreement: StoredAgreement = {
    id: randomUUID(),
    title: input.title.trim(),
    kind: input.kind,
    template: templateForKind(input.kind),
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
    profileAccess: {},
    processedActionKeys: [],
    signatureChallenges: {},
    notifications: {
      author: defaultNotificationState(),
      signer: defaultNotificationState(),
    },
  };
  assert(agreement.title, "A document title is required.", "title_required");
  assert(agreement.author.email, "The author email is required.", "author_email_required");
  assert(agreement.signer.email, "The signer email is required.", "signer_email_required");
  recordVersion(agreement);
  audit(agreement, { role: "author", source }, "agreement.created", "Created the agreement");
  return agreement;
}

export function issueAgreementAccess(
  current: StoredAgreement,
  role: PartyRole,
  options: { replace?: boolean } = {},
) {
  const agreement = normalizeAgreement(current);
  const { token, grant } = createAccessGrant();
  const currentGrants = options.replace ? [] : accessGrantsFor(agreement.access[role]);
  agreement.access[role] = [...currentGrants.filter((item) => Date.parse(item.expiresAt) > Date.now()), grant].slice(-5);
  advanceUpdatedAt(agreement);
  return { agreement, token };
}

export function acknowledgeAgreementUpdates(
  current: StoredAgreement,
  role: PartyRole,
  throughSequence: number,
) {
  const agreement = normalizeAgreement(current);
  const latest = latestEventSequence(agreement);
  const state = agreement.notifications[role];
  const acknowledgedThrough = Math.max(state.acknowledgedThrough, Math.min(throughSequence, latest));
  if (acknowledgedThrough > state.acknowledgedThrough) {
    state.acknowledgedThrough = acknowledgedThrough;
    advanceUpdatedAt(agreement);
  }
  return agreement;
}

export function issueSignatureChallenge(current: StoredAgreement, role: PartyRole) {
  const agreement = normalizeAgreement(current);
  assert(agreement.status === "ready", "Both parties must approve before signing.", "not_ready", 409);
  assert(!agreement.signatures[role], "This party has already signed.", "already_signed", 409);
  const existing = agreement.signatureChallenges[role];
  if (existing && Date.now() - Date.parse(existing.createdAt) < 30_000) {
    throw new AgreementError("Wait a moment before requesting another code.", "code_rate_limited", 429, {
      retryAfterSeconds: 30,
    });
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const createdAt = now();
  agreement.signatureChallenges[role] = {
    codeHash: sha256(`${agreement.id}:${role}:${code}`),
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + signatureCodeLifetimeMs).toISOString(),
    attempts: 0,
  };
  advanceUpdatedAt(agreement);
  return { agreement, code };
}

function validateSignatureChallenge(
  agreement: StoredAgreement,
  role: PartyRole,
  challenge: SignatureChallenge | undefined,
  code: string,
) {
  assert(challenge, "Request a signature code first.", "signature_code_required", 409);
  assert(Date.parse(challenge.expiresAt) > Date.now(), "The signature code has expired.", "signature_code_expired", 409);
  assert(challenge.attempts < 5, "Too many incorrect attempts. Request a new code.", "signature_code_locked", 429);
  if (challenge.codeHash !== sha256(`${agreement.id}:${role}:${code.trim()}`)) {
    challenge.attempts += 1;
    throw new AgreementError("The signature code is incorrect.", "signature_code_invalid", 400, {
      attemptsRemaining: Math.max(0, 5 - challenge.attempts),
      challenge,
    });
  }
}

function validateParticipantUpdate(
  agreement: StoredAgreement,
  context: ActionContext,
  action: Extract<AgreementAction, { type: "update_participant" }>,
) {
  assert(
    context.role === "author" || context.role === action.role,
    "A signer can correct only their own participant details.",
    "forbidden",
    403,
  );
  assert(!agreement.signatures.author && !agreement.signatures.signer, "Participant details cannot change after signing begins.", "signature_started", 409);
  const entries = Object.entries(action.participant).filter(([, value]) => typeof value === "string");
  assert(entries.length > 0, "At least one participant field is required.", "empty_update");
  const current = agreement[action.role];
  const updated = { ...current, ...action.participant, role: action.role } as Party;
  assert(
    context.role === "author" || updated.email.toLowerCase() === current.email.toLowerCase(),
    "Only the author can change the invitation email.",
    "forbidden",
    403,
  );
  assert(updated.legalName.trim(), "Legal name is required.", "legal_name_required");
  assert(updated.address.trim(), "Address is required.", "address_required");
  assert(updated.signatoryName.trim(), "Signatory name is required.", "signatory_name_required");
  assert(updated.signatoryTitle.trim(), "Signatory title is required.", "signatory_title_required");
  assert(updated.email.trim(), "Email is required.", "email_required");
  return updated;
}

export function executeAgreementAction(
  current: StoredAgreement,
  context: ActionContext,
  action: AgreementAction,
): StoredAgreement {
  const agreement = normalizeAgreement(current);
  assert(!terminalStatuses.has(agreement.status), "This agreement is closed and read-only.", "agreement_closed", 409);

  switch (action.type) {
    case "update_document_fields": {
      assert(context.role === "author", "Only the author can edit a draft.", "forbidden", 403);
      assert(agreement.status === "draft", "Direct editing is available only in draft.", "not_draft", 409);
      const entries = Object.entries(action.fields) as [keyof AgreementFields, string][];
      assert(entries.length > 0, "At least one field is required.", "empty_update");
      assert(
        !entries.some(([key, value]) => key === knownInformationField("signer") && value !== agreement.fields[key]),
        "The signer supplies its own previously known information during review.",
        "forbidden",
        403,
      );
      assert(
        agreement.kind === "mutual"
          || !entries.some(([key, value]) => key === knownInformationField("author") && value !== agreement.fields[key]),
        "The disclosing party does not have a previously known information appendix in a one-way NDA.",
        "invalid_field",
      );
      for (const [key, value] of entries) agreement.fields[key] = value;
      touchDocument(agreement);
      audit(agreement, context, "document.updated", "Updated document details", { fields: entries.map(([key]) => key) });
      return agreement;
    }
    case "restore_version": {
      assert(context.role === "author", "Only the author can restore a document version.", "forbidden", 403);
      assert(agreement.status === "draft" || agreement.status === "review" || agreement.status === "ready", "This version cannot be restored now.", "restore_unavailable", 409);
      const historical = agreement.versions.find((item) => item.version === action.version);
      assert(historical, "The requested version does not exist.", "version_not_found", 404);
      assert(historical.version !== agreement.version, "That version is already current.", "version_current", 409);
      for (const redline of agreement.redlines.filter((item) => item.status === "open")) {
        redline.status = "superseded";
        redline.resolvedAt = now();
        redline.resolvedBy = context.role;
        redline.resolvedBySource = context.source;
      }
      agreement.fields = structuredClone(historical.fields);
      agreement.sections = structuredClone(historical.sections);
      touchDocument(agreement);
      audit(agreement, context, "document.version_restored", `Restored document terms from version ${historical.version}`, {
        restoredVersion: historical.version,
        resultingVersion: agreement.version,
      });
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
      audit(agreement, context, "document.updated", `Updated ${section.title}`, { sectionId: section.id });
      return agreement;
    }
    case "update_participant": {
      const previous = structuredClone(agreement[action.role]);
      const participant = validateParticipantUpdate(agreement, context, action);
      agreement[action.role] = participant;
      touchDocument(agreement);
      audit(agreement, context, "participant.corrected", `Corrected ${action.role} details`, {
        role: action.role,
        changedFields: Object.keys(action.participant),
        emailChanged: previous.email.toLowerCase() !== participant.email.toLowerCase(),
      });
      return agreement;
    }
    case "invite": {
      assert(context.role === "author", "Only the author can send the invitation.", "forbidden", 403);
      assert(agreement.status === "draft", "The agreement has already been sent for review.", "already_invited", 409);
      agreement.status = "review";
      agreement.invitedAt = nextTimestamp(agreement.updatedAt);
      agreement.updatedAt = agreement.invitedAt;
      audit(agreement, context, "participant.invited", `Invited ${agreement.signer.email} to review`, {
        email: agreement.signer.email,
      });
      return agreement;
    }
    case "propose_redline": {
      assert(
        agreement.status === "review" || agreement.status === "ready",
        "Redlines are available after the agreement is invited.",
        "not_in_review",
        409,
      );
      if (action.target.kind === "field") {
        if (action.target.id === knownInformationField("author")) {
          assert(agreement.kind === "mutual", "This appendix is available only in a mutual NDA.", "invalid_field");
          assert(context.role === "author", "Only the author may identify the author’s previously known information.", "forbidden", 403);
        }
        if (action.target.id === knownInformationField("signer")) {
          assert(context.role === "signer", "Only the signer may identify the signer’s previously known information.", "forbidden", 403);
        }
      }
      const redline = createRedline(agreement, context, action.target, action.proposedValue, action.rationale);
      audit(agreement, context, "redline.proposed", `Proposed a change to ${redline.target.id}`, {
        redlineId: redline.id,
        target: redline.target,
      });
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
      redline.resolvedBySource = context.source;

      if (action.decision === "accept") {
        redline.status = "accepted";
        setTargetValue(agreement, redline.target, redline.proposedValue);
        touchDocument(agreement);
        audit(agreement, context, "redline.accepted", `Accepted a change to ${redline.target.id}`, { redlineId: redline.id });
        return agreement;
      }
      if (action.decision === "reject") {
        redline.status = "rejected";
        advanceUpdatedAt(agreement);
        audit(agreement, context, "redline.rejected", `Rejected a change to ${redline.target.id}`, { redlineId: redline.id });
        return agreement;
      }

      const counterValue = action.counterValue;
      assert(typeof counterValue === "string" && counterValue.trim(), "Counterproposal text is required.", "counter_required");
      redline.status = "superseded";
      const counter = createRedline(agreement, context, redline.target, counterValue, action.rationale ?? "Counterproposal", redline.proposedValue);
      redline.supersededBy = counter.id;
      audit(agreement, context, "redline.countered", `Countered a change to ${redline.target.id}`, {
        redlineId: redline.id,
        counterRedlineId: counter.id,
      });
      return agreement;
    }
    case "resend_invitation": {
      assert(context.role === "author", "Only the author can refresh the invitation.", "forbidden", 403);
      assert(agreement.status !== "draft", "Invite the signer before refreshing their link.", "not_invited", 409);
      advanceUpdatedAt(agreement);
      audit(agreement, context, "participant.reinvited", `Refreshed the review link for ${agreement.signer.email}`, {
        email: agreement.signer.email,
      });
      return agreement;
    }
    case "mark_ready": {
      assert(agreement.status === "review", "The agreement is not in review.", "not_in_review", 409);
      assert(!agreement.redlines.some((item) => item.status === "open"), "Resolve all open redlines first.", "open_redlines", 409);
      agreement.readiness[context.role] = true;
      advanceUpdatedAt(agreement);
      if (agreement.readiness.author && agreement.readiness.signer) agreement.status = "ready";
      audit(agreement, context, "party.ready", "Approved the current version for signature");
      return agreement;
    }
    case "decline": {
      assert(context.role === "signer", "Only the invited signer can decline this agreement.", "forbidden", 403);
      assert(action.reason.trim(), "A reason is required.", "reason_required");
      agreement.status = "declined";
      advanceUpdatedAt(agreement);
      agreement.termination = { type: "declined", role: context.role, reason: action.reason.trim(), at: agreement.updatedAt };
      agreement.signatureChallenges = {};
      audit(agreement, context, "agreement.declined", "Declined the agreement", { reason: action.reason.trim() });
      return agreement;
    }
    case "void": {
      assert(context.role === "author", "Only the author can void this agreement.", "forbidden", 403);
      assert(action.reason.trim(), "A reason is required.", "reason_required");
      agreement.status = "voided";
      advanceUpdatedAt(agreement);
      agreement.termination = { type: "voided", role: context.role, reason: action.reason.trim(), at: agreement.updatedAt };
      agreement.signatureChallenges = {};
      audit(agreement, context, "agreement.voided", "Voided the agreement", { reason: action.reason.trim() });
      return agreement;
    }
    case "sign": {
      assert(context.source === "human", "An agent cannot sign an agreement.", "human_signature_required", 403);
      assert(agreement.status === "ready", "Both parties must approve the current version before signing.", "not_ready", 409);
      assert(!agreement.signatures[context.role], "This party has already signed.", "already_signed", 409);
      assert(action.typedName.trim(), "Enter the signatory name.", "signature_name_required");
      assert(action.consentVersion === signatureConsentVersion, "Review and accept the current electronic-signature consent.", "signature_consent_required", 409);
      const challenge = agreement.signatureChallenges[context.role];
      validateSignatureChallenge(agreement, context.role, challenge, action.code);
      const signedAt = nextTimestamp(agreement.updatedAt);
      agreement.signatures[context.role] = {
        role: context.role,
        typedName: action.typedName.trim(),
        signedAt,
        documentVersion: agreement.version,
        verifiedEmail: agreement[context.role].email,
        verificationMethod: "email_code",
        consentVersion: action.consentVersion,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };
      delete agreement.signatureChallenges[context.role];
      agreement.updatedAt = signedAt;
      audit(agreement, context, "party.signed", "Signed the agreement", {
        verifiedEmail: agreement[context.role].email,
        verificationMethod: "email_code",
        consentVersion: action.consentVersion,
      });
      if (agreement.signatures.author && agreement.signatures.signer) {
        agreement.status = "signed";
        agreement.execution = {
          documentVersion: agreement.version,
          finalizedAt: signedAt,
        };
      }
      return agreement;
    }
  }
}

export function toAgreementView(current: StoredAgreement, viewerRole: PartyRole): AgreementView {
  const agreement = normalizeAgreement(current);
  const cloned = structuredClone(agreement);
  delete (cloned as Partial<StoredAgreement>).access;
  delete cloned.ownerUserId;
  delete (cloned as Partial<StoredAgreement>).profileAccess;
  delete (cloned as Partial<StoredAgreement>).processedActionKeys;
  delete (cloned as Partial<StoredAgreement>).signatureChallenges;
  delete (cloned as Partial<StoredAgreement>).notifications;
  const publicAgreement = cloned as Agreement;
  const openRedlines = agreement.redlines.some((item) => item.status === "open");
  const closed = terminalStatuses.has(agreement.status);
  return {
    ...publicAgreement,
    viewerRole,
    eventSequence: latestEventSequence(agreement),
    reviewBaseline: reviewBaseline(agreement),
    permissions: {
      canEditDraft: viewerRole === "author" && agreement.status === "draft",
      canCorrectParticipants: !closed && !agreement.signatures.author && !agreement.signatures.signer,
      canInvite: viewerRole === "author" && agreement.status === "draft",
      canRedline: agreement.status === "review" || agreement.status === "ready",
      canRespondToRedlines:
        agreement.status === "review" &&
        agreement.redlines.some((item) => item.status === "open" && item.proposedBy !== viewerRole),
      canMarkReady: agreement.status === "review" && !openRedlines && !agreement.readiness[viewerRole],
      canSign: agreement.status === "ready" && !agreement.signatures[viewerRole],
      canDecline: viewerRole === "signer" && !closed,
      canVoid: viewerRole === "author" && !closed,
      canResendInvitation: viewerRole === "author" && agreement.status !== "draft" && !closed,
      canRestoreVersion: viewerRole === "author" && !closed,
      canRetrieveExecutedPackage: agreement.status === "signed" && Boolean(agreement.execution),
    },
  };
}
