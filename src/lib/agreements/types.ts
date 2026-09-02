export type PartyRole = "author" | "signer";
export type ActorSource = "human" | "agent";
export type AgreementStatus = "draft" | "review" | "ready" | "signed";
export type AgreementKind = "one-way" | "mutual";

export type AccessGrant = {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
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
  currentValue: string;
  proposedValue: string;
  rationale: string;
  status: RedlineStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: PartyRole;
  supersededBy?: string;
};

export type Signature = {
  role: PartyRole;
  typedName: string;
  signedAt: string;
  documentVersion: number;
};

export type AuditEvent = {
  id: string;
  type:
    | "agreement.created"
    | "document.updated"
    | "participant.invited"
    | "participant.reinvited"
    | "redline.proposed"
    | "redline.accepted"
    | "redline.rejected"
    | "redline.countered"
    | "party.ready"
    | "party.signed";
  actorRole: PartyRole;
  actorSource: ActorSource;
  summary: string;
  createdAt: string;
  version: number;
};

export type AgreementVersion = {
  version: number;
  createdAt: string;
  fields: AgreementFields;
  sections: AgreementSection[];
};

export type ExecutionRecord = {
  documentVersion: number;
  finalizedAt: string;
  sha256: string;
};

export type Agreement = {
  id: string;
  title: string;
  kind: AgreementKind;
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
  audit: AuditEvent[];
};

export type StoredAgreement = Agreement & {
  access: Partial<Record<PartyRole, AccessGrant>>;
  ownerUserId?: string;
  processedActionKeys: string[];
};

export type AgreementView = Agreement & {
  viewerRole: PartyRole;
  permissions: {
    canEditDraft: boolean;
    canInvite: boolean;
    canRedline: boolean;
    canRespondToRedlines: boolean;
    canMarkReady: boolean;
    canSign: boolean;
    canResendInvitation: boolean;
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
  | {
      type: "update_document_fields";
      fields: Partial<AgreementFields>;
    }
  | {
      type: "update_draft_section";
      sectionId: string;
      body: string;
    }
  | { type: "invite" }
  | {
      type: "propose_redline";
      target: RedlineTarget;
      proposedValue: string;
      rationale: string;
    }
  | {
      type: "respond_redline";
      redlineId: string;
      decision: "accept" | "reject" | "counter";
      counterValue?: string;
      rationale?: string;
    }
  | { type: "resend_invitation" }
  | { type: "mark_ready" }
  | { type: "sign"; typedName: string };

export type ActionContext = {
  role: PartyRole;
  source: ActorSource;
};
