"use client";

import { Bot, Check, Copy, ExternalLink, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { Brand } from "./brand";

export function AgentHandoff({ id }: { id: string }) {
  const [agreementUrl, setAgreementUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = fragment.get("access") ?? "";
    const timer = window.setTimeout(() => {
      if (token) {
        setAgreementUrl(`${window.location.origin}/deal/${id}#access=${encodeURIComponent(token)}`);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  async function copyLink() {
    if (!agreementUrl) return;
    await navigator.clipboard.writeText(agreementUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <main className="handoff-page"><section className="handoff-card"><Brand /><span className="handoff-icon"><Bot size={24} /></span><p className="eyebrow">Agent handoff</p><h1>Give this agreement to your agent.</h1><p className="intro">Copy the secure link, paste it into your agent, and ask it to open the agreement using Mutual Assent AI site tools. The link is private, single-use, and intended only for your party.</p>{agreementUrl ? <><button className="button-primary" onClick={() => void copyLink()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Copied" : "Copy secure link for my agent"}</button><a className="button-secondary" href={agreementUrl}>Open it myself <ExternalLink size={15} /></a></> : <div className="invalid-link"><LockKeyhole size={18} /> This handoff link is missing or invalid.</div>}</section></main>;
}
