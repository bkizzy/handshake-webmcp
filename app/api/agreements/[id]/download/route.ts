import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { buildNegotiationCertificate } from "@/src/lib/agreements/certificate";
import { knownInformationField, knownInformationLines, renderAgreementMarkdown, visibleKnownInformationRoles } from "@/src/lib/agreements/contract";
import { AgreementError } from "@/src/lib/agreements/domain";
import { buildAgreementPdf } from "@/src/lib/agreements/pdf";
import { saveAgreement } from "@/src/lib/agreements/repository";
import { sealSignedAgreement } from "@/src/lib/agreements/seal";
import type { NegotiationCertificate, StoredAgreement } from "@/src/lib/agreements/types";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  })[character] ?? character);
}

const printStyles = `body{max-width:780px;margin:48px auto;padding:0 28px;color:#172033;font:15px/1.65 Georgia,serif}header{text-align:center;border-bottom:1px solid #dfe4ec;padding-bottom:28px}h1{font-size:30px}h2{font-size:17px;margin-top:30px}dl{display:grid;grid-template-columns:1fr 2fr;gap:8px 18px;padding:18px;background:#f5f7fa}dt{font:700 11px Arial,sans-serif;text-transform:uppercase;color:#687287}dd{margin:0}.parties,.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px}.signatures{margin-top:48px;padding-top:24px;border-top:1px solid #dfe4ec}.appendix-list{margin:10px 0;padding-left:24px}.seal{margin-top:40px;padding:18px;background:#edf8f3;border:1px solid #bfe0d4;font:11px/1.6 ui-monospace,monospace;overflow-wrap:anywhere}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #dfe4ec;color:#6f7888;font:11px/1.6 Arial,sans-serif}@media print{body{margin:0}.no-print{display:none}}`;

function contractHtml(agreement: StoredAgreement) {
  const sections = agreement.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`).join("");
  const signatures = ([agreement.signatures.author, agreement.signatures.signer]).filter(Boolean).map((signature) => `<div><strong>${escapeHtml(signature!.typedName)}</strong><br><small>${escapeHtml(signature!.verifiedEmail)} verified by email code<br>Signed ${escapeHtml(signature!.signedAt)} · version ${signature!.documentVersion}</small></div>`).join("");
  const appendices = visibleKnownInformationRoles(agreement).map((role, index) => `<section><h2>Appendix ${String.fromCharCode(65 + index)} — Previously Known Information of ${escapeHtml(agreement[role].legalName)}</h2><p>The following information is identified as known lawfully and without restriction before disclosure:</p><ul class="appendix-list">${knownInformationLines(agreement.fields[knownInformationField(role)]).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${escapeHtml(agreement.title)}</title><style>${printStyles}</style></head><body><header><p>Handshake AI · ${escapeHtml(agreement.template.name)}</p><h1>${escapeHtml(agreement.title)}</h1><p>Executed ${escapeHtml(agreement.execution!.finalizedAt)}</p></header><dl><dt>Effective date</dt><dd>${escapeHtml(agreement.fields.effectiveDate)}</dd><dt>Purpose</dt><dd>${escapeHtml(agreement.fields.purpose)}</dd><dt>Governing law</dt><dd>${escapeHtml(agreement.fields.governingLaw)}</dd></dl><div class="parties"><div><h2>Author</h2><strong>${escapeHtml(agreement.author.legalName)}</strong><p>${escapeHtml(agreement.author.address)}</p></div><div><h2>Signer</h2><strong>${escapeHtml(agreement.signer.legalName)}</strong><p>${escapeHtml(agreement.signer.address)}</p></div></div>${sections}<div class="signatures">${signatures}</div>${appendices}<div class="seal"><strong>SHA-256 execution seal</strong><br>${escapeHtml(agreement.execution!.sealHash ?? agreement.execution!.sha256 ?? "Unavailable")}</div><p class="footer">This final presentation contains the executed terms. The separately downloadable Certificate of Negotiation records attributed agreement actions. Private agent prompts and conversations remain outside Handshake AI.</p><script>addEventListener("load",()=>setTimeout(()=>print(),150))</script></body></html>`;
}

function certificateHtml(certificate: NegotiationCertificate) {
  const partyRows = certificate.partySummaries.map((party) => `<tr><td>${escapeHtml(party.legalName)}</td><td>${escapeHtml(party.role)}</td><td>${party.agentProposals}</td><td>${party.humanNegotiationActions}</td><td>${escapeHtml(party.signedAt ?? "—")}</td></tr>`).join("");
  const terms = certificate.termHistory.map((term) => `<section><h2>${escapeHtml(term.label)}</h2><p>${term.events.length} recorded negotiation event${term.events.length === 1 ? "" : "s"}</p>${term.changed ? `<p><strong>Opening:</strong> ${escapeHtml(term.openingValue)}</p><p><strong>Final:</strong> ${escapeHtml(term.finalValue)}</p>` : ""}</section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Certificate — ${escapeHtml(certificate.title)}</title><style>${printStyles}table{width:100%;border-collapse:collapse;font:12px/1.5 Arial,sans-serif}th,td{padding:9px;border:1px solid #dfe4ec;text-align:left}th{background:#f5f7fa}</style></head><body><header><p>Certificate of Negotiation</p><h1>${escapeHtml(certificate.title)}</h1><p>Agreement ${escapeHtml(certificate.agreementId)}<br>Created ${escapeHtml(certificate.createdAt)} · Signed ${escapeHtml(certificate.signedAt)}</p></header><div class="seal"><strong>Verified SHA-256 seal</strong><br>${escapeHtml(certificate.sealHash)}<br><small>Sealed ${escapeHtml(certificate.sealedAt)}</small></div><h2>Party activity</h2><table><thead><tr><th>Party</th><th>Role</th><th>Agent proposals</th><th>Human actions</th><th>Signed (UTC)</th></tr></thead><tbody>${partyRows}</tbody></table><h2>Negotiated terms</h2>${terms || "<p>No terms changed during review.</p>"}<p class="footer">${escapeHtml(certificate.footer)}</p><script>addEventListener("load",()=>setTimeout(()=>print(),150))</script></body></html>`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { agreement: current } = await resolveAgreementAccess(id, request);
    let agreement = current;
    if (agreement.status === "signed" && agreement.execution && (!agreement.execution.canonicalJson || !agreement.execution.sealHash)) {
      agreement = await sealSignedAgreement(agreement);
      await saveAgreement(agreement, { expectedUpdatedAt: current.updatedAt });
    }
    const format = new URL(request.url).searchParams.get("format") ?? "pdf";
    if (format === "pdf") {
      const filename = `handshake-${agreement.id}-agreement-v${agreement.version}.pdf`;
      const pdf = await buildAgreementPdf(agreement);
      const pdfBody = new ArrayBuffer(pdf.byteLength);
      new Uint8Array(pdfBody).set(pdf);
      return new Response(pdfBody, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${filename}"`, "x-filename": filename, "cache-control": "private, no-store" } });
    }
    if (agreement.status !== "signed" || !agreement.execution) {
      throw new AgreementError("The execution package is available after both parties sign.", "not_executed", 409);
    }
    const execution = agreement.execution;
    if (!execution?.canonicalJson || !execution.sealHash) {
      throw new AgreementError("The execution package could not be sealed.", "seal_unavailable", 500);
    }
    if (format === "markdown") {
      const filename = `handshake-${agreement.id}-agreement.md`;
      return new Response(renderAgreementMarkdown(agreement), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "x-filename": filename, "cache-control": "private, no-store" } });
    }
    const certificate = buildNegotiationCertificate(agreement);
    if (format === "certificate") {
      const filename = `handshake-${agreement.id}-certificate.json`;
      const body = JSON.stringify({ certificate, seal: { algorithm: "SHA-256", hash: execution.sealHash, sealedAt: execution.sealedAt, canonicalJson: execution.canonicalJson } }, null, 2);
      return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "x-filename": filename, "cache-control": "private, no-store" } });
    }
    if (format === "print-certificate") return new Response(certificateHtml(certificate), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
    if (format === "print-contract") return new Response(contractHtml(agreement), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
    throw new AgreementError("Unknown export format.", "invalid_format", 400);
  } catch (error) {
    return apiError(error);
  }
}
