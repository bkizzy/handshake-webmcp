"use client";

import { Check, KeyRound, LoaderCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import "./recovery-form.css";

async function requestRecovery(agreementId: string, email: string) {
  const response = await fetch("/api/agreements/recover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agreementId, email }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "Could not request a new link.");
  return data.message as string;
}

export function RecoveryForm() {
  const [agreementId, setAgreementId] = useState("");
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!document.modelContext) return;
    const controller = new AbortController();
    void document.modelContext.registerTool({
      name: "handshake_recover_agreement_access",
      description: "Request a fresh party-specific secure link for a known Handshake agreement ID and participant email. The result is deliberately generic and the link is sent only by email.",
      inputSchema: {
        type: "object",
        properties: {
          agreementId: { type: "string", description: "Handshake agreement UUID." },
          email: { type: "string", description: "Author or signer email on that agreement." },
        },
        required: ["agreementId", "email"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: false },
      execute: async (input) => {
        const values = (input ?? {}) as Record<string, unknown>;
        const id = typeof values.agreementId === "string" ? values.agreementId : "";
        const recipient = typeof values.email === "string" ? values.email : "";
        const result = await requestRecovery(id, recipient);
        return { content: [{ type: "text", text: result }], structuredContent: { requested: true } };
      },
    }, { signal: controller.signal }).catch((error) => {
      if (!controller.signal.aborted) console.error("WebMCP recovery tool registration failed", error);
    });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    try { setMessage(await requestRecovery(agreementId, email)); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "Could not request a new link."); }
    finally { setWorking(false); }
  }

  return <section className="recovery-card"><span className="recovery-icon"><KeyRound size={23} /></span><p className="eyebrow">Secure access</p><h1>Recover an agreement</h1><p>Enter the agreement ID and your participant email. If they match, we’ll send a fresh role-specific link.</p><form onSubmit={submit}><label className="field-label">Agreement ID<input className="field-input" value={agreementId} onChange={(event) => setAgreementId(event.target.value)} required /></label><label className="field-label">Participant email<input className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="button-primary" disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />} Email a secure link</button></form>{message && <div className="recovery-message"><Check size={15} /> {message}</div>}<small>For privacy, Handshake gives the same response whether or not the details match.</small></section>;
}
