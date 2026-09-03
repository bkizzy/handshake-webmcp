import { webcrypto } from "node:crypto";

import { finalTerms, renderAgreementMarkdown } from "./contract";
import type { CanonicalAgreementRecord, StoredAgreement } from "./types";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  return value;
}

export function stableStringify(value: unknown) {
  return JSON.stringify(sortKeys(value));
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildCanonicalRecord(agreement: StoredAgreement): CanonicalAgreementRecord {
  const signatures = [agreement.signatures.author, agreement.signatures.signer]
    .filter((signature): signature is NonNullable<typeof signature> => Boolean(signature))
    .sort((left, right) => left.role.localeCompare(right.role));
  return {
    agreementId: agreement.id,
    template: agreement.template,
    title: agreement.title,
    kind: agreement.kind,
    createdAt: agreement.createdAt,
    finalizedAt: agreement.execution?.finalizedAt ?? agreement.updatedAt,
    parties: ([agreement.author, agreement.signer]).map((party) => ({
      role: party.role,
      legalName: party.legalName,
      address: party.address,
      signatoryName: party.signatoryName,
      signatoryTitle: party.signatoryTitle,
      email: party.email,
    })),
    finalTerms: finalTerms(agreement),
    finalContractText: renderAgreementMarkdown(agreement),
    auditEvents: [...agreement.audit].sort((left, right) => left.sequence - right.sequence),
    signatures,
  };
}

export async function sealSignedAgreement(current: StoredAgreement) {
  if (current.status !== "signed") return current;
  if (current.execution?.canonicalJson && current.execution.sealHash) return current;
  const agreement = structuredClone(current);
  const canonicalJson = stableStringify(buildCanonicalRecord(agreement));
  const sealHash = await sha256Hex(canonicalJson);
  agreement.execution = {
    documentVersion: agreement.version,
    finalizedAt: agreement.updatedAt,
    sealedAt: new Date().toISOString(),
    sealHash,
    canonicalJson,
  };
  return agreement;
}

export async function verifyAgreementSeal(agreement: StoredAgreement) {
  const execution = agreement.execution;
  if (!execution?.canonicalJson || !execution.sealHash || !execution.sealedAt) {
    return {
      valid: false,
      sealHash: execution?.sealHash ?? execution?.sha256 ?? null,
      computedHash: null,
      sealedAt: execution?.sealedAt ?? null,
      legacy: Boolean(execution?.sha256),
    };
  }
  const computedHash = await sha256Hex(execution.canonicalJson);
  const currentCanonicalJson = stableStringify(buildCanonicalRecord(agreement));
  const recordMatches = currentCanonicalJson === execution.canonicalJson;
  return {
    valid: computedHash === execution.sealHash && recordMatches,
    sealHash: execution.sealHash,
    computedHash,
    sealedAt: execution.sealedAt,
    legacy: false,
    recordMatches,
  };
}
