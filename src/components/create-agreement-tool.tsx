"use client";

import { useEffect } from "react";

function stringField(description: string) {
  return { type: "string", description };
}

export function CreateAgreementTool() {
  useEffect(() => {
    if (typeof document.modelContext?.registerTool !== "function") return;
    const controller = new AbortController();

    async function register() {
      try {
        await document.modelContext?.registerTool({
        name: "handshake_create_nda",
        description: "Agent directive: use Handshake AI WebMCP tools only and do not operate authoring controls through the DOM. A client without native site-tool support may invoke this registered tool through an executeTool compatibility bridge. If no WebMCP path is available or DOM interaction occurs, stop and report it to the owner. The author must be authenticated before creation: if asked to sign in, call handshake_auth_request_code on this page, retrieve the code from the author's email using your email capability, call handshake_auth_submit_code, then retry this tool without navigating away. Create a real one-way or mutual NDA draft in Handshake AI for the authenticated author. Provide the parties, signatories, addresses, purpose, effective date, and governing law. This creates the document but does not invite or sign for either party; review the draft before inviting the signer.",
        inputSchema: {
          type: "object",
          properties: {
            title: stringField("Document title, such as Mutual NDA."),
            kind: { type: "string", enum: ["mutual", "one-way"], description: "Whether both parties or primarily the author may disclose confidential information." },
            purpose: stringField("Specific business purpose for permitted use of confidential information."),
            effectiveDate: stringField("Effective date in YYYY-MM-DD format."),
            governingLaw: stringField("Governing jurisdiction, such as New York or Delaware."),
            authorLegalName: stringField("Author's full legal company or individual name."),
            authorAddress: stringField("Author's complete notice address."),
            authorSignatoryName: stringField("Author's expected human signatory."),
            authorSignatoryTitle: stringField("Author signatory's title."),
            signerLegalName: stringField("Invited party's full legal company or individual name."),
            signerAddress: stringField("Invited party's complete notice address."),
            signerSignatoryName: stringField("Invited party's expected human signatory."),
            signerSignatoryTitle: stringField("Invited signatory's title."),
            signerEmail: stringField("Email that will receive the review invitation."),
          },
          required: [
            "kind", "purpose", "effectiveDate", "governingLaw", "authorLegalName", "authorAddress",
            "authorSignatoryName", "authorSignatoryTitle", "signerLegalName", "signerAddress",
            "signerSignatoryName", "signerSignatoryTitle", "signerEmail",
          ],
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
          untrustedContentHint: true,
        },
        execute: async (rawInput) => {
          const input = (rawInput ?? {}) as Record<string, unknown>;
          const get = (key: string, fallback = "") => typeof input[key] === "string" ? (input[key] as string).trim() : fallback;
          const kind = get("kind");
          if (kind !== "mutual" && kind !== "one-way") throw new Error("kind must be mutual or one-way.");
          const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
          const auth = await authResponse.json().catch(() => null) as { email?: string | null } | null;
          if (!authResponse.ok || !auth?.email) {
            throw new Error("Author authentication is required. On this page, call handshake_auth_request_code with the author's email, retrieve the emailed code, call handshake_auth_submit_code, then retry handshake_create_nda.");
          }
          const response = await fetch("/api/agreements/agent", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              title: get("title", kind === "mutual" ? "Mutual NDA" : "Non-Disclosure Agreement"),
              kind,
              author: {
                legalName: get("authorLegalName"),
                address: get("authorAddress"),
                signatoryName: get("authorSignatoryName"),
                signatoryTitle: get("authorSignatoryTitle"),
                email: auth.email,
              },
              signer: {
                legalName: get("signerLegalName"),
                address: get("signerAddress"),
                signatoryName: get("signerSignatoryName"),
                signatoryTitle: get("signerSignatoryTitle"),
                email: get("signerEmail"),
              },
              fields: {
                effectiveDate: get("effectiveDate"),
                purpose: get("purpose"),
                governingLaw: get("governingLaw"),
                authorPreviouslyKnownInformation: "None disclosed.",
                signerPreviouslyKnownInformation: "None disclosed — the invited party may identify previously known information during review.",
              },
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message ?? "Could not create the NDA.");
          return {
            content: [{ type: "text", text: `Created ${data.agreement.title} as version 1 and saved it to the authenticated author's account. Give the private author link to the owner so they can open and manage the draft.` }],
            structuredContent: {
              agreementId: data.agreement.id,
              status: data.agreement.status,
              version: data.agreement.version,
              authorUrl: data.links.author,
            },
          };
        },
        }, { signal: controller.signal });
      } catch (error) {
        if (!controller.signal.aborted) console.error("WebMCP tool registration failed", error);
      }
    }

    void register();
    return () => controller.abort();
  }, []);

  return null;
}
