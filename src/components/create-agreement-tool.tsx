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
        description: "Create a real one-way or mutual NDA draft in Handshake for the author. Provide the parties, signatories, addresses, purpose, effective date, and governing law. This creates the document but does not invite or sign for either party; review the draft before inviting the signer.",
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
            authorEmail: stringField("Author's email address."),
            signerLegalName: stringField("Invited party's full legal company or individual name."),
            signerAddress: stringField("Invited party's complete notice address."),
            signerSignatoryName: stringField("Invited party's expected human signatory."),
            signerSignatoryTitle: stringField("Invited signatory's title."),
            signerEmail: stringField("Email that will receive the review invitation."),
          },
          required: [
            "kind", "purpose", "effectiveDate", "governingLaw", "authorLegalName", "authorAddress",
            "authorSignatoryName", "authorSignatoryTitle", "authorEmail", "signerLegalName", "signerAddress",
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
          const response = await fetch("/api/agreements", {
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
                email: get("authorEmail"),
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
                preExistingMaterials: "None listed — the invited party may identify prior work during review",
              },
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message ?? "Could not create the NDA.");
          return {
            content: [{ type: "text", text: `Created ${data.agreement.title} as version 1. Give the private author link to the owner so they can open, claim, and manage the draft without a password.` }],
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
