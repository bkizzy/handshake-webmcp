export const faqSections = [
  {
    title: "Getting started",
    items: [
      { question: "What is Mutual Assent AI?", answer: "Mutual Assent AI is an electronic agreement workspace designed for people and their AI agents. It supports document creation, invited review, redlines, approval, human signatures, version history, and an execution record." },
      { question: "Which agreements can I create?", answer: "The current beta supports one-way and mutual non-disclosure agreements. Additional agreement types are marked coming soon." },
      { question: "Do both parties need accounts?", answer: "The author signs in with a one-time email code so agreements cannot be created in someone else's name. An invited counterparty can review through their secure link without creating an account, and can create an account later to save the agreement." },
      { question: "What information is required to start?", answer: "The author provides their own complete details and the counterparty's email address. The counterparty's legal name, address, signatory name, and title may be completed later, but must be present before that party approves." },
    ],
  },
  {
    title: "Working with agents",
    items: [
      { question: "Can my AI agent use Mutual Assent AI?", answer: "Yes. A compatible agent can use the site's WebMCP tools to create, review, retrieve, redline, approve, and monitor agreements on your behalf. Signing is always reserved for a human." },
      { question: "What does my agent need?", answer: "It needs a browser or agent client that supports WebMCP site tools, or a compatible executeTool bridge. The site tells incompatible agents to stop and explain the limitation rather than operate agreement controls through the page DOM." },
      { question: "Which browsers support WebMCP?", answer: "As of October 2026, Mutual Assent AI site tools are supported in the ChatGPT desktop app’s built-in browser when site tools are available for the account and selected model. They are not currently available through ChatGPT in ordinary Chrome. Chrome 149 and later also offers experimental WebMCP support through its origin trial or developer flags for compatible browser agents; that is not the same as general end-user support. Mutual Assent AI does not currently claim native WebMCP support in ordinary Safari, Firefox, or Edge." },
      { question: "Can an author agent sign in without showing the login screens?", answer: "Yes. It can request a one-time code through a site tool, retrieve the code from the author's email, and submit it through another site tool. The same email verification is still required even when no login screen is displayed." },
      { question: "Can an agent sign an agreement?", answer: "No. Agents can prepare and negotiate an agreement, but the final signature action requires a human, electronic-signature consent, and a fresh email verification code." },
      { question: "Are my private conversations with my agent part of the agreement record?", answer: "No. Mutual Assent AI records actions performed in the agreement workspace. Private prompts and conversations in your agent interface remain outside the agreement record." },
    ],
  },
  {
    title: "Review and negotiation",
    items: [
      { question: "Can both parties propose changes?", answer: "Yes. After invitation, either party or their agent can propose redlines. The other party can accept, reject, or counter them." },
      { question: "Will every edit generate another email?", answer: "No. Notifications are grouped while the recipient has an outstanding handoff. Once they return and acknowledge the current activity, a later action can create a new notification." },
      { question: "What happens if a redline is added after approval?", answer: "The agreement returns to review, previous approvals are cleared, and the affected party is notified. Both parties must approve the resulting version again before signing." },
      { question: "What if the agreement changes while my agent is working?", answer: "Every write checks the latest event sequence. A stale action is rejected with the newest agreement state so the person or agent can review before retrying." },
      { question: "What is previously known information?", answer: "It identifies information a receiving party already knew lawfully and without restriction before disclosure under the NDA. It appears in an appendix and is not a substitute for a general list of intellectual property." },
      { question: "What if the counterparty's agent cannot use the site?", answer: "They can download the agreement, review it with their agent, and reply to the invitation email with either a revised document or a list of requested revisions. The reply goes to the author." },
      { question: "Does replying by email automatically change the agreement?", answer: "No. The author or author's agent records each emailed revision in Mutual Assent AI. The counterparty then receives a secure link to confirm, correct, or reject the recorded revision." },
      { question: "How are emailed revisions attributed?", answer: "A recorded email revision is visibly pending and is not treated as the counterparty's proposal. Only the counterparty or their agent can confirm or correct it. After that confirmation, the revision is attributed to the counterparty in the negotiation record, with provenance showing that it was initially entered from email." },
    ],
  },
  {
    title: "Signing, access, and records",
    items: [
      { question: "When can the parties sign?", answer: "All open and pending redlines must be resolved, required party details must be complete, and both parties must approve the current version. Each human signer then verifies their email with a one-time code." },
      { question: "Are author and counterparty links different?", answer: "Yes. Each secure link opens only that party's workspace and permissions. Links are single-use and exchanged for a time-limited session." },
      { question: "Can I return to an agreement later?", answer: "Yes. Account holders can find saved agreements under My agreements. A participant can also request a fresh secure link using the agreement ID and matching email address." },
      { question: "Can an earlier version be restored?", answer: "The author can restore prior document terms as a new current version. The history is preserved, unresolved redlines are superseded, and approvals must be collected again." },
      { question: "What is the Certificate of Negotiation?", answer: "After execution, the certificate summarizes attributed agreement actions, negotiated terms, approvals, signatures, and the cryptographic execution seal. It does not include private agent conversations." },
      { question: "Does Mutual Assent AI provide legal advice?", answer: "No. Mutual Assent AI is beta software for preparing, negotiating, and signing agreements. It is not a law firm and does not choose terms for you. Review the Terms and consult qualified counsel when appropriate." },
    ],
  },
] as const;
