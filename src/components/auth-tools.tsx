"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export const authChangedEvent = "mutual-assent:auth-changed";

export function AuthTools() {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  useEffect(() => {
    if (typeof document.modelContext?.registerTool !== "function" || !client) return;
    const supabase = client;
    const controller = new AbortController();

    async function register() {
      await document.modelContext?.registerTool({
        name: "handshake_auth_request_code",
        description: "Request a one-time Mutual Assent AI author sign-in code without navigating away from the current page. The code is sent by email; retrieve it using your email capability, then call handshake_auth_submit_code. This does not create an agreement.",
        inputSchema: { type: "object", properties: { email: { type: "string", description: "The author's email address." } }, required: ["email"], additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: false },
        execute: async (input) => {
          const email = typeof (input as Record<string, unknown>)?.email === "string" ? (input as Record<string, string>).email.trim() : "";
          const response = await fetch("/api/auth/request-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
          const data = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) throw new Error(data?.error ?? "Could not send the sign-in code.");
          return { content: [{ type: "text", text: `A one-time code was sent to ${email}. Retrieve it from the author's email and call handshake_auth_submit_code on this page.` }], structuredContent: { sent: true, email } };
        },
      }, { signal: controller.signal });

      await document.modelContext?.registerTool({
        name: "handshake_auth_submit_code",
        description: "Complete Mutual Assent AI author authentication on the current page using the emailed code. This creates a persistent browser session without opening or operating the sign-in screens.",
        inputSchema: { type: "object", properties: { email: { type: "string" }, code: { type: "string", description: "The six- or eight-digit code from the email." } }, required: ["email", "code"], additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false, untrustedContentHint: false },
        execute: async (input) => {
          const values = (input ?? {}) as Record<string, unknown>;
          const email = typeof values.email === "string" ? values.email.trim() : "";
          const code = typeof values.code === "string" ? values.code.replace(/\D/g, "") : "";
          if (code.length !== 6 && code.length !== 8) throw new Error("The sign-in code must be six or eight digits.");
          const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
          if (error) throw new Error(error.message);
          window.dispatchEvent(new Event(authChangedEvent));
          window.setTimeout(() => router.refresh(), 150);
          return { content: [{ type: "text", text: `Authenticated ${email}. The current browser session is ready; continue on this page.` }], structuredContent: { authenticated: true, email } };
        },
      }, { signal: controller.signal });
    }

    void register().catch((error) => {
      if (!controller.signal.aborted) console.error("WebMCP auth tool registration failed", error);
    });
    return () => controller.abort();
  }, [client, router]);

  return null;
}
