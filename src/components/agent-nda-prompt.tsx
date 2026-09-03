"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function AgentNdaPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const resolvedPrompt = prompt.replace("{url}", "https://mutualassent.site");

  async function copyPrompt() {
    await navigator.clipboard.writeText(resolvedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <section className="agent-prompt" aria-labelledby="agent-prompt-title"><div><p id="agent-prompt-title">Paste this prompt into your favorite agent to start your NDA.</p><code>{resolvedPrompt}</code></div><button type="button" className="button-secondary" onClick={() => void copyPrompt()} aria-live="polite">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Copied" : "Copy prompt"}</button></section>;
}
