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
    authorPreviouslyKnownInformation: z.string().trim().optional(),
    signerPreviouslyKnownInformation: z.string().trim().optional(),
    preExistingMaterials: z.string().trim().optional(),
  }).transform((fields) => ({
    effectiveDate: fields.effectiveDate,
    purpose: fields.purpose,
    governingLaw: fields.governingLaw,
    authorPreviouslyKnownInformation: fields.authorPreviouslyKnownInformation || "None disclosed.",
    signerPreviouslyKnownInformation: fields.signerPreviouslyKnownInformation || fields.preExistingMaterials || "None disclosed.",
  })),
});

const redlineTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("field"),
    id: z.enum(["effectiveDate", "purpose", "governingLaw", "authorPreviouslyKnownInformation", "signerPreviouslyKnownInformation"]),
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
        authorPreviouslyKnownInformation: z.string().optional(),
        signerPreviouslyKnownInformation: z.string().optional(),
      })
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    type: z.literal("update_draft_section"),
    sectionId: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
  z.object({ type: z.literal("restore_version"), version: z.number().int().positive() }),
  z.object({ type: z.literal("invite") }),
  z.object({
    type: z.literal("update_participant"),
    role: z.enum(["author", "signer"]),
    participant: partySchema.partial().refine((value) => Object.keys(value).length > 0),
  }),
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
  z.object({ type: z.literal("decline"), reason: z.string().trim().min(1).max(1000) }),
  z.object({ type: z.literal("void"), reason: z.string().trim().min(1).max(1000) }),
  z.object({
    type: z.literal("sign"),
    typedName: z.string().trim().min(1),
    code: z.string().regex(/^\d{6}$/),
    consentVersion: z.string().trim().min(1),
  }),
]);

export const actionRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  expectedEventSequence: z.number().int().nonnegative(),
  action: agreementActionSchema,
});

export const acknowledgeRequestSchema = z.object({
  throughSequence: z.number().int().nonnegative(),
});

export const signatureCodeRequestSchema = z.object({});

export const recoverAgreementSchema = z.object({
  agreementId: z.string().uuid(),
  email: z.email(),
});
