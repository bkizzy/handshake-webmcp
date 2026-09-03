"use client";

import { ArrowRight, Bot, Building2, FileText, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type FormState = {
  title: string;
  kind: "one-way" | "mutual";
  purpose: string;
  effectiveDate: string;
  governingLaw: string;
  authorLegalName: string;
  authorAddress: string;
  authorName: string;
  authorTitle: string;
  authorEmail: string;
  signerLegalName: string;
  signerAddress: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
};

const initialState: FormState = {
  title: "Mutual NDA",
  kind: "mutual",
  purpose: "evaluating a potential business relationship",
  effectiveDate: new Date().toISOString().slice(0, 10),
  governingLaw: "New York",
  authorLegalName: "",
  authorAddress: "",
  authorName: "",
  authorTitle: "",
  authorEmail: "",
  signerLegalName: "",
  signerAddress: "",
  signerName: "",
  signerTitle: "",
  signerEmail: "",
};

export function NewAgreementForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/agreements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          kind: form.kind,
          author: {
            legalName: form.authorLegalName,
            address: form.authorAddress,
            signatoryName: form.authorName,
            signatoryTitle: form.authorTitle,
            email: form.authorEmail,
          },
          signer: {
            legalName: form.signerLegalName,
            address: form.signerAddress,
            signatoryName: form.signerName,
            signatoryTitle: form.signerTitle,
            email: form.signerEmail,
          },
          fields: {
            effectiveDate: form.effectiveDate,
            purpose: form.purpose,
            governingLaw: form.governingLaw,
            authorPreviouslyKnownInformation: "None disclosed.",
            signerPreviouslyKnownInformation: "None disclosed.",
          },
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) throw new Error(data.error?.message ?? "Could not create the agreement.");
      window.location.assign(data.links.author);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the agreement.");
      setSubmitting(false);
    }
  }

  return (
    <form className="agreement-form app-shell" onSubmit={submit}>
      <section className="form-section">
        <div className="section-label">
          <span><FileText size={19} /></span>
          <div><h2>Agreement</h2><p>The starting point for both sides.</p></div>
        </div>
        <div className="section-fields">
          <label className="field-label wide">Document title
            <input className="field-input" value={form.title} onChange={(event) => update("title", event.target.value)} required />
          </label>
          <fieldset className="kind-field wide">
            <legend>Agreement type</legend>
            <label className={form.kind === "mutual" ? "kind-card selected" : "kind-card"}>
              <input type="radio" name="kind" value="mutual" checked={form.kind === "mutual"} onChange={() => update("kind", "mutual")} />
              <span><b>Mutual NDA</b><small>Both parties may share confidential information.</small></span>
            </label>
            <label className={form.kind === "one-way" ? "kind-card selected" : "kind-card"}>
              <input type="radio" name="kind" value="one-way" checked={form.kind === "one-way"} onChange={() => update("kind", "one-way")} />
              <span><b>One-way NDA</b><small>Your company is the primary disclosing party.</small></span>
            </label>
          </fieldset>
          <label className="field-label wide">Purpose
            <input className="field-input" value={form.purpose} onChange={(event) => update("purpose", event.target.value)} required />
          </label>
          <label className="field-label">Effective date
            <input className="field-input" type="date" value={form.effectiveDate} onChange={(event) => update("effectiveDate", event.target.value)} required />
          </label>
          <label className="field-label">Governing law
            <input className="field-input" value={form.governingLaw} onChange={(event) => update("governingLaw", event.target.value)} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-label">
          <span><Building2 size={19} /></span>
          <div><h2>Your side</h2><p>You’ll author and send the agreement.</p></div>
        </div>
        <div className="section-fields">
          <label className="field-label">Legal company name<input className="field-input" value={form.authorLegalName} onChange={(event) => update("authorLegalName", event.target.value)} required /></label>
          <label className="field-label">Your work email<input className="field-input" type="email" value={form.authorEmail} onChange={(event) => update("authorEmail", event.target.value)} required /></label>
          <label className="field-label wide">Company address<input className="field-input" value={form.authorAddress} onChange={(event) => update("authorAddress", event.target.value)} required /></label>
          <label className="field-label">Signatory name<input className="field-input" value={form.authorName} onChange={(event) => update("authorName", event.target.value)} required /></label>
          <label className="field-label">Signatory title<input className="field-input" value={form.authorTitle} onChange={(event) => update("authorTitle", event.target.value)} required /></label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-label">
          <span><UserRound size={19} /></span>
          <div><h2>Other side</h2><p>They can review without creating an account.</p></div>
        </div>
        <div className="section-fields">
          <label className="field-label">Legal company name<input className="field-input" value={form.signerLegalName} onChange={(event) => update("signerLegalName", event.target.value)} required /></label>
          <label className="field-label">Reviewer email<input className="field-input" type="email" value={form.signerEmail} onChange={(event) => update("signerEmail", event.target.value)} required /></label>
          <label className="field-label wide">Company address<input className="field-input" value={form.signerAddress} onChange={(event) => update("signerAddress", event.target.value)} required /></label>
          <label className="field-label">Expected signatory<input className="field-input" value={form.signerName} onChange={(event) => update("signerName", event.target.value)} required /></label>
          <label className="field-label">Signatory title<input className="field-input" value={form.signerTitle} onChange={(event) => update("signerTitle", event.target.value)} required /></label>
        </div>
      </section>

      <div className="form-footer">
          <div className="agent-note" data-agent-policy="webmcp-only"><Bot size={17} /><span><b>Agent directive: use Handshake site tools only.</b> Agents should not operate document controls through the DOM and must report any limitation or violation to their owner.</span></div>
        <div className="submit-area">
          {error && <p role="alert">{error}</p>}
          <button className="button-primary" disabled={submitting}>{submitting ? "Creating…" : "Create draft"}<ArrowRight size={17} /></button>
        </div>
      </div>
      <style jsx>{`
        .agreement-form { max-width: 920px; overflow: hidden; border: 1px solid #d9e0e9; border-radius: 14px; background: white; box-shadow: 0 16px 50px rgba(27, 39, 67, .08); }
        .form-section { display: grid; grid-template-columns: 220px 1fr; gap: 38px; padding: 37px 39px; border-bottom: 1px solid var(--line); }
        .section-label { display: flex; align-items: flex-start; gap: 12px; }
        .section-label > span { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 9px; }
        h2 { margin: 1px 0 2px; color: #263147; font-size: 16px; letter-spacing: -.01em; }
        .section-label p { margin: 0; color: #7a8495; font-size: 12px; line-height: 1.45; }
        .section-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 17px; }
        .wide { grid-column: 1 / -1; }
        .kind-field { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0; padding: 0; border: 0; }
        .kind-field legend { grid-column: 1 / -1; margin-bottom: 7px; color: #354057; font-size: 13px; font-weight: 650; }
        .kind-card { min-height: 80px; display: flex; align-items: flex-start; gap: 10px; padding: 14px; border: 1px solid #cfd6e2; border-radius: 9px; cursor: pointer; transition: border-color 150ms, background 150ms; }
        .kind-card.selected { border-color: var(--blue); background: #f8faff; box-shadow: 0 0 0 2px rgba(36, 87, 214, .08); }
        .kind-card input { margin-top: 3px; accent-color: var(--blue); }
        .kind-card span { display: grid; gap: 3px; }
        .kind-card b { color: #303b51; font-size: 13px; }
        .kind-card small { color: #7a8495; font-size: 11px; line-height: 1.4; }
        .form-footer { padding: 28px 39px; display: flex; align-items: center; justify-content: space-between; gap: 28px; background: #fbfcfe; }
        .agent-note { max-width: 510px; display: flex; align-items: flex-start; gap: 10px; color: #6e788b; font-size: 11px; line-height: 1.5; }
        .agent-note :global(svg) { flex: 0 0 auto; margin-top: 1px; color: var(--blue); }
        .agent-note b { color: #3c475c; }
        .submit-area { display: flex; align-items: center; gap: 14px; }
        .submit-area p { max-width: 180px; margin: 0; color: var(--red); font-size: 11px; }
        .submit-area :global(.button-primary) { min-width: 145px; }
        @media (max-width: 760px) {
          .form-section { grid-template-columns: 1fr; gap: 26px; padding: 30px 22px; }
          .section-fields { grid-template-columns: 1fr; }
          .wide { grid-column: auto; }
          .kind-field { grid-column: auto; grid-template-columns: 1fr; }
          .kind-field legend { grid-column: auto; }
          .form-footer { padding: 24px 22px; flex-direction: column; align-items: stretch; }
          .submit-area { flex-direction: column; align-items: stretch; }
          .submit-area p { max-width: none; }
        }
      `}</style>
    </form>
  );
}
