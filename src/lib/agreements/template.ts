import type { AgreementKind, AgreementSection, CreateAgreementInput } from "./types";

// Adapted from the Common Paper Mutual Non-Disclosure Agreement Version 1.0,
// licensed under CC BY 4.0. The source and license are preserved in every new
// agreement's template metadata and rendered document.
function introduction(kind: AgreementKind) {
  if (kind === "mutual") {
    return "This Mutual Non-Disclosure Agreement allows each party (a “Disclosing Party”) to disclose or make available Confidential Information to the other party (a “Receiving Party”) in connection with the Purpose. “Confidential Information” means information that the Disclosing Party identifies as confidential or proprietary, or that should reasonably be understood as confidential or proprietary because of its nature and the circumstances of disclosure. It includes the existence and status of the parties’ discussions; information on the cover page; and technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions, and know-how. Each signatory is a “Party” and together they are the “Parties.”";
  }
  return "This One-Way Non-Disclosure Agreement allows the First Party (the “Disclosing Party”) to disclose or make available Confidential Information to the Second Party (the “Receiving Party”) in connection with the Purpose. “Confidential Information” means information that the Disclosing Party identifies as confidential or proprietary, or that should reasonably be understood as confidential or proprietary because of its nature and the circumstances of disclosure. It includes the existence and status of the parties’ discussions; information on the cover page; and technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions, and know-how. Only information disclosed by or on behalf of the Disclosing Party is protected under this Agreement.";
}

export function createNdaSections(input: CreateAgreementInput): AgreementSection[] {
  const appendixReference = input.kind === "mutual" ? "Appendices A and B" : "Appendix A";
  return [
    { id: "introduction", title: "1. Introduction", body: introduction(input.kind) },
    {
      id: "use-and-protection",
      title: "2. Use and Protection of Confidential Information",
      body: "The Receiving Party shall: (a) use Confidential Information solely for the Purpose; (b) not disclose Confidential Information to third parties without the Disclosing Party’s prior written approval, except to employees, agents, advisors, contractors, and other representatives who have a reasonable need to know for the Purpose and are bound by confidentiality obligations no less protective than this Agreement, with the Receiving Party remaining responsible for their compliance; and (c) protect Confidential Information using at least the same protections it uses for its own similar information, but no less than a reasonable standard of care.",
    },
    {
      id: "exceptions",
      title: "3. Exceptions",
      body: `The Receiving Party’s obligations do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed before receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information. The Parties may identify previously known information in ${appendixReference}; an omission does not eliminate an exception the Receiving Party can otherwise demonstrate.`,
    },
    {
      id: "required-disclosure",
      title: "4. Disclosures Required by Law",
      body: "The Receiving Party may disclose Confidential Information to the extent required by law, regulation, regulatory authority, subpoena, or court order, provided that, to the extent legally permitted, it gives the Disclosing Party reasonable advance notice and reasonably cooperates, at the Disclosing Party’s expense, with efforts to obtain confidential treatment.",
    },
    {
      id: "term",
      title: "5. Term and Termination",
      body: "This Agreement begins on the Effective Date. The period for sharing Confidential Information expires one year after the Effective Date. Either Party may terminate this Agreement for any or no reason by written notice. The Receiving Party’s confidentiality and use obligations survive for two years after the date of the last disclosure, except that trade secrets remain protected for as long as they qualify as trade secrets under applicable law.",
    },
    {
      id: "return-or-destruction",
      title: "6. Return or Destruction of Confidential Information",
      body: "Upon expiration or termination of this Agreement or the Disclosing Party’s earlier written request, the Receiving Party will cease using Confidential Information and promptly return or destroy Confidential Information in its possession or control. If requested, it will confirm compliance in writing. The Receiving Party may retain information under standard backup or record-retention policies or as required by law, but this Agreement continues to apply to retained information.",
    },
    { id: "proprietary-rights", title: "7. Proprietary Rights", body: "The Disclosing Party retains all intellectual-property and other rights in its Confidential Information. Disclosure grants no license under those rights." },
    { id: "disclaimer", title: "8. Disclaimer", body: "ALL CONFIDENTIAL INFORMATION IS PROVIDED “AS IS,” WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY, AND FITNESS FOR A PARTICULAR PURPOSE." },
    {
      id: "governing-law",
      title: "9. Governing Law and Jurisdiction",
      body: "This Agreement and all matters relating to it are governed by the Governing Law identified on the cover page, without regard to conflict-of-law rules. Any legal action relating to this Agreement must be brought in the federal or state courts located in that jurisdiction, and each Party submits to those courts’ exclusive jurisdiction.",
    },
    { id: "equitable-relief", title: "10. Equitable Relief", body: "A breach of this Agreement may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach, the Disclosing Party may seek appropriate equitable relief, including an injunction, in addition to its other remedies." },
    {
      id: "general",
      title: "11. General",
      body: "Neither Party is obligated to disclose Confidential Information or proceed with a proposed transaction. Neither Party may assign this Agreement without the other Party’s prior written consent, except in connection with a merger, reorganization, acquisition, or transfer of all or substantially all assets or voting securities. An impermissible assignment is void. This Agreement binds permitted successors and assigns. Waivers must be signed and cannot be implied from conduct. If a provision is unenforceable, it will be limited to the minimum extent necessary and the remainder will remain effective. This Agreement, including its cover page and appendices, is the entire agreement on its subject and supersedes prior or contemporaneous understandings. Amendments, modifications, waivers, and supplements must be in a writing accepted by both Parties. Notices, requests, and approvals must be sent to the email or postal addresses on the cover page and are delivered on receipt. Counterparts and electronic signatures are permitted.",
    },
  ];
}
