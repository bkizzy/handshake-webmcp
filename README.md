# Handshake

**Your agents negotiate. You decide.**

Handshake is a shared agreement workspace for people and browser agents. An author can create and edit an NDA, invite the other party, let either side redline and respond, collect approval for one exact version, and then collect human signatures.

The product does not contain a negotiation playbook. It provides neutral document capabilities; a person or an external agent decides what to propose, accept, reject, or counter.

## Product flow

1. A person chooses an NDA from the agreement-type screen, or an agent creates one directly.
2. Handshake returns a private author magic link. Signed-in authors also see the draft in their in-progress dashboard.
3. The author edits the autosaved draft and invites the signer by a separate secure link.
4. Either party—or either party's browser agent—can propose redlines.
5. The other party can accept, reject, or counter each proposal.
6. Both parties approve the current version after all redlines are resolved.
7. Each human reviews and signs. Handshake exposes no agent signing tool.
8. The executed version is locked, hashed, downloadable, and retained with its activity record.

Any new change clears both approvals and any partial signatures. A completed agreement is read-only.

## WebMCP tools

Handshake registers imperative WebMCP tools through `document.modelContext`. The available tools change with the viewer's role and the document's lifecycle:

- `handshake_create_nda`
- `handshake_get_agreement`
- `handshake_update_document_details`
- `handshake_update_draft_section`
- `handshake_invite_signer`
- `handshake_list_redlines`
- `handshake_propose_redline`
- `handshake_respond_to_redline`
- `handshake_approve_current_version`
- `handshake_get_activity`
- `handshake_resend_signer_link`

Humans and agents call the same agreement actions. Signing is intentionally absent from the WebMCP surface.

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
- **Resend** for signer invitation email.
- **Vercel** for hosting and environment variables.

Apply [`supabase/migrations/0001_agreements.sql`](supabase/migrations/0001_agreements.sql) in the Supabase SQL editor. The agreements table has row-level security enabled and no browser policies; only the server secret can access it.

For numeric email login, edit the Supabase **Magic Link** email template to display `{{ .Token }}` as the six-digit code. The UI submits that code with Supabase's email OTP verification flow.

Required production variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_APP_URL
```

When Supabase is configured, an authenticated author owns each created agreement. An anonymous or agent-created agreement can be claimed by signing in with the matching author email. Signers continue to use a no-account secure access link.

## Architecture

- Next.js App Router and React
- Framework-independent agreement domain in `src/lib/agreements`
- One action API shared by the UI and WebMCP adapters
- Supabase JSONB persistence with profile ownership and an in-memory development fallback
- Resend's HTTP API for invitation email
- Zod request validation and Vitest lifecycle tests

Raw access tokens are never stored. Magic links are exchanged for HTTP-only browser sessions, their hashes and expirations remain server-side, and a refreshed signer link invalidates the prior one. Access data and owner IDs are stripped from every public agreement view. Agreement text and redline rationales are marked as untrusted content in tool annotations.

## Demo

The suggested two-agent runbook lives in [`demo/RUNBOOK.md`](demo/RUNBOOK.md). It intentionally keeps the demo parties' preferences and escalation choices outside the product.
