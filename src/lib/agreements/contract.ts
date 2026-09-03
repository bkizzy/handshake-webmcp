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
  preExistingMaterials: "Pre-existing materials",
};

export const signatureConsentVersion = "handshake-esign-consent-v1";

export function templateForKind(kind: AgreementKind): AgreementTemplate {
  return {
    id: kind === "mutual" ? "handshake-mutual-nda" : "handshake-one-way-nda",
    name: kind === "mutual" ? "Mutual non-disclosure agreement" : "One-way non-disclosure agreement",
    version: "1.0",
  };
}

export function targetKey(target: { kind: "field" | "section"; id: string }) {
  return `${target.kind}:${target.id}`;
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

function partyMarkdown(agreement: Agreement, role: PartyRole) {
  const party = agreement[role];
  return [
    `**${party.legalName}**`,
    party.address,
    `${party.signatoryName}, ${party.signatoryTitle}`,
    party.email,
  ].join("  \n");
}

export function renderAgreementMarkdown(agreement: Agreement) {
  const details = (Object.keys(agreementFieldLabels) as Array<keyof AgreementFields>)
    .map((key) => `- **${agreementFieldLabels[key]}:** ${agreement.fields[key] || "None listed"}`)
    .join("\n");
  const sections = agreement.sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
  const signatures = (["author", "signer"] as PartyRole[]).map((role) => {
    const party = agreement[role];
    const signature = agreement.signatures[role];
    return signature
      ? `### ${role === "author" ? "Author" : "Signer"}\n\nSigned electronically by **${signature.typedName}**  \n${party.signatoryTitle}, ${party.legalName}  \n${signature.signedAt} UTC  \nVerified by ${signature.verificationMethod.replace("_", " ")}`
      : `### ${role === "author" ? "Author" : "Signer"}\n\n${party.signatoryName}  \n${party.signatoryTitle}, ${party.legalName}`;
  }).join("\n\n");

  return `# ${agreement.title}\n\n_${agreement.template.name}_\n\n${details}\n\n## Parties\n\n### Author\n\n${partyMarkdown(agreement, "author")}\n\n### Signer\n\n${partyMarkdown(agreement, "signer")}\n\n${sections}\n\n## Signatures\n\n${signatures}\n`;
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
