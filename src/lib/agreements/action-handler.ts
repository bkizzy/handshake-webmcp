import { NextResponse } from "next/server";

import { resolveAgreementAccess } from "./access";
import {
  AgreementError,
  executeAgreementAction,
  issueAgreementAccess,
  latestEventSequence,
  toAgreementView,
} from "./domain";
import { getAgreementById, saveAgreement } from "./repository";
import { actionRequestSchema } from "./schemas";
import { sealSignedAgreement } from "./seal";
import type { ActorSource, PartyRole, StoredAgreement } from "./types";
import {
  sendActionRequired,
  sendApprovalReset,
  sendAgreementCompleted,
  sendAgreementEnded,
  sendCounterpartyConfirmation,
  sendReviewInvitation,
  sendSignatureReady,
} from "@/src/lib/email";
import { consumeRateLimit, recordSecurityEvent, requestIp } from "@/src/lib/security";

type Delivery = {
  role: PartyRole;
  kind: "invitation" | "counterparty_confirmation" | "action_required" | "approval_reset" | "signature_ready" | "completed" | "ended";
  email: string;
  url: string;
  throughSequence: number;
};

function otherRole(role: PartyRole): PartyRole {
  return role === "author" ? "signer" : "author";
}

function actionRecipient(actionType: string, actorRole: PartyRole) {
  if (["update_participant", "restore_version", "propose_redline", "record_counterparty_redline", "review_emailed_redline", "respond_redline", "mark_ready", "sign", "decline", "void"].includes(actionType)) {
    return otherRole(actorRole);
  }
  return null;
}

export async function processAgreementAction(
  request: Request,
  id: string,
  source: ActorSource,
  options: { exposeInvitationUrl?: boolean; body?: unknown; allowHumanSignature?: boolean } = {},
) {
  const body = actionRequestSchema.parse(options.body ?? await request.json());
  if (body.action.type === "sign" && !options.allowHumanSignature) {
    throw new AgreementError("Use the human signing form to apply a signature.", "human_signature_required", 403);
  }
  const access = await resolveAgreementAccess(id);
  const { agreement: current, role } = access;

  if (body.idempotencyKey && current.processedActionKeys.includes(body.idempotencyKey)) {
    return NextResponse.json({ agreement: toAgreementView(current, role), replayed: true });
  }

  const sendsInvitation = body.action.type === "invite"
    || body.action.type === "resend_invitation"
    || (body.action.type === "update_participant"
      && body.action.role === "signer"
      && typeof body.action.participant.email === "string"
      && body.action.participant.email.toLowerCase() !== current.signer.email.toLowerCase());
  if (sendsInvitation) {
    const recipientEmail = body.action.type === "update_participant"
      ? body.action.participant.email ?? current.signer.email
      : current.signer.email;
    const limit = await consumeRateLimit("agreement-invitation", `${id}:${recipientEmail}`, 10, 60 * 60);
    if (!limit.available) throw new AgreementError("Invitation delivery is temporarily unavailable.", "invitation_unavailable", 503);
    if (!limit.allowed) {
      await recordSecurityEvent({ eventType: "agreement.invitation_rate_limited", agreementId: id, actorRole: role, actorSource: source, ipAddress: requestIp(request) });
      throw new AgreementError("Too many invitations were sent for this agreement. Try again later.", "invitation_rate_limited", 429, { retryAfterSeconds: limit.retryAfterSeconds });
    }
  }

  const currentSequence = latestEventSequence(current);
  if (body.expectedEventSequence !== currentSequence) {
    throw new AgreementError(
      "The agreement changed since you last read it. The latest state is included; review it before retrying.",
      "state_changed",
      409,
      { agreement: toAgreementView(current, role), expected: body.expectedEventSequence, actual: currentSequence },
    );
  }

  const authorEmailBefore = current.author.email.toLowerCase();
  const signerEmailBefore = current.signer.email.toLowerCase();
  let updated: StoredAgreement;
  try {
    updated = executeAgreementAction(current, {
      role,
      source,
      ipAddress: source === "human" ? requestIp(request) : undefined,
      userAgent: source === "human" ? request.headers.get("user-agent") ?? undefined : undefined,
    }, body.action);
  } catch (error) {
    if (
      error instanceof AgreementError
      && error.code === "signature_code_invalid"
      && body.action.type === "sign"
      && error.details?.challenge
    ) {
      const failed = structuredClone(current);
      failed.signatureChallenges[role] = error.details.challenge as typeof failed.signatureChallenges[typeof role];
      failed.updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
      await saveAgreement(failed, { expectedUpdatedAt: current.updatedAt });
      await recordSecurityEvent({ eventType: "signature.code_failed", agreementId: id, actorRole: role, actorSource: source, ipAddress: requestIp(request) });
      throw new AgreementError(error.message, error.code, error.status, {
        attemptsRemaining: error.details.attemptsRemaining,
      });
    }
    throw error;
  }
  if (updated.status === "signed") updated = await sealSignedAgreement(updated);
  if (authorEmailBefore !== updated.author.email.toLowerCase()) {
    updated.access.author = [];
    updated.accessSessions.author = [];
  }
  if (signerEmailBefore !== updated.signer.email.toLowerCase()) {
    updated.access.signer = [];
    updated.accessSessions.signer = [];
  }
  updated.notifications[role].acknowledgedThrough = Math.max(
    updated.notifications[role].acknowledgedThrough,
    currentSequence,
  );

  const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const deliveries: Delivery[] = [];
  let invitation: { email: string; url?: string; delivered?: boolean } | undefined;
  const sequence = latestEventSequence(updated);
  const approvalReset = (body.action.type === "propose_redline" || body.action.type === "record_counterparty_redline")
    && (current.status === "ready" || current.readiness.author || current.readiness.signer)
    && !updated.readiness.author
    && !updated.readiness.signer;

  if ((body.action.type === "invite" || body.action.type === "resend_invitation") && role === "author") {
    const issued = issueAgreementAccess(updated, "signer", { replace: true });
    updated = issued.agreement;
    const url = `${origin}/deal/${updated.id}#access=${encodeURIComponent(issued.token)}`;
    updated.notifications.signer.notifiedThrough = sequence;
    updated.notifications.signer.lastKind = "invitation";
    updated.notifications.signer.lastSentAt = new Date().toISOString();
    deliveries.push({ role: "signer", kind: "invitation", email: updated.signer.email, url, throughSequence: sequence });
    invitation = { email: updated.signer.email, ...(options.exposeInvitationUrl ? { url } : {}) };
  }

  if (
    body.action.type === "update_participant"
    && body.action.role === "signer"
    && signerEmailBefore !== updated.signer.email.toLowerCase()
  ) {
    if (updated.status !== "draft") {
      const issued = issueAgreementAccess(updated, "signer", { replace: true });
      updated = issued.agreement;
      const url = `${origin}/deal/${updated.id}#access=${encodeURIComponent(issued.token)}`;
      updated.notifications.signer.notifiedThrough = sequence;
      updated.notifications.signer.lastKind = "invitation";
      updated.notifications.signer.lastSentAt = new Date().toISOString();
      deliveries.push({ role: "signer", kind: "invitation", email: updated.signer.email, url, throughSequence: sequence });
      invitation = { email: updated.signer.email, ...(options.exposeInvitationUrl ? { url } : {}) };
    }
  }

  if (updated.status === "signed") {
    for (const recipient of ["author", "signer"] as PartyRole[]) {
      const issued = issueAgreementAccess(updated, recipient, { replace: true });
      updated = issued.agreement;
      const url = `${origin}/deal/${updated.id}#access=${encodeURIComponent(issued.token)}`;
      updated.notifications[recipient].notifiedThrough = sequence;
      updated.notifications[recipient].lastKind = "completed";
      updated.notifications[recipient].lastSentAt = new Date().toISOString();
      deliveries.push({ role: recipient, kind: "completed", email: updated[recipient].email, url, throughSequence: sequence });
    }
  } else if (updated.status === "declined" || updated.status === "voided") {
    const recipient = otherRole(role);
    const issued = issueAgreementAccess(updated, recipient, { replace: true });
    updated = issued.agreement;
    const url = `${origin}/deal/${updated.id}#access=${encodeURIComponent(issued.token)}`;
    updated.notifications[recipient].notifiedThrough = sequence;
    updated.notifications[recipient].lastKind = "ended";
    updated.notifications[recipient].lastSentAt = new Date().toISOString();
    deliveries.push({ role: recipient, kind: "ended", email: updated[recipient].email, url, throughSequence: sequence });
  } else if (!deliveries.length && updated.status !== "draft") {
    const recipient = actionRecipient(body.action.type, role);
    if (recipient) {
      const notification = updated.notifications[recipient];
      const firstPendingConfirmation = body.action.type === "record_counterparty_redline"
        && notification.lastKind !== "counterparty_confirmation";
      if (approvalReset || firstPendingConfirmation || notification.acknowledgedThrough >= notification.notifiedThrough) {
        const issued = issueAgreementAccess(updated, recipient, { replace: true });
        updated = issued.agreement;
        const url = `${origin}/deal/${updated.id}#access=${encodeURIComponent(issued.token)}`;
        const kind = body.action.type === "record_counterparty_redline"
          ? "counterparty_confirmation"
          : approvalReset ? "approval_reset" : updated.status === "ready" ? "signature_ready" : "action_required";
        updated.notifications[recipient].notifiedThrough = sequence;
        updated.notifications[recipient].lastKind = kind;
        updated.notifications[recipient].lastSentAt = new Date().toISOString();
        deliveries.push({ role: recipient, kind, email: updated[recipient].email, url, throughSequence: sequence });
      }
    }
  }

  if (body.idempotencyKey) {
    updated.processedActionKeys = [...updated.processedActionKeys.slice(-199), body.idempotencyKey];
  }
  try {
    await saveAgreement(updated, { expectedUpdatedAt: current.updatedAt });
  } catch (error) {
    if (error instanceof AgreementError && error.code === "state_changed") {
      const latest = await getAgreementById(id);
      throw new AgreementError(
        "The agreement changed before this action could be saved. Review the latest state before retrying.",
        "state_changed",
        409,
        latest ? { agreement: toAgreementView(latest, role) } : undefined,
      );
    }
    throw error;
  }

  if (["invite", "resend_invitation", "sign", "decline", "void", "restore_version"].includes(body.action.type)) {
    await recordSecurityEvent({
      eventType: `agreement.${body.action.type}`,
      agreementId: id,
      actorRole: role,
      actorSource: source,
      ipAddress: requestIp(request),
      metadata: { sequence: latestEventSequence(updated), version: updated.version },
    });
  }

  const deliveryResults = await Promise.all(deliveries.map(async (delivery) => {
    let delivered = false;
    if (delivery.kind === "invitation") delivered = await sendReviewInvitation(updated, delivery.url);
    if (delivery.kind === "action_required") {
      const count = Math.max(1, updated.audit.filter(
        (event) => event.sequence > current.notifications[delivery.role].acknowledgedThrough
          && event.sequence <= delivery.throughSequence
          && event.actorRole !== delivery.role,
      ).length);
      delivered = await sendActionRequired(updated, delivery.role, delivery.url, count);
    }
    if (delivery.kind === "counterparty_confirmation") delivered = await sendCounterpartyConfirmation(updated, delivery.url);
    if (delivery.kind === "approval_reset") delivered = await sendApprovalReset(updated, delivery.role, delivery.url);
    if (delivery.kind === "signature_ready") delivered = await sendSignatureReady(updated, delivery.role, delivery.url);
    if (delivery.kind === "completed") delivered = await sendAgreementCompleted(updated, delivery.role, delivery.url);
    if (delivery.kind === "ended") delivered = await sendAgreementEnded(updated, delivery.role, delivery.url);
    return { role: delivery.role, kind: delivery.kind, email: delivery.email, delivered };
  }));

  if (invitation) {
    invitation.delivered = deliveryResults.find((item) => item.kind === "invitation")?.delivered ?? false;
  }
  return NextResponse.json({
    agreement: toAgreementView(updated, role),
    invitation,
    notifications: deliveryResults,
  });
}
