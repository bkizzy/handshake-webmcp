# Handshake

**Your AI agent’s favorite eSignature solution.**

Handshake is an electronic-signature workspace for the agentic era. People and browser agents can prepare and negotiate agreements together, while approval and signing remain explicit human actions. The first production template is an NDA; consulting agreements and uploaded documents are next.

The product does not contain a negotiation playbook. It provides neutral document capabilities; a person or an external agent decides what to propose, accept, reject, or counter.

## Product flow

1. A person chooses an NDA from the agreement-type screen, or an agent creates one directly.
2. Handshake returns a private author magic link. Signed-in authors see the draft in their in-progress dashboard.
3. The author edits the autosaved draft and invites the signer by a separate secure link.
4. Either party—or either party's browser agent—can propose redlines.
5. The other party can accept, reject, or counter each proposal.
6. Both parties approve the current version after all redlines are resolved.
7. Each human requests a six-digit email code, reviews the electronic-signature consent, and signs. Handshake exposes no agent signing tool.
8. Either party may sign in with the matching email to retain the agreement in their profile.
9. The executed version is locked with a deterministic SHA-256 seal and retained alongside a Certificate of Negotiation and a generated PDF.

Any new change clears both approvals and any partial signatures. A completed agreement is read-only.

## WebMCP tools

Handshake registers imperative WebMCP tools through `document.modelContext`. The available tools change with the viewer's role and the document's lifecycle:

- `handshake_create_nda`
- `handshake_get_agreement`
- `handshake_retrieve_contract`
- `handshake_update_document_details`
- `handshake_update_draft_section`
- `handshake_update_participant`
- `handshake_invite_signer`
- `handshake_list_redlines`
- `handshake_propose_redline`
- `handshake_respond_to_redline`
- `handshake_approve_current_version`
- `handshake_get_activity`
- `handshake_wait_for_update`
- `handshake_resend_signer_link`
- `handshake_restore_document_version`
- `handshake_decline_agreement`
- `handshake_void_agreement`
- `handshake_get_certificate` (signed only)
- `handshake_verify_seal` (signed only)
- `handshake_get_execution_package` (signed only)
- `handshake_recover_agreement_access` (recovery page)

Agents can create, retrieve, edit, invite, redline, respond, approve, restore a historical version as a new audited version, correct participants, recover access, close, and inspect executed records. Signing is intentionally absent from the WebMCP surface and is accepted only by the human action endpoint after email-code verification. Mutating tools require a stable request ID, so retrying an action cannot repeat side effects such as invitation email.

The deal page directs agents to use WebMCP rather than agreement controls in the DOM and to report any limitation or violation to their owner. This is a transparent operating directive, not a security boundary. A client without native site-tool support can expose an `executeTool` compatibility bridge to the registered Handshake tools.

Open `http://localhost:3000/webmcp` in the Codex built-in browser to verify the integration. The page separately checks API injection, successful tool registration, and an actual agent invocation. With GPT-5.6 Sol or Terra selected, make sure **Settings → Browser → Permissions → Enable site tools** is on, then inspect **Site tools** in the browser address bar.

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Without environment variables, Handshake uses an in-memory repository and provides copyable invitation links. This mode is for local development only.

Run the full verification suite with:

```bash
pnpm check
```

## Production services

Copy `.env.example` to `.env.local` and configure:

- **Supabase** for Postgres persistence and passwordless author authentication.
- **Resend** for invitations, negotiated-update handoffs, signature codes, completion notices, and recovery links.
- **Vercel** for hosting and environment variables.

Apply [`supabase/migrations/0001_agreements.sql`](supabase/migrations/0001_agreements.sql) in the Supabase SQL editor. The agreements table has row-level security enabled and no browser policies; only the server secret can access it.

For numeric email login, Handshake asks Supabase to generate a one-time code on the server and delivers it through Resend. The UI accepts Supabase's six- or eight-digit OTP and submits it through Supabase's email verification flow, so no Supabase SMTP or email-template customization is required.

Required production variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_APP_URL
```

When Supabase is configured, an authenticated author owns each created agreement. An anonymous or agent-created agreement can be saved by signing in with the matching author email. Signers can still review and sign from a no-account secure access link, or sign in with the invited email to save the agreement in their own in-progress and executed-agreement views.

## Architecture

- Next.js App Router and React
- Framework-independent agreement domain in `src/lib/agreements`
- Editable product/email copy in `src/content`, with the landing and agreement-workspace styling in standalone CSS files
- Separate human and agent action entrypoints, with attribution derived from the route rather than trusted from request data
- Supabase JSONB persistence with profile ownership and an in-memory development fallback
- Resend's HTTP API for invitation email
- Zod request validation and Vitest lifecycle tests

Raw access tokens are never stored. Each author and signer link carries an independent capability; after link validation the browser keeps only its own token in tab-scoped `sessionStorage` and sends it in the `Authorization` header. Token hashes and expirations remain server-side. Explicitly resending an invitation or correcting the signer email revokes prior signer links, while ordinary update notices add a fresh link without breaking an already-open tab. Access data, signature challenges, notification state, idempotency keys, and owner IDs are stripped from every public agreement view. Agreement text and redline rationales are marked as untrusted content in tool annotations.

This is capability-link authentication appropriate for the hackathon. A production hardening pass would add email-bound accounts for both parties, shorter-lived/revocable sessions, rate limiting, and stronger identity verification.

Handshake uses an event cursor on every mutation to reject stale actions before they can overwrite newer work. While an agent is active, `handshake_wait_for_update` polls the server briefly. For negotiations spanning hours or days, Handshake sends one actionable email handoff and groups later changes until that party reads or acknowledges the batch; the next post-acknowledgement change starts a new handoff. Previously known information is supplied by the party claiming the exclusion, appears in a party-specific appendix, and remains subject to the agreement's written-record proof standard.

At the second signature, Handshake deterministically serializes the final terms, final contract text, complete action history, and both verified signatures, then seals that canonical record with SHA-256. This proves the stored record has not changed after sealing; it is not a blockchain and not a substitute for a qualified e-signature provider.

The downloaded certificate JSON includes both `seal.hash` and the exact `seal.canonicalJson` string. An independent check on macOS is `jq -j -r '.seal.canonicalJson' handshake-*-certificate.json | shasum -a 256`; the resulting digest must equal `seal.hash`.

The Certificate of Negotiation records actions that occurred through Handshake and attributes human versus agent interaction surfaces. Private prompts, conversations, priorities, and any “phone home” between a person and their external agent remain outside Handshake and are not claimed as evidence.

## Demo

The suggested two-agent runbook lives in [`demo/RUNBOOK.md`](demo/RUNBOOK.md). It intentionally keeps the demo parties' preferences and escalation choices outside the product.
