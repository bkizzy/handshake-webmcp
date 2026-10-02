"use client";

import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message"),
        website: form.get("website"),
      }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "We could not send your message. Please try again.");
      setStatus("idle");
      return;
    }
    event.currentTarget.reset();
    setStatus("sent");
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label className="field-label">Name<input className="field-input" name="name" autoComplete="name" maxLength={120} required /></label>
      <label className="field-label">Email<input className="field-input" name="email" type="email" autoComplete="email" maxLength={320} required /></label>
      <label className="field-label honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="field-label">How can we help?<textarea className="field-textarea" name="message" maxLength={5000} required /></label>
      <div className="contact-actions">
        <button className="button-primary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : <><Send size={17} /> Send message</>}</button>
        <p role="status" aria-live="polite">{status === "sent" ? "Thanks — your message was sent." : error}</p>
      </div>
      <p className="contact-privacy">By submitting this form, you agree that we may use your information to respond. See the <a href="/privacy">Privacy Notice</a>.</p>
      <style jsx>{`
        .contact-form{margin-top:38px;padding:32px;display:grid;gap:22px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:var(--shadow-sm)}
        .honeypot{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
        .contact-actions{display:flex;align-items:center;gap:18px}.contact-actions p{margin:0;color:var(--green);font-size:14px;font-weight:700}
        .contact-privacy{margin:0;color:#737d8e;font-size:13px;line-height:1.5}.contact-privacy a{color:var(--blue);font-weight:700}
        @media(max-width:600px){.contact-form{padding:22px}.contact-actions{align-items:stretch;flex-direction:column}.contact-actions button{width:100%}}
      `}</style>
    </form>
  );
}
