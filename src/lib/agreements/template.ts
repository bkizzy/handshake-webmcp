import type { AgreementKind, AgreementSection, CreateAgreementInput } from "./types";

function disclosureLanguage(kind: AgreementKind, authorName: string, signerName: string) {
  return kind === "mutual"
    ? `Each party may disclose Confidential Information to the other. The party disclosing information is a “Disclosing Party,” and the party receiving it is a “Receiving Party.”`
    : `${authorName} may disclose Confidential Information to ${signerName}. ${authorName} is the “Disclosing Party” and ${signerName} is the “Receiving Party.”`;
}

export function createNdaSections(input: CreateAgreementInput): AgreementSection[] {
  const authorName = input.author.legalName;
  const signerName = input.signer.legalName;

  return [
    {
      id: "relationship",
      title: "1. Relationship and purpose",
      body: `${disclosureLanguage(input.kind, authorName, signerName)} The parties wish to evaluate or pursue ${input.fields.purpose}. Confidential Information may be used only for that purpose.`,
    },
    {
      id: "confidential-information",
      title: "2. Confidential information",
      body: "“Confidential Information” means non-public business, technical, financial, product, customer, or other information disclosed in any form that is marked confidential or that a reasonable person would understand to be confidential given its nature and the circumstances of disclosure.",
    },
    {
      id: "obligations",
      title: "3. Receiving party obligations",
      body: "The Receiving Party will protect Confidential Information using at least reasonable care, use it only for the stated purpose, and disclose it only to representatives who need to know it and are bound by confidentiality duties at least as protective as this agreement.",
    },
    {
      id: "exclusions",
      title: "4. Exclusions",
      body: "Confidential Information does not include information the Receiving Party can demonstrate was already lawfully known without restriction, becomes public through no breach of this agreement, is received lawfully from another source without restriction, or is independently developed without use of the Confidential Information.",
    },
    {
      id: "required-disclosure",
      title: "5. Required disclosure",
      body: "The Receiving Party may disclose Confidential Information when legally required, provided it gives prompt notice when legally permitted and reasonable assistance so the Disclosing Party may seek protective treatment.",
    },
    {
      id: "term",
      title: "6. Term and survival",
      body: "This agreement begins on the Effective Date and continues for two years. Confidentiality and use restrictions survive for three years after each disclosure, except trade secrets remain protected for as long as they qualify as trade secrets under applicable law.",
    },
    {
      id: "return",
      title: "7. Return or destruction",
      body: "On written request, the Receiving Party will return or destroy Confidential Information, except for archival copies maintained by automated backup or as required by law, which remain subject to this agreement.",
    },
    {
      id: "ownership",
      title: "8. Ownership and no license",
      body: "Each party retains ownership of its information and pre-existing materials. No license or other right is granted except the limited right to use Confidential Information for the stated purpose.",
    },
    {
      id: "general",
      title: "9. General",
      body: `This agreement is governed by the laws of ${input.fields.governingLaw}, without regard to conflict-of-law rules. It is the entire agreement on its subject and may be amended only in a writing accepted by both parties. Electronic signatures and counterparts are permitted.`,
    },
  ];
}

