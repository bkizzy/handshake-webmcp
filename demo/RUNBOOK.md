# Handshake demo runbook

This script demonstrates Handshake's neutral capabilities. None of the preferences below are application rules.

## Setup

- Open the deployed Handshake landing page in two separate ChatGPT Work tasks.
- Use one task for the author and one for the signer.
- Give the signer task the secure review link delivered by email.
- Keep both agreement tabs open for the fast live sequence. For the multi-day story, close the signer tab and show the next actionable update arriving by email.

Use fictional demo companies and non-deliverable email addresses until transactional email is intentionally being tested.

## Author-agent prompt

> You represent Northstar Robotics, Inc. Use Handshake's site tools to create a mutual NDA with Signal Forge LLC for evaluating a warehouse-automation integration. Fill in the ordinary company, address, signatory, effective-date, purpose, and governing-law details from this conversation. Review the draft, then invite the signer. You may accept a narrowly described list of the signer's pre-existing materials and a confidentiality survival period from two to four years. You may narrow the purpose for clarity. Do not sign; tell me when human signature is available. If the signer proposes any right to use Northstar's confidential information for model training, stop and ask me one precise question before responding.

Suggested demo facts:

- Northstar Robotics, Inc.; 1 Market Street, San Francisco, CA 94105
- Avery Chen, CEO
- Signal Forge LLC; 11 Broadway, New York, NY 10004
- Sam Rivera, Founder
- Effective date: the next business day
- Governing law: New York

## Signer-agent prompt

> You represent Signal Forge LLC. Open the Handshake review link. You already know Signal Forge prefers a narrow evaluation purpose, no more than three years of ordinary confidentiality, and an explicit record of independently developed materials. First inspect the complete agreement and open redlines. Propose only changes that are needed: (1) enumerate Signal Forge's pre-existing orchestration library and independently developed evaluation tooling, (2) narrow the purpose to evaluation of the warehouse-automation integration, and (3) if needed, reduce ordinary confidentiality survival to three years while preserving trade-secret treatment. Ask me one concise question only if you cannot tell whether to name the orchestration library specifically or describe it by category. Respond to counters within those preferences. Approve the final version when all redlines are resolved. Do not sign; tell me when my human signature is required.

## The “phone home” moment

The signer agent can ask:

> Should I identify the pre-existing library by its product name, or use the broader description “pre-existing orchestration library and independently developed evaluation tooling”?

That question is useful because it concerns a business fact or disclosure choice the agent should not invent. The agent already handles the mundane document facts and authorized negotiation range without interruption.

## Expected visible sequence

1. The author agent creates the document and fills the structured details.
2. The author agent sends the invitation.
3. The signer agent opens the secure link without creating an account.
4. The signer agent proposes the pre-existing-materials, purpose, and term redlines.
5. The author agent accepts or counters; the activity rail identifies each agent and version.
6. Both agents approve the resolved version.
7. Each agent uses `handshake_wait_for_update` while active; Handshake email provides the durable handoff while an agent is dormant.
8. Handshake exposes no signing tool. Each human uses **Review & sign**, requests a six-digit email code, accepts the electronic-signature consent, and signs.
9. The agreement becomes sealed and read-only.
10. Open **Certificate of Negotiation**, verify the green SHA-256 seal, and download the independent JSON copy.

## Long-running handoff beat

After the first signer proposal, leave the author task dormant. The author receives one action-required email containing a fresh author-specific link. Make one more signer-side change before the author opens it and show that no duplicate email is sent. When the author follows the link or its agent reads the agreement, that batch is acknowledged. A later signer action begins a new email batch.

If an agent reads a proposal and then asks its owner a question in Codex, Claw, or another agent interface, that is an external conversation. Handshake records no invented “escalation” event. If the agreement changes before the agent responds, its stale mutation is rejected and the tool receives the newest agreement state to review before retrying.

## Evidence beat

After both signatures, show both signed-phase tabs. The executed agreement is clean and printable. The certificate shows term-by-term movement and human/agent action attribution. Call `handshake_get_certificate`, then `handshake_verify_seal`. Narration: “Traditional e-signing proves what was signed. Handshake also preserves how the terms changed—without claiming access to either party’s private agent conversation.”

## Optional redlines for later demos

- Limit representatives to people with a need to know and equivalent duties.
- Add a prompt-notice requirement for legally compelled disclosure.
- Clarify the archival-backup exception to return or destruction.
- Exclude residual-memory rights and model-training use.
- Clarify that no license is granted to pre-existing materials.

Keep the main demo to two or three redlines. The goal is to show credible bilateral work, not to simulate a long negotiation.
