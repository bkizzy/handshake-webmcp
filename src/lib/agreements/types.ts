export type PartyRole = "author" | "signer";
export type ActorSource = "human" | "agent";
export type AgreementStatus = "draft" | "review" | "ready" | "signed" | "declined" | "voided";
export type AgreementKind = "one-way" | "mutual";

export type AccessGrant = {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

export type AgreementTemplate = {
  id: string;
  name: string;
  version: string;
};

export type Party = {
  role: PartyRole;
  legalName: string;
  address: string;
  signatoryName: string;
  signatoryTitle: string;
  email: string;
};

export type AgreementFields = {
  effectiveDate: string;
  purpose: string;
  governingLaw: string;
  preExistingMaterials: string;
};

export type AgreementSection = {
  id: string;
  title: string;
  body: string;
};

export type RedlineTarget =
  | { kind: "field"; id: keyof AgreementFields }
  | { kind: "section"; id: string };

export type RedlineStatus = "open" | "accepted" | "rejected" | "superseded";

export type Redline = {
  id: string;
  target: RedlineTarget;
  proposedBy: PartyRole;
  proposedBySource: ActorSource;
  currentValue: string;
  proposedValue: string;
  rationale: string;
  status: RedlineStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: PartyRole;
  resolvedBySource?: ActorSource;
  supersededBy?: string;
};

export type Signature = {
  role: PartyRole;
  typedName: string;
  signedAt: string;
  documentVersion: number;
  verifiedEmail: string;
  verificationMethod: "email_code" | "legacy_capability";
  consentVersion: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditEventType =
  | "agreement.created"
  | "document.updated"
  | "participant.corrected"
  | "participant.invited"
  | "participant.reinvited"
  | "redline.proposed"
  | "redline.accepted"
  | "redline.rejected"
  | "redline.countered"
  | "party.ready"
  | "party.signed"
  | "agreement.declined"
  | "agreement.voided";

export type AuditEvent = {
  id: string;
  sequence: number;
  type: AuditEventType;
  actorRole: PartyRole;
  actorSource: ActorSource;
  summary: string;
  createdAt: string;
  version: number;
  details?: Record<string, unknown>;
};

export type AgreementVersion = {
  version: number;
  createdAt: string;
  fields: AgreementFields;
  sections: AgreementSection[];
  author?: Party;
  signer?: Party;
};

export type CanonicalAgreementRecord = {
  agreementId: string;
  template: AgreementTemplate;
  title: string;
  kind: AgreementKind;
  createdAt: string;
  finalizedAt: string;
  parties: Array<{
    role: PartyRole;
    legalName: string;
    address: string;
    signatoryName: string;
    signatoryTitle: string;
    email: string;
  }>;
  finalTerms: Array<{ id: string; label: string; value: string }>;
  finalContractText: string;
  auditEvents: AuditEvent[];
  signatures: Signature[];
};

export type ExecutionRecord = {
  documentVersion: number;
  finalizedAt: string;
  sealedAt?: string;
  sealHash?: string;
  canonicalJson?: string;
  /** Legacy hashes remain readable but are not represented as comprehensive seals. */
  sha256?: string;
};

export type TerminationRecord = {
  type: "declined" | "voided";
  role: PartyRole;
  reason: string;
  at: string;
};

export type Agreement = {
  id: string;
  title: string;
  kind: AgreementKind;
  template: AgreementTemplate;
  status: AgreementStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  invitedAt?: string;
  author: Party;
  signer: Party;
  fields: AgreementFields;
  sections: AgreementSection[];
  redlines: Redline[];
  readiness: Record<PartyRole, boolean>;
  signatures: Partial<Record<PartyRole, Signature>>;
  versions: AgreementVersion[];
  execution?: ExecutionRecord;
  termination?: TerminationRecord;
  audit: AuditEvent[];
};

export type SignatureChallenge = {
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
};

export type NotificationState = {
  notifiedThrough: number;
  acknowledgedThrough: number;
  lastKind?: string;
  lastSentAt?: string;
  recoverySentAt?: string;
};

export type StoredAgreement = Agreement & {
  access: Partial<Record<PartyRole, AccessGrant | AccessGrant[]>>;
  ownerUserId?: string;
  processedActionKeys: string[];
  signatureChallenges: Partial<Record<PartyRole, SignatureChallenge>>;
  notifications: Record<PartyRole, NotificationState>;
};

export type AgreementView = Agreement & {
  viewerRole: PartyRole;
  eventSequence: number;
  reviewBaseline: {
    fields: AgreementFields;
    sections: AgreementSection[];
  };
  permissions: {
    canEditDraft: boolean;
    canCorrectParticipants: boolean;
    canInvite: boolean;
    canRedline: boolean;
    canRespondToRedlines: boolean;
    canMarkReady: boolean;
    canSign: boolean;
    canDecline: boolean;
    canVoid: boolean;
    canResendInvitation: boolean;
    canRetrieveExecutedPackage: boolean;
  };
};

export type CreateAgreementInput = {
  title: string;
  kind: AgreementKind;
  author: Omit<Party, "role">;
  signer: Omit<Party, "role">;
  fields: AgreementFields;
};

export type AgreementAction =
  | { type: "update_document_fields"; fields: Partial<AgreementFields> }
  | { type: "update_draft_section"; sectionId: string; body: string }
  | { type: "update_participant"; role: PartyRole; participant: Partial<Omit<Party, "role">> }
  | { type: "invite" }
  | { type: "propose_redline"; target: RedlineTarget; proposedValue: string; rationale: string }
  | {
      type: "respond_redline";
      redlineId: string;
      decision: "accept" | "reject" | "counter";
      counterValue?: string;
      rationale?: string;
    }
  | { type: "resend_invitation" }
  | { type: "mark_ready" }
  | { type: "decline"; reason: string }
  | { type: "void"; reason: string }
  | { type: "sign"; typedName: string; code: string; consentVersion: string };

export type ActionContext = {
  role: PartyRole;
  source: ActorSource;
  ipAddress?: string;
  userAgent?: string;
};

export type CertificatePartySummary = {
  role: PartyRole;
  legalName: string;
  agentProposals: number;
  humanNegotiationActions: number;
  readyAt?: string;
  signedAt?: string;
};

export type CertificateTermHistory = {
  id: string;
  label: string;
  openingValue: string;
  finalValue: string;
  changed: boolean;
  events: Array<{
    at: string;
    party: PartyRole;
    source: ActorSource;
    action: "proposed" | "accepted" | "rejected" | "countered";
    value?: string;
    rationale?: string;
  }>;
  agreedAt?: string;
};

export type NegotiationCertificate = {
  agreementId: string;
  template: AgreementTemplate;
  title: string;
  kind: AgreementKind;
  parties: Array<{ role: PartyRole; legalName: string }>;
  createdAt: string;
  signedAt: string;
  sealHash: string;
  sealedAt: string;
  partySummaries: CertificatePartySummary[];
  termHistory: CertificateTermHistory[];
  footer: string;
};
