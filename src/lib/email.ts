import {
  actionRequiredEmailCopy,
  approvalResetEmailCopy,
  completedEmailCopy,
  counterpartyConfirmationEmailCopy,
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
  const agentHandoff = url
    ? `<div style="margin-top:28px;padding:20px;background:#f5f7fa;border:1px solid #dfe4ec;border-radius:10px"><div style="color:#172033;font-size:14px;font-weight:700">Want your agent to handle this?</div><p style="margin:7px 0 14px;color:#687287;font-size:13px;line-height:1.55">Provide this secure link to your agent and ask it to use Mutual Assent AI site tools. Your agent can review the agreement and perform available non-signing actions; signing is reserved for you.</p><a href="${escapeHtml(agentHandoffUrl(url))}" style="padding:10px 13px;display:inline-block;color:#2457d6;background:white;border:1px solid #b9c9eb;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700">Copy link for your agent</a></div>`
    : "";
  return `<div style="margin:0;padding:40px 20px;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:0 auto;padding:36px;background:white;border:1px solid #dfe4ec;border-radius:12px"><div style="font-size:18px;font-weight:700;color:#172033">Mutual Assent AI</div><p style="margin:32px 0 0;font-size:13px;color:#2457d6;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(content.eyebrow)}</p><h1 style="margin:10px 0 0;font-size:27px;line-height:1.2">${escapeHtml(content.heading)}</h1>${body}${button}${agentHandoff}<p style="margin:30px 0 0;color:#8a93a2;font-size:11px;line-height:1.5">${escapeHtml(content.footer)}</p></div></div>`;
}

function agentHandoffUrl(url: string) {
  const handoff = new URL(url);
  handoff.pathname = handoff.pathname.replace(/^\/deal\//, "/handoff/");
  return handoff.toString();
}

function renderText(content: AgreementEmailContent, url?: string) {
  return [content.heading, "", content.body, url && content.actionLabel ? `\n${content.actionLabel}: ${url}` : "", url ? `\nUsing an agent? Provide this secure link to your agent and ask it to use Mutual Assent AI site tools:\n${url}\n\nYour agent can review the agreement and perform available non-signing actions. Signing is reserved for you.` : "", "", content.footer]
    .filter((line) => line !== undefined)
    .join("\n");
}

function senderName(value = "Mutual Assent AI") {
  return value.replace(/[\r\n<>\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Mutual Assent AI";
}

async function sendEmail(to: string, content: AgreementEmailContent, url?: string, replyTo?: string, fromName?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  const senderAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `${senderName(fromName)} <${senderAddress.trim()}>`,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: content.subject,
        html: renderEmail(content, url),
        text: renderText(content, url),
      }),
    });
    if (!response.ok) console.error("Agreement email failed", response.status);
    return response.ok;
  } catch (error) {
    console.error("Agreement email failed", error instanceof Error ? error.name : "unknown_error");
    return false;
  }
}

export function sendReviewInvitation(agreement: StoredAgreement, url: string) {
  return sendEmail(agreement.signer.email, invitationEmailCopy({
    author: agreement.author.legalName,
    authorEmail: agreement.author.email,
    title: agreement.title,
    recipientEmail: agreement.signer.email,
  }), url, agreement.author.email, `${agreement.author.legalName} via Mutual Assent AI`);
}

export function sendActionRequired(
  agreement: StoredAgreement,
  role: PartyRole,
  url: string,
  eventCount: number,
) {
  return sendEmail(agreement[role].email, actionRequiredEmailCopy({ title: agreement.title, eventCount }), url);
}

export function sendCounterpartyConfirmation(agreement: StoredAgreement, url: string) {
  return sendEmail(
    agreement.signer.email,
    counterpartyConfirmationEmailCopy({ title: agreement.title, author: agreement.author.legalName }),
    url,
    agreement.author.email,
    `${agreement.author.legalName} via Mutual Assent AI`,
  );
}

export function sendApprovalReset(agreement: StoredAgreement, role: PartyRole, url: string) {
  return sendEmail(agreement[role].email, approvalResetEmailCopy({ title: agreement.title }), url);
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
    subject: "Your Mutual Assent AI sign-in code",
    eyebrow: "Mutual Assent AI sign in",
    heading: "Your one-time sign-in code",
    body: code,
    footer: "Enter this code in Mutual Assent AI. It expires shortly and can only be used once.",
  });
}

export async function sendContactMessage(input: { name: string; email: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL;
  if (!apiKey || !from || !to) return false;
  const senderAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
  const subjectName = input.name.replace(/[\r\n]/g, " ").slice(0, 120);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `Mutual Assent AI <${senderAddress.trim()}>`,
        to: [to],
        reply_to: input.email,
        subject: `Mutual Assent AI contact from ${subjectName}`,
        html: `<div style="font-family:Arial,sans-serif;color:#172033"><h1 style="font-size:22px">New beta contact</h1><p><strong>Name:</strong> ${escapeHtml(input.name)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p></div>`,
        text: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
      }),
    });
    if (!response.ok) console.error("Contact email failed", response.status);
    return response.ok;
  } catch (error) {
    console.error("Contact email failed", error instanceof Error ? error.name : "unknown_error");
    return false;
  }
}
