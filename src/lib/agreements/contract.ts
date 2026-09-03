import type {
  Agreement,
  AgreementFields,
  AgreementKind,
  AgreementSection,
  AgreementTemplate,
  AgreementVersion,
  PartyRole,
} from "./types";

export const agreementFieldLabels: Record<keyof AgreementFields, string> = {
  effectiveDate: "Effective date",
  purpose: "Purpose",
  governingLaw: "Governing law",
  authorPreviouslyKnownInformation: "Author’s previously known information",
  signerPreviouslyKnownInformation: "Signer’s previously known information",
};

export const agreementSummaryFieldIds: Array<keyof AgreementFields> = [
  "effectiveDate",
  "purpose",
  "governingLaw",
];

export const signatureConsentVersion = "handshake-esign-consent-v1";

export function templateForKind(kind: AgreementKind): AgreementTemplate {
  return {
    id: kind === "mutual" ? "handshake-mutual-nda" : "handshake-one-way-nda",
    name: kind === "mutual" ? "Mutual non-disclosure agreement" : "One-way non-disclosure agreement",
    version: "2.0",
  };
}

export function targetKey(target: { kind: "field" | "section"; id: string }) {
  return `${target.kind}:${target.id}`;
}

export function knownInformationField(role: PartyRole): keyof AgreementFields {
  return role === "author" ? "authorPreviouslyKnownInformation" : "signerPreviouslyKnownInformation";
}

export function knownInformationLines(value: string | undefined) {
  const lines = (value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : ["None disclosed."];
}

export function visibleKnownInformationRoles(agreement: Pick<Agreement, "kind">): PartyRole[] {
  return agreement.kind === "mutual" ? ["author", "signer"] : ["signer"];
}

export function finalTerms(agreement: Agreement) {
  const fields = (Object.keys(agreementFieldLabels) as Array<keyof AgreementFields>).map((id) => ({
    id: `field:${id}`,
    label: agreementFieldLabels[id],
    value: agreement.fields[id],
  }));
  const sections = agreement.sections.map((section) => ({
    id: `section:${section.id}`,
    label: section.title,
    value: section.body,
  }));
  return [...fields, ...sections].sort((left, right) => left.id.localeCompare(right.id));
}

function partyBlock(agreement: Agreement, role: PartyRole) {
  const party = agreement[role];
  const definedRole = agreement.kind === "mutual"
    ? role === "author" ? "First Party" : "Second Party"
    : role === "author" ? "Disclosing Party" : "Receiving Party";
  return `**${party.legalName}** (the “${definedRole}”)  \n${party.address}  \nAttention: ${party.signatoryName}, ${party.signatoryTitle}  \n${party.email}`;
}

function signatureBlock(agreement: Agreement, role: PartyRole) {
  const party = agreement[role];
  const signature = agreement.signatures[role];
  const heading = agreement.kind === "mutual"
    ? role === "author" ? "First Party" : "Second Party"
    : role === "author" ? "Disclosing Party" : "Receiving Party";
  return signature
    ? `### ${heading}\n\n**${party.legalName}**  \nBy: **${signature.typedName}**  \nTitle: ${party.signatoryTitle}  \nSigned electronically: ${signature.signedAt} UTC  \nEmail verified: ${signature.verifiedEmail}`
    : `### ${heading}\n\n**${party.legalName}**  \nBy: ${party.signatoryName}  \nTitle: ${party.signatoryTitle}  \nDate: ____________________`;
}

export function renderAgreementMarkdown(agreement: Agreement) {
  const parties = agreement.kind === "mutual"
    ? `This Mutual Non-Disclosure Agreement (the “Agreement”) is entered into as of **${agreement.fields.effectiveDate}** (the “Effective Date”) by and between:\n\n${partyBlock(agreement, "author")}\n\nand\n\n${partyBlock(agreement, "signer")}\n\nEach may be a “Disclosing Party” or “Receiving Party” depending on the circumstances, and together they are the “Parties.”`
    : `This Non-Disclosure Agreement (the “Agreement”) is entered into as of **${agreement.fields.effectiveDate}** (the “Effective Date”) by and between:\n\n${partyBlock(agreement, "author")}\n\nand\n\n${partyBlock(agreement, "signer")}\n\nTogether, they are the “Parties.”`;
  const sections = agreement.sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
  const appendices = visibleKnownInformationRoles(agreement).map((role, index) => {
    const party = agreement[role];
    const value = agreement.fields[knownInformationField(role)]?.trim() || "None disclosed.";
    const letter = String.fromCharCode(65 + index);
    return `## Appendix ${letter} — Previously Known Information of ${party.legalName}\n\nThe following information is identified by ${party.legalName} as information it knew lawfully and without restriction before disclosure under this Agreement:\n\n${knownInformationLines(value).map((line) => `- ${line}`).join("\n")}`;
  }).join("\n\n");
  return `# ${agreement.title}\n\n_${agreement.template.name} · Template ${agreement.template.version}_\n\n${parties}\n\n**Purpose.** The Parties wish to evaluate or pursue ${agreement.fields.purpose}.\n\n${sections}\n\n## Signatures\n\nThe Parties intend electronic signatures to have the same effect as original signatures.\n\n${signatureBlock(agreement, "author")}\n\n${signatureBlock(agreement, "signer")}\n\n${appendices}\n`;
}

function versionForReview(agreement: Agreement): AgreementVersion | undefined {
  const invitation = agreement.audit.find((event) => event.type === "participant.invited");
  const version = invitation?.version ?? agreement.versions[0]?.version;
  return agreement.versions.find((candidate) => candidate.version === version) ?? agreement.versions[0];
}

export function reviewBaseline(agreement: Agreement): { fields: AgreementFields; sections: AgreementSection[] } {
  const baseline = versionForReview(agreement);
  return {
    fields: structuredClone(baseline?.fields ?? agreement.fields),
    sections: structuredClone(baseline?.sections ?? agreement.sections),
  };
}
