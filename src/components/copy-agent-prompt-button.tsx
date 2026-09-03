"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyAgentPromptButton({ prompt, disabled = false }: { prompt: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    const resolvedPrompt = prompt.replace("{url}", "https://mutualassent.site");
    await navigator.clipboard.writeText(resolvedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <button type="button" className="copy-agent-prompt" disabled={disabled} onClick={() => void copyPrompt()} aria-live="polite">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy agent prompt"}</button>;
}
