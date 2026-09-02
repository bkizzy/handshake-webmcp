"use client";

import { ArrowRight, Check, KeyRound, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function LoginForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setWorking(true);
    setError("");
    const { error: authError } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setWorking(false);
    if (authError) return setError(authError.message);
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
        <p className="intro">Add the Supabase environment variables to enable six-digit email sign-in. Local authoring remains open while you build.</p>
        <Link className="button-primary dev-button" href="/new">Continue without a profile <ArrowRight size={16} /></Link>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="login-card">
      <span className="login-icon">{step === "email" ? <Mail size={22} /> : <KeyRound size={22} />}</span>
      <p className="eyebrow">Author sign in</p>
      <h1>{step === "email" ? "Continue with email" : "Check your inbox"}</h1>
      <p className="intro">{step === "email" ? "We’ll send a one-time six-digit code. No password to remember." : <>Enter the code sent to <b>{email}</b>.</>}</p>
      {step === "email" ? (
        <form onSubmit={sendCode}>
          <label className="field-label">Work email<input className="field-input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus /></label>
          <button className="button-primary" disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />} Email me a code</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label className="field-label">Six-digit code<input className="field-input code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required autoFocus /></label>
          <button className="button-primary" disabled={working || code.length !== 6}>{working ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Verify and continue</button>
          <button type="button" className="change-email" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</button>
        </form>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="review-note"><Check size={14} /><span>Invitees never need an account to review or sign.</span></div>
      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .login-card { padding: 39px; border: 1px solid #d9e0e9; border-radius: 14px; background: white; box-shadow: 0 18px 55px rgba(25, 37, 63, .09); text-align: center; }
  .login-icon { width: 48px; height: 48px; margin: 0 auto 19px; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 12px; }
  h1 { margin: 11px 0 0; color: #263147; font-size: 28px; line-height: 1.15; letter-spacing: -.035em; }
  .intro { margin: 11px 0 25px; color: #707a8d; font-size: 13px; line-height: 1.55; }
  .intro b { color: #4c586e; }
  form { display: grid; gap: 13px; text-align: left; }
  form .button-primary, .dev-button { width: 100%; margin-top: 4px; }
  .code-input { height: 55px; font-size: 23px; letter-spacing: .28em; text-align: center; font-weight: 700; }
  .change-email { min-height: 35px; border: 0; color: var(--blue); background: transparent; font-size: 11px; font-weight: 650; cursor: pointer; }
  .auth-error { margin: 14px 0 0; color: var(--red); font-size: 11px; }
  .review-note { margin: 24px -39px -39px; padding: 17px 24px; display: flex; justify-content: center; align-items: center; gap: 7px; color: #687387; background: #fafbfd; border-top: 1px solid var(--soft-line); border-radius: 0 0 14px 14px; font-size: 10px; }
  .review-note svg { color: var(--green); }
  .spin { animation: spin 800ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
