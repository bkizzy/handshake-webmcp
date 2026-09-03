"use client";

import { ArrowRight, Check, KeyRound, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function LoginForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof document.modelContext?.registerTool !== "function") return;
    const authClient = client;
    if (!authClient) return;
    let active = true;
    const controller = new AbortController();
    const register = async () => {
      await document.modelContext?.registerTool({
        name: "handshake_auth_request_code",
        description: "Request a one-time Handshake AI sign-in code for an author or signer. Handshake AI sends the code by email; the agent must retrieve it using its own email capability and then submit it with handshake_auth_submit_code. Handshake AI never reads the inbox.",
        inputSchema: { type: "object", properties: { email: { type: "string", description: "Email address to receive the one-time code." } }, required: ["email"], additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: false },
        execute: async (input) => {
          const emailValue = typeof (input as Record<string, unknown>)?.email === "string" ? (input as Record<string, string>).email : "";
          const response = await fetch("/api/auth/request-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: emailValue }) });
          const data = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) throw new Error(data?.error ?? "Could not send the sign-in code.");
          return { content: [{ type: "text", text: `A one-time code was sent to ${emailValue}. Retrieve it from the owner's email and call handshake_auth_submit_code.` }], structuredContent: { sent: true, email: emailValue } };
        },
      }, { signal: controller.signal });
      await document.modelContext?.registerTool({
        name: "handshake_auth_submit_code",
        description: "Complete Handshake AI email-code authentication after the agent has retrieved the code from its own email capability. This tool does not access email. Returns the destination route after authentication.",
        inputSchema: { type: "object", properties: { email: { type: "string" }, code: { type: "string", description: "The six- or eight-digit code from the email." }, returnTo: { type: "string", description: "Optional Handshake AI route to open after authentication." } }, required: ["email", "code"], additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false, untrustedContentHint: false },
        execute: async (input) => {
          const values = (input ?? {}) as Record<string, unknown>;
          const emailValue = typeof values.email === "string" ? values.email : "";
          const codeValue = typeof values.code === "string" ? values.code.replace(/\D/g, "") : "";
          if (codeValue.length !== 6 && codeValue.length !== 8) throw new Error("The sign-in code must be six or eight digits.");
          const { error: authError } = await authClient.auth.verifyOtp({ email: emailValue, token: codeValue, type: "email" });
          if (authError) throw new Error(authError.message);
          const destination = typeof values.returnTo === "string" && values.returnTo.startsWith("/") && !values.returnTo.startsWith("//") ? values.returnTo : returnTo;
          const result = { content: [{ type: "text" as const, text: `Authenticated ${emailValue}. Opening ${destination}.` }], structuredContent: { authenticated: true, returnTo: destination } };
          window.setTimeout(() => { if (active) window.location.assign(destination); }, 100);
          return result;
        },
      }, { signal: controller.signal });
    };
    void register().catch((registrationError) => { if (!controller.signal.aborted) console.error("WebMCP auth tool registration failed", registrationError); });
    return () => { active = false; controller.abort(); };
  }, [client, returnTo]);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setWorking(true);
    setError("");
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    setWorking(false);
    if (!response.ok) return setError(result?.error ?? "We could not send the sign-in code. Try again.");
    setStep("code");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setWorking(true);
    setError("");
    const { error: authError } = await client.auth.verifyOtp({ email, token: code, type: "email" });
    if (authError) {
      setWorking(false);
      return setError(authError.message);
    }
    window.location.assign(returnTo);
  }

  if (!client) {
    return (
      <section className="login-card">
        <span className="login-icon"><KeyRound size={22} /></span>
        <p className="eyebrow">Local development</p>
        <h1>Authentication is ready to connect.</h1>
        <p className="intro">Add the Supabase environment variables to enable email code sign-in. Local authoring remains open while you build.</p>
        <Link className="button-primary dev-button" href="/new">Continue without a profile <ArrowRight size={16} /></Link>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="login-card">
      <span className="login-icon">{step === "email" ? <Mail size={22} /> : <KeyRound size={22} />}</span>
      <p className="eyebrow">Handshake AI sign in</p>
      <h1>{step === "email" ? "Continue with email" : "Check your inbox"}</h1>
      <p className="intro">{step === "email" ? "We’ll send a one-time numeric code. No password to remember." : <>Enter the code sent to <b>{email}</b>.</>}</p>
      {step === "email" ? (
        <form onSubmit={sendCode}>
          <label className="field-label">Work email<input className="field-input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus /></label>
          <button className="button-primary" disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />} Email me a code</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label className="field-label">One-time code<input className="field-input code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}|[0-9]{8}" maxLength={8} placeholder="00000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required autoFocus /></label>
          <button className="button-primary" disabled={working || (code.length !== 6 && code.length !== 8)}>{working ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Verify and continue</button>
          <button type="button" className="change-email" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</button>
        </form>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="review-note"><Check size={14} /><span>An account is optional for invited signers; sign in to save the agreement to your profile.</span></div>
      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .login-card { padding: 39px; border: 1px solid #d9e0e9; border-radius: 14px; background: white; box-shadow: 0 18px 55px rgba(25, 37, 63, .09); text-align: center; }
  .login-icon { width: 48px; height: 48px; margin: 0 auto 19px; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 12px; }
  h1 { margin: 11px 0 0; color: #263147; font-size: 28px; line-height: 1.15; letter-spacing: -.035em; }
  .intro { margin: 11px 0 25px; color: #657084; font-size: 15px; line-height: 1.55; }
  .intro b { color: #4c586e; }
  form { display: grid; gap: 13px; text-align: left; }
  form .button-primary, .dev-button { width: 100%; margin-top: 4px; }
  .code-input { height: 55px; font-size: 23px; letter-spacing: .28em; text-align: center; font-weight: 700; }
  .change-email { min-height: 44px; border: 0; color: var(--blue); background: transparent; font-size: 14px; font-weight: 650; cursor: pointer; }
  .auth-error { margin: 14px 0 0; color: var(--red); font-size: 14px; }
  .review-note { margin: 24px -39px -39px; padding: 18px 24px; display: flex; justify-content: center; align-items: center; gap: 7px; color: #5f6a7e; background: #fafbfd; border-top: 1px solid var(--soft-line); border-radius: 0 0 14px 14px; font-size: 13px; line-height: 1.45; }
  .review-note svg { color: var(--green); }
  .spin { animation: spin 800ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
