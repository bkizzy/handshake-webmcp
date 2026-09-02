import { resolveAgreementAccess } from "@/src/lib/agreements/access";
import { AgreementError } from "@/src/lib/agreements/domain";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { agreement } = await resolveAgreementAccess(id, request);
    if (agreement.status !== "signed" || !agreement.execution) {
      throw new AgreementError("The final record is available after both parties sign.", "not_executed", 409);
    }

    const signatures = [agreement.signatures.author, agreement.signatures.signer]
      .filter(Boolean)
      .map((signature) => `<div><strong>${escapeHtml(signature!.typedName)}</strong><br><small>Signed ${escapeHtml(signature!.signedAt)} · version ${signature!.documentVersion}</small></div>`)
      .join("");
    const sections = agreement.sections
      .map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`)
      .join("");
    const activity = agreement.audit
      .map((event) => `<li>${escapeHtml(event.createdAt)} — ${escapeHtml(event.actorSource === "agent" ? `Agent for ${event.actorRole}` : event.actorRole)} ${escapeHtml(event.summary.toLowerCase())} (v${event.version})</li>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${escapeHtml(agreement.title)}</title><style>body{max-width:760px;margin:48px auto;padding:0 28px;color:#172033;font:15px/1.65 Georgia,serif}header{text-align:center;border-bottom:1px solid #dfe4ec;padding-bottom:28px}h1{font-size:30px}h2{font-size:17px;margin-top:30px}dl{display:grid;grid-template-columns:1fr 2fr;gap:8px 18px;padding:18px;background:#f5f7fa}dt{font:700 11px Arial,sans-serif;text-transform:uppercase;color:#687287}dd{margin:0}.parties,.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px}.signatures{margin-top:48px;padding-top:24px;border-top:1px solid #dfe4ec}.record{margin-top:48px;padding:20px;background:#f5f7fa;font:11px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.audit{margin-top:38px;font:11px/1.6 Arial,sans-serif;color:#586378}@media print{body{margin:0}.audit{break-before:page}}</style></head><body><header><p>${escapeHtml(agreement.kind === "mutual" ? "Mutual non-disclosure agreement" : "Non-disclosure agreement")}</p><h1>${escapeHtml(agreement.title)}</h1><p>Executed ${escapeHtml(agreement.execution.finalizedAt)}</p></header><dl><dt>Effective date</dt><dd>${escapeHtml(agreement.fields.effectiveDate)}</dd><dt>Purpose</dt><dd>${escapeHtml(agreement.fields.purpose)}</dd><dt>Governing law</dt><dd>${escapeHtml(agreement.fields.governingLaw)}</dd><dt>Pre-existing materials</dt><dd>${escapeHtml(agreement.fields.preExistingMaterials || "None listed")}</dd></dl><div class="parties"><div><h2>Author</h2><strong>${escapeHtml(agreement.author.legalName)}</strong><p>${escapeHtml(agreement.author.address)}</p></div><div><h2>Signer</h2><strong>${escapeHtml(agreement.signer.legalName)}</strong><p>${escapeHtml(agreement.signer.address)}</p></div></div>${sections}<div class="signatures">${signatures}</div><div class="record"><strong>Immutable execution record</strong><br>Document version: ${agreement.execution.documentVersion}<br>SHA-256: ${agreement.execution.sha256}</div><div class="audit"><h2>Activity record</h2><ol>${activity}</ol></div></body></html>`;
    const filename = `${agreement.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "agreement"}-executed.html`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
