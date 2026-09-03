import type { AgreementKind, AgreementSection, CreateAgreementInput } from "./types";

// The structure follows conventional NDA provisions described in WIPO's Guide to
// Trade Secrets and Innovation and common commercial agreements filed with the SEC.
function roleLanguage(kind: AgreementKind, authorName: string, signerName: string) {
  return kind === "mutual"
    ? "Each Party may disclose Confidential Information to the other. For each disclosure, the Party providing information is the “Disclosing Party” and the Party receiving it is the “Receiving Party.”"
    : `${authorName} is the “Disclosing Party,” and ${signerName} is the “Receiving Party.” Only information disclosed by or on behalf of the Disclosing Party is protected under this Agreement.`;
}

export function createNdaSections(input: CreateAgreementInput): AgreementSection[] {
  const authorName = input.author.legalName;
  const signerName = input.signer.legalName;
  const appendixReference = input.kind === "mutual" ? "Appendices A and B" : "Appendix A";

  return [
    {
      id: "purpose-and-roles",
      title: "1. Purpose and Roles",
      body: `${roleLanguage(input.kind, authorName, signerName)} The Receiving Party may use Confidential Information solely to evaluate or pursue ${input.fields.purpose} (the “Purpose”).`,
    },
    {
      id: "confidential-information",
      title: "2. Confidential Information",
      body: "“Confidential Information” means non-public business, technical, financial, product, customer, security, operational, or other information disclosed in any form that is marked or identified as confidential or that a reasonable person would understand to be confidential given its nature and the circumstances of disclosure. It includes notes, analyses, and materials derived from such information.",
    },
    {
      id: "use-and-protection",
      title: "3. Use and Protection",
      body: "The Receiving Party will use Confidential Information only for the Purpose, protect it with at least reasonable care and no less than the care used for its own similar information, and disclose it only to its employees, officers, contractors, and professional advisers who need to know it for the Purpose and are bound by confidentiality obligations at least as protective as this Agreement. The Receiving Party remains responsible for their compliance.",
    },
    {
      id: "exclusions",
      title: "4. Exclusions",
      body: `Confidential Information does not include information the Receiving Party can demonstrate with contemporaneous written records: (a) was lawfully known to it without restriction before disclosure; (b) is or becomes publicly available through no breach of this Agreement; (c) is lawfully received from a third party without a confidentiality duty; or (d) is independently developed without use of or reference to the Confidential Information. The Parties may identify previously known information in ${appendixReference}; an omission does not eliminate an exclusion the Receiving Party can otherwise prove.`,
    },
    {
      id: "required-disclosure",
      title: "5. Required Disclosure",
      body: "The Receiving Party may disclose Confidential Information to the extent required by law, regulation, or court order if, to the extent legally permitted, it promptly notifies the Disclosing Party and reasonably assists at the Disclosing Party’s expense in seeking a protective order or confidential treatment. The Receiving Party will disclose only the legally required portion.",
    },
    {
      id: "return-or-destruction",
      title: "6. Return or Destruction",
      body: "Upon written request, the Receiving Party will promptly return or destroy Confidential Information and, upon request, confirm completion in writing. It may retain copies required by law or contained in routine backups that are not readily accessible, provided all retained information remains protected under this Agreement.",
    },
    {
      id: "ownership",
      title: "7. Ownership; No License or Commitment",
      body: "Each Disclosing Party retains all right, title, and interest in its Confidential Information. No patent, copyright, trademark, trade-secret, or other intellectual-property license is granted except the limited right to use Confidential Information for the Purpose. Neither Party is obligated to proceed with a transaction, and Confidential Information is provided without warranty except as expressly agreed in writing.",
    },
    {
      id: "term",
      title: "8. Term and Survival",
      body: "This Agreement begins on the Effective Date and continues for two years unless ended earlier by written notice. The confidentiality and use obligations survive for three years after each disclosure; trade secrets remain protected for as long as they qualify as trade secrets under applicable law.",
    },
    {
      id: "remedies",
      title: "9. Remedies",
      body: "The Parties acknowledge that unauthorized use or disclosure may cause irreparable harm for which monetary damages may be inadequate. A Disclosing Party may seek appropriate equitable relief in addition to other remedies available at law, subject to applicable law.",
    },
    {
      id: "general",
      title: "10. General",
      body: `This Agreement is governed by the laws of ${input.fields.governingLaw}, without regard to conflict-of-law rules. It is the entire agreement concerning its subject and supersedes prior discussions on that subject. Any amendment or waiver must be in a writing accepted by both Parties. Neither Party may assign this Agreement without the other Party’s written consent, except in connection with a merger, reorganization, or sale of substantially all relevant assets. If any provision is unenforceable, it will be limited to the minimum extent necessary and the remainder will remain effective. Notices must be sent to the addresses stated above. Counterparts and electronic signatures are permitted.`,
    },
  ];
}
