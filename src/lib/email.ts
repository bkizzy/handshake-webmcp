import {
  actionRequiredEmailCopy,
  completedEmailCopy,
  endedEmailCopy,
  invitationEmailCopy,
  recoveryEmailCopy,
  signatureCodeEmailCopy,
  signatureReadyEmailCopy,
  type AgreementEmailContent,
} from "@/src/content/agreement-copy";
import type { PartyRole, StoredAgreement } from "@/src/lib/agreements/types";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  })[character] ?? character);
}

function renderEmail(content: AgreementEmailContent, url?: string) {
  const isCode = /^\d{6,8}$/.test(content.body);
  const body = isCode
    ? `<div style="margin:26px 0;padding:18px;color:#172033;background:#f5f7fa;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:.22em;text-align:center">${escapeHtml(content.body)}</div>`
    : `<p style="margin:18px 0 0;color:#687287;line-height:1.6">${escapeHtml(content.body)}</p>`;
  const button = url && content.actionLabel
    ? `<a href="${escapeHtml(url)}" style="margin-top:27px;padding:13px 18px;display:inline-block;color:white;background:#2457d6;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(content.actionLabel)}</a>`
    : "";
  return `<div style="margin:0;padding:40px 20px;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:0 auto;padding:36px;background:white;border:1px solid #dfe4ec;border-radius:12px"><div style="font-size:18px;font-weight:700;color:#172033">Handshake</div><p style="margin:32px 0 0;font-size:13px;color:#2457d6;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(content.eyebrow)}</p><h1 style="margin:10px 0 0;font-size:27px;line-height:1.2">${escapeHtml(content.heading)}</h1>${body}${button}<p style="margin:30px 0 0;color:#8a93a2;font-size:11px;line-height:1.5">${escapeHtml(content.footer)}</p></div></div>`;
}

function renderText(content: AgreementEmailContent, url?: string) {
  return [content.heading, "", content.body, url && content.actionLabel ? `\n${content.actionLabel}: ${url}` : "", "", content.footer]
    .filter((line) => line !== undefined)
    .join("\n");
}

async function sendEmail(to: string, content: AgreementEmailContent, url?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: renderEmail(content, url),
        text: renderText(content, url),
      }),
    });
    if (!response.ok) console.error("Agreement email failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("Agreement email failed", error);
    return false;
  }
}

export function sendReviewInvitation(agreement: StoredAgreement, url: string) {
  return sendEmail(agreement.signer.email, invitationEmailCopy({
    author: agreement.author.legalName,
    title: agreement.title,
    recipientEmail: agreement.signer.email,
  }), url);
}

export function sendActionRequired(
  agreement: StoredAgreement,
  role: PartyRole,
  url: string,
  eventCount: number,
) {
  return sendEmail(agreement[role].email, actionRequiredEmailCopy({ title: agreement.title, eventCount }), url);
}

export function sendSignatureReady(agreement: StoredAgreement, role: PartyRole, url: string) {
  return sendEmail(agreement[role].email, signatureReadyEmailCopy({ title: agreement.title }), url);
}

export function sendAgreementCompleted(agreement: StoredAgreement, role: PartyRole, url: string) {
  return sendEmail(agreement[role].email, completedEmailCopy({ title: agreement.title }), url);
}

export function sendAgreementEnded(agreement: StoredAgreement, role: PartyRole, url: string) {
  if (!agreement.termination) return Promise.resolve(false);
  return sendEmail(agreement[role].email, endedEmailCopy({
    title: agreement.title,
    status: agreement.termination.type,
    reason: agreement.termination.reason,
  }), url);
}

export function sendSignatureCode(agreement: StoredAgreement, role: PartyRole, code: string) {
  return sendEmail(agreement[role].email, signatureCodeEmailCopy({ title: agreement.title, code }));
}

export function sendAgreementRecovery(agreement: StoredAgreement, role: PartyRole, url: string) {
  return sendEmail(agreement[role].email, recoveryEmailCopy({
    title: agreement.title,
    role,
    recipientEmail: agreement[role].email,
  }), url);
}

export function sendLoginCode(email: string, code: string) {
  return sendEmail(email, {
    subject: "Your Handshake sign-in code",
    eyebrow: "Handshake sign in",
    heading: "Your one-time sign-in code",
    body: code,
    footer: "Enter this code in Handshake. It expires shortly and can only be used once.",
  });
}
