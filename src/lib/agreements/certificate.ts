import { agreementFieldLabels, reviewBaseline, targetKey } from "./contract";
import type {
  Agreement,
  AgreementFields,
  CertificateTermHistory,
  NegotiationCertificate,
  PartyRole,
  RedlineTarget,
} from "./types";

export const certificateFooter = "Every agreement action above corresponds to a structured Handshake interaction recorded at execution time. Private instructions and conversations between a party and its agent stay in that agent interface and are not part of this record.";

function labelForTarget(agreement: Agreement, target: RedlineTarget) {
  if (target.kind === "field") return agreementFieldLabels[target.id];
  return agreement.sections.find((section) => section.id === target.id)?.title ?? target.id;
}

function targetValue(fields: AgreementFields, sections: Agreement["sections"], target: RedlineTarget) {
  if (target.kind === "field") return fields[target.id];
  return sections.find((section) => section.id === target.id)?.body ?? "";
}

export function buildNegotiationCertificate(agreement: Agreement): NegotiationCertificate {
  if (!agreement.execution?.sealHash || !agreement.execution.sealedAt) {
    throw new Error("A comprehensive seal is required to build the certificate.");
  }
  const baseline = reviewBaseline(agreement);
  const targets = new Map<string, RedlineTarget>();
  for (const redline of agreement.redlines) targets.set(targetKey(redline.target), redline.target);
  for (const key of Object.keys(agreementFieldLabels) as Array<keyof AgreementFields>) {
    targets.set(`field:${key}`, { kind: "field", id: key });
  }
  for (const section of agreement.sections) targets.set(`section:${section.id}`, { kind: "section", id: section.id });

  const termHistory: CertificateTermHistory[] = [...targets.entries()]
    .map(([id, target]) => {
      const redlines = agreement.redlines.filter((redline) => targetKey(redline.target) === id);
      const openingValue = targetValue(baseline.fields, baseline.sections, target);
      const finalValue = targetValue(agreement.fields, agreement.sections, target);
      const events: CertificateTermHistory["events"] = [];
      for (const redline of redlines) {
        const isCounterProposal = agreement.redlines.some((candidate) => candidate.supersededBy === redline.id);
        if (!isCounterProposal) {
          events.push({
            at: redline.createdAt,
            party: redline.proposedBy,
            source: redline.proposedBySource,
            action: "proposed",
            value: redline.proposedValue,
            rationale: redline.rationale || undefined,
          });
        }
        if (redline.resolvedAt && redline.resolvedBy && redline.status === "superseded") {
          const counter = agreement.redlines.find((candidate) => candidate.id === redline.supersededBy);
          events.push({
            at: redline.resolvedAt,
            party: redline.resolvedBy,
            source: redline.resolvedBySource ?? "human",
            action: "countered",
            value: counter?.proposedValue,
            rationale: counter?.rationale || undefined,
          });
        } else if (redline.resolvedAt && redline.resolvedBy) {
          events.push({
            at: redline.resolvedAt,
            party: redline.resolvedBy,
            source: redline.resolvedBySource ?? "human",
            action: redline.status === "accepted" ? "accepted" : "rejected",
            value: redline.status === "accepted" ? redline.proposedValue : undefined,
          });
        }
      }
      const accepted = [...redlines].reverse().find((redline) => redline.status === "accepted");
      return {
        id,
        label: labelForTarget(agreement, target),
        openingValue,
        finalValue,
        changed: openingValue !== finalValue,
        events: events.sort((left, right) => left.at.localeCompare(right.at)),
        agreedAt: accepted?.resolvedAt,
      };
    })
    .filter((term) => term.changed || term.events.length > 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  const partySummaries = (["author", "signer"] as PartyRole[]).map((role) => ({
    role,
    legalName: agreement[role].legalName,
    agentProposals: agreement.redlines.filter((redline) => redline.proposedBy === role && redline.proposedBySource === "agent").length,
    humanNegotiationActions: agreement.audit.filter((event) => event.actorRole === role && event.actorSource === "human" && ["redline.proposed", "redline.accepted", "redline.rejected", "redline.countered", "party.ready"].includes(event.type)).length,
    readyAt: [...agreement.audit].reverse().find((event) => event.actorRole === role && event.type === "party.ready")?.createdAt,
    signedAt: agreement.signatures[role]?.signedAt,
  }));

  return {
    agreementId: agreement.id,
    template: agreement.template,
    title: agreement.title,
    kind: agreement.kind,
    parties: (["author", "signer"] as PartyRole[]).map((role) => ({ role, legalName: agreement[role].legalName })),
    createdAt: agreement.createdAt,
    signedAt: agreement.execution.finalizedAt,
    sealHash: agreement.execution.sealHash,
    sealedAt: agreement.execution.sealedAt,
    partySummaries,
    termHistory,
    footer: certificateFooter,
  };
}
