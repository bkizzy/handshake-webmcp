import type { AgreementSummary, PartyRole, StoredAgreement } from "./types";

export function toAgreementSummary(agreement: StoredAgreement): AgreementSummary {
  return {
    id: agreement.id,
    title: agreement.title,
    status: agreement.status,
    version: agreement.version,
    updatedAt: agreement.updatedAt,
    counterpartyLegalName: agreement.signer.legalName,
    hasOpenRedlines: agreement.redlines.some((redline) => redline.status === "open" || redline.status === "pending_confirmation"),
    readiness: structuredClone(agreement.readiness),
    signedRoles: (["author", "signer"] as PartyRole[]).filter((role) => Boolean(agreement.signatures[role])),
  };
}
