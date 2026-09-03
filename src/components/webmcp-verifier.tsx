"use client";

import { Bot, Check, CircleAlert, Copy, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Brand } from "@/src/components/brand";

type Phase = "checking" | "unsupported" | "registering" | "ready" | "error";

type Diagnostic = {
  phase: Phase;
  hasModelContext: boolean;
  hasRegisterTool: boolean;
  secureContext: boolean;
  message: string;
};

type Invocation = {
  tool: string;
  message: string;
  at: string;
};

const toolNames = ["handshake_webmcp_verify", "handshake_webmcp_echo"];
const productToolExamples = ["handshake_create_nda", "handshake_retrieve_contract", "handshake_wait_for_update", "handshake_get_certificate", "handshake_verify_seal"];
const testPrompt = "Use the Handshake AI site tools on this page. Call handshake_webmcp_verify, then call handshake_webmcp_echo with the message ‘WebMCP is working’.";

function result(message: string, structuredContent: Record<string, unknown>): WebMcpToolResult {
  return { content: [{ type: "text", text: message }], structuredContent };
}

export function WebMcpVerifier() {
  const [diagnostic, setDiagnostic] = useState<Diagnostic>({
    phase: "checking",
    hasModelContext: false,
    hasRegisterTool: false,
    secureContext: false,
    message: "Checking this browser…",
  });
  const [invocation, setInvocation] = useState<Invocation | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const publishDiagnostic = (next: Diagnostic) => {
      queueMicrotask(() => {
        if (active) setDiagnostic(next);
      });
    };
    const modelContext = document.modelContext;
    const hasModelContext = Boolean(modelContext);
    const hasRegisterTool = typeof modelContext?.registerTool === "function";
    const secureContext = window.isSecureContext;

    if (!hasRegisterTool) {
      publishDiagnostic({
        phase: "unsupported",
        hasModelContext,
        hasRegisterTool,
        secureContext,
        message: "This browser did not inject the WebMCP API into the page.",
      });
      return () => {
        active = false;
      };
    }

    const controller = new AbortController();
    publishDiagnostic({
      phase: "registering",
      hasModelContext,
      hasRegisterTool,
      secureContext,
      message: "The API is present. Registering two verification tools…",
    });

    const recordInvocation = (tool: string, message: string) => {
      if (active) setInvocation({ tool, message, at: new Date().toLocaleTimeString() });
    };

    async function registerTools() {
      try {
        await Promise.all([
          modelContext!.registerTool({
            name: "handshake_webmcp_verify",
            description: "Verify that Handshake AI WebMCP site tools can be invoked on the current top-level page. This is a read-only diagnostic and does not access agreement data.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false, untrustedContentHint: false },
            execute: async () => {
              const message = "Handshake AI WebMCP registration and invocation are working.";
              recordInvocation("handshake_webmcp_verify", message);
              return result(message, {
                ok: true,
                origin: window.location.origin,
                secureContext: window.isSecureContext,
                registeredTools: toolNames,
              });
            },
          }, { signal: controller.signal }),
          modelContext!.registerTool({
            name: "handshake_webmcp_echo",
            description: "Echo a short test message to prove that an agent can pass structured input to a Handshake AI WebMCP tool. This changes only the diagnostic display on this page.",
            inputSchema: {
              type: "object",
              properties: { message: { type: "string", description: "A short non-sensitive test message." } },
              required: ["message"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false, untrustedContentHint: true },
            execute: async (rawInput) => {
              const input = (rawInput ?? {}) as Record<string, unknown>;
              const message = typeof input.message === "string" ? input.message.slice(0, 200) : "";
              if (!message.trim()) throw new Error("message is required.");
              recordInvocation("handshake_webmcp_echo", message);
              return result(`Echo received: ${message}`, { ok: true, echo: message });
            },
          }, { signal: controller.signal }),
        ]);

        if (!controller.signal.aborted) {
          publishDiagnostic({
            phase: "ready",
            hasModelContext,
            hasRegisterTool,
            secureContext,
            message: "Both verification tools registered successfully.",
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        publishDiagnostic({
          phase: "error",
          hasModelContext,
          hasRegisterTool,
          secureContext,
          message: error instanceof Error ? error.message : "The browser rejected tool registration.",
        });
      }
    }

    void registerTools();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function copyPrompt() {
    await navigator.clipboard.writeText(testPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const ready = diagnostic.phase === "ready";
  const unsupported = diagnostic.phase === "unsupported";

  return (
    <main className="verify-page">
      <header>
        <div className="app-shell header-inner">
          <Brand />
          <Link href="/" className="back-link">Back to Handshake AI</Link>
        </div>
      </header>

      <section className="app-shell intro">
        <div className={ready ? "status-icon ready" : unsupported || diagnostic.phase === "error" ? "status-icon blocked" : "status-icon checking"}>
          {ready ? <Check size={25} /> : unsupported || diagnostic.phase === "error" ? <CircleAlert size={25} /> : <RefreshCw className="spin" size={23} />}
        </div>
        <p className="eyebrow">WebMCP verification</p>
        <h1>{ready ? "Site tools are active." : unsupported ? "WebMCP is not available yet." : diagnostic.phase === "error" ? "Registration was rejected." : "Checking site tools…"}</h1>
        <p className="lede">{diagnostic.message}</p>
      </section>

      <section className="app-shell diagnostic-grid">
        <div className="card checks-card">
          <div className="card-heading"><ShieldCheck size={19} /><div><h2>Runtime checks</h2><p>What this page can verify directly.</p></div></div>
          <ul>
            <CheckRow label="Secure browser context" passed={diagnostic.secureContext} />
            <CheckRow label="document.modelContext present" passed={diagnostic.hasModelContext} />
            <CheckRow label="registerTool function present" passed={diagnostic.hasRegisterTool} />
            <CheckRow label="Verification tools registered" passed={ready} pending={diagnostic.phase === "registering" || diagnostic.phase === "checking"} />
            <CheckRow label="Agent invocation received" passed={Boolean(invocation)} />
          </ul>
          <button className="button-secondary" onClick={() => window.location.reload()}><RefreshCw size={15} /> Check again</button>
        </div>

        <div className="card tools-card">
          <div className="card-heading"><Wrench size={19} /><div><h2>Tools on this page</h2><p>Open Site tools in the browser address bar to inspect them.</p></div></div>
          {toolNames.map((name) => <code key={name}>{name}<span>{ready ? "Registered" : "Waiting"}</span></code>)}
          <p className="context-note">Agreement tools register only on the page and lifecycle phase where they are valid. Examples: {productToolExamples.join(", ")}.</p>
          <div className="prompt-box"><span>Test from Codex</span><p>{testPrompt}</p><button onClick={() => void copyPrompt()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy prompt"}</button></div>
        </div>
      </section>

      <section className="app-shell invocation-card">
        <Bot size={20} />
        <div><h2>Last agent invocation</h2>{invocation ? <p><code>{invocation.tool}</code> at {invocation.at}: “{invocation.message}”</p> : <p>No WebMCP tool has called back into this page yet.</p>}</div>
      </section>

      {unsupported && (
        <section className="app-shell setup-card">
          <h2>Open this page in a site-tools-capable browser</h2>
          <p>The page cannot enable WebMCP itself. Open it in the Codex built-in browser with a model/session that exposes site tools, then reload. There is no Handshake AI permission toggle to change.</p>
        </section>
      )}

      <style jsx>{`
        .verify-page { min-height: 100vh; padding-bottom: 90px; background: var(--canvas); }
        header { height: 72px; display: flex; align-items: center; background: white; border-bottom: 1px solid var(--line); }
        .header-inner { display: flex; align-items: center; justify-content: space-between; }
        .back-link { color: #536077; text-decoration: none; font-size: 13px; font-weight: 650; }
        .intro { padding-top: 70px; text-align: center; }
        .status-icon { width: 56px; height: 56px; margin: 0 auto 22px; display: grid; place-items: center; border-radius: 50%; }
        .status-icon.ready { color: var(--green); background: var(--green-soft); }
        .status-icon.blocked { color: var(--amber); background: var(--amber-soft); }
        .status-icon.checking { color: var(--blue); background: var(--blue-soft); }
        h1 { margin: 13px 0 0; color: #172033; font-size: clamp(38px, 5vw, 58px); line-height: 1.05; letter-spacing: -.05em; }
        .lede { max-width: 650px; margin: 18px auto 0; color: #687287; font-size: 17px; }
        .diagnostic-grid { margin-top: 52px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card, .invocation-card, .setup-card { padding: 28px; background: white; border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-sm); }
        .card-heading { display: flex; align-items: flex-start; gap: 12px; color: var(--blue); }
        .card-heading h2, .invocation-card h2, .setup-card h2 { margin: 0; color: #263147; font-size: 18px; }
        .card-heading p { margin: 3px 0 0; color: #788295; font-size: 13px; }
        ul { padding: 0; margin: 24px 0; list-style: none; border-top: 1px solid var(--soft-line); }
        .checks-card :global(.button-secondary) { width: 100%; }
        .tools-card { display: flex; flex-direction: column; }
        .tools-card > code { margin-top: 14px; padding: 12px 13px; display: flex; justify-content: space-between; gap: 12px; color: #344057; background: #f7f9fc; border: 1px solid var(--soft-line); border-radius: 8px; font-size: 12px; }
        .tools-card > code span { color: ${ready ? "var(--green)" : "#8a93a3"}; font-family: Inter, sans-serif; font-weight: 700; }
        .context-note { margin: 15px 0 0; color: #778296; font-size: 10px; line-height: 1.55; }
        .prompt-box { margin-top: 20px; padding: 17px; background: #17213a; color: white; border-radius: 10px; }
        .prompt-box > span { color: #9bb6ff; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
        .prompt-box p { margin: 9px 0 14px; color: #e7ecf6; font-size: 13px; line-height: 1.55; }
        .prompt-box button { padding: 0; display: inline-flex; align-items: center; gap: 6px; color: white; background: transparent; border: 0; font-size: 12px; font-weight: 700; cursor: pointer; }
        .invocation-card { margin-top: 20px; display: flex; align-items: flex-start; gap: 12px; color: var(--blue); }
        .invocation-card p { margin: 6px 0 0; color: #687287; }
        .invocation-card code { color: #344057; font-size: 12px; }
        .setup-card { margin-top: 20px; border-color: #ecd7aa; background: #fffbf1; }
        .setup-card p { margin: 14px 0 0; color: #7a6b4e; font-size: 12px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 760px) { .diagnostic-grid { grid-template-columns: 1fr; } .intro { padding-top: 52px; } .card, .invocation-card, .setup-card { padding: 22px; } }
      `}</style>
    </main>
  );
}

function CheckRow({ label, passed, pending = false }: { label: string; passed: boolean; pending?: boolean }) {
  return <li><span className={passed ? "check passed" : pending ? "check pending" : "check failed"}>{passed ? <Check size={13} /> : pending ? "…" : "×"}</span><span>{label}</span><b>{passed ? "Pass" : pending ? "Checking" : "Not detected"}</b><style jsx>{`
    li { min-height: 45px; display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; border-bottom: 1px solid var(--soft-line); color: #48546a; font-size: 13px; }
    .check { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; font-size: 13px; font-weight: 800; }
    .passed { color: var(--green); background: var(--green-soft); }
    .pending { color: var(--blue); background: var(--blue-soft); }
    .failed { color: #8b94a3; background: #eef1f5; }
    b { color: ${passed ? "var(--green)" : pending ? "var(--blue)" : "#8b94a3"}; font-size: 11px; }
  `}</style></li>;
}
