import type { AgreementStatus, PartyRole } from "@/src/lib/agreements/types";

export const agreementCopy = {
  brandName: "Mutual Assent AI",
  accessDeniedTitle: "We couldn’t open this agreement",
  openingWorkspace: "Opening secure workspace…",
  signingConsent: "I agree to use an electronic signature and intend my typed name to sign this agreement.",
  signatureCodeHelp: "We’ll email a six-digit code to verify your identity before applying your signature.",
  signedRecordNote: "The signed agreement, negotiation certificate, and cryptographic seal are locked together.",
  privateAgentBoundary: "Private instructions and conversations between you and your agent remain in your agent interface and are not part of the Mutual Assent AI record.",
};

export function roleLabel(role: PartyRole) {
  return role === "author" ? "Author" : "Signer";
}

export function statusLabel(status: AgreementStatus) {
  return ({
    draft: "Draft",
    review: "In review",
    ready: "Ready to sign",
    signed: "Executed",
    declined: "Declined",
    voided: "Voided",
  } as const)[status];
}

export type AgreementEmailContent = {
  subject: string;
  eyebrow: string;
  heading: string;
  body: string;
  actionLabel?: string;
  footer: string;
};

export function invitationEmailCopy(input: { author: string; title: string; recipientEmail: string }): AgreementEmailContent {
  return {
    subject: `${input.author} invited you to review ${input.title}`,
    eyebrow: "Agreement review",
    heading: `${input.author} invited you to review an agreement.`,
    body: `Review and redline ${input.title}. You can work directly or use a compatible browser agent. No account is required.`,
    actionLabel: "Review agreement",
    footer: `This secure link is intended for ${input.recipientEmail}. Signing remains a human action.`,
  };
}

export function actionRequiredEmailCopy(input: { title: string; eventCount: number }): AgreementEmailContent {
  return {
    subject: `Action requested on ${input.title}`,
    eyebrow: "Agreement update",
    heading: "The other party updated the negotiation.",
    body: `${input.eventCount} new agreement action${input.eventCount === 1 ? " is" : "s are"} ready for review. Later changes are grouped into this same handoff until you return.`,
    actionLabel: "Review updates",
    footer: "The secure link opens your party’s workspace. Private agent conversations are not included in the agreement record.",
  };
}

export function approvalResetEmailCopy(input: { title: string }): AgreementEmailContent {
  return {
    subject: `Changes require renewed approval for ${input.title}`,
    eyebrow: "Approval reset",
    heading: "A new redline changed the approved agreement.",
    body: `${input.title} is back in review. Previous approvals no longer apply; review the proposed change and approve the resulting version again.`,
    actionLabel: "Review new redline",
    footer: "The secure link opens your party’s workspace. Signing remains unavailable until both parties approve the updated version.",
  };
}

export function signatureReadyEmailCopy(input: { title: string }): AgreementEmailContent {
  return {
    subject: `${input.title} is ready for your signature`,
    eyebrow: "Signature requested",
    heading: "Both parties approved the current version.",
    body: `${input.title} is ready for you to review and sign. A human must complete the signature step.`,
    actionLabel: "Review and sign",
    footer: "Your electronic signature is verified with a one-time email code.",
  };
}

export function completedEmailCopy(input: { title: string }): AgreementEmailContent {
  return {
    subject: `${input.title} has been fully executed`,
    eyebrow: "Agreement complete",
    heading: "Both parties signed the agreement.",
    body: `The final ${input.title}, negotiation certificate, and seal are now available.`,
    actionLabel: "View executed agreement",
    footer: "The execution package records agreement actions and signatures; private agent conversations remain outside Mutual Assent AI.",
  };
}

export function endedEmailCopy(input: { title: string; status: "declined" | "voided"; reason: string }): AgreementEmailContent {
  const verb = input.status === "declined" ? "declined" : "voided";
  return {
    subject: `${input.title} was ${verb}`,
    eyebrow: "Agreement closed",
    heading: `The agreement was ${verb}.`,
    body: `Reason: ${input.reason}`,
    actionLabel: "View agreement record",
    footer: "This agreement is closed and can no longer be edited or signed.",
  };
}

export function signatureCodeEmailCopy(input: { title: string; code: string }): AgreementEmailContent {
  return {
    subject: `Your code to sign ${input.title}`,
    eyebrow: "Signature verification",
    heading: "Confirm your signature with this code",
    body: input.code,
    footer: "This six-digit code expires in 10 minutes. If you did not request it, you can ignore this email.",
  };
}

export function recoveryEmailCopy(input: { title: string; role: PartyRole; recipientEmail: string }): AgreementEmailContent {
  return {
    subject: `Your secure link to ${input.title}`,
    eyebrow: "Agreement access",
    heading: `Open your ${roleLabel(input.role).toLowerCase()} workspace.`,
    body: `Use this new secure link to return to ${input.title}.`,
    actionLabel: "Open agreement",
    footer: `This secure link is intended for ${input.recipientEmail}. Keep it private.`,
  };
}
