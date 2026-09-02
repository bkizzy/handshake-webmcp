import { z } from "zod";

const partySchema = z.object({
  legalName: z.string().trim().min(1),
  address: z.string().trim().min(1),
  signatoryName: z.string().trim().min(1),
  signatoryTitle: z.string().trim().min(1),
  email: z.email(),
});

export const createAgreementSchema = z.object({
  title: z.string().trim().min(1),
  kind: z.enum(["one-way", "mutual"]),
  author: partySchema,
  signer: partySchema,
  fields: z.object({
    effectiveDate: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
    governingLaw: z.string().trim().min(1),
    preExistingMaterials: z.string().trim(),
  }),
});

const redlineTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("field"),
    id: z.enum(["effectiveDate", "purpose", "governingLaw", "preExistingMaterials"]),
  }),
  z.object({ kind: z.literal("section"), id: z.string().trim().min(1) }),
]);

const agreementActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("update_document_fields"),
    fields: z
      .object({
        effectiveDate: z.string().optional(),
        purpose: z.string().optional(),
        governingLaw: z.string().optional(),
        preExistingMaterials: z.string().optional(),
      })
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    type: z.literal("update_draft_section"),
    sectionId: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
  z.object({ type: z.literal("invite") }),
  z.object({
    type: z.literal("propose_redline"),
    target: redlineTargetSchema,
    proposedValue: z.string().trim().min(1),
    rationale: z.string().trim(),
  }),
  z.object({
    type: z.literal("respond_redline"),
    redlineId: z.string().uuid(),
    decision: z.enum(["accept", "reject", "counter"]),
    counterValue: z.string().optional(),
    rationale: z.string().optional(),
  }),
  z.object({ type: z.literal("resend_invitation") }),
  z.object({ type: z.literal("mark_ready") }),
  z.object({ type: z.literal("sign"), typedName: z.string().trim().min(1) }),
]);

export const actionRequestSchema = z.object({
  source: z.enum(["human", "agent"]),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  action: agreementActionSchema,
});
