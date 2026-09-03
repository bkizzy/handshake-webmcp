import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { knownInformationField, visibleKnownInformationRoles } from "./contract";
import type { PartyRole, StoredAgreement } from "./types";

const pageWidth = 612;
const pageHeight = 792;
const margin = 58;
const contentWidth = pageWidth - margin * 2;

function pdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, " ");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of pdfText(text).split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function buildAgreementPdf(agreement: StoredAgreement) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage | undefined;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pageNumber += 1;
    y = pageHeight - margin;
    page.drawText(pdfText(agreement.title), { x: margin, y: 28, size: 7.5, font: sans, color: rgb(0.42, 0.45, 0.51) });
    page.drawText(`Page ${pageNumber}`, { x: pageWidth - margin - 34, y: 28, size: 7.5, font: sans, color: rgb(0.42, 0.45, 0.51) });
    return page;
  };

  const ensure = (height: number) => {
    if (!page || y - height < 52) addPage();
  };

  const paragraph = (text: string, options: { size?: number; font?: PDFFont; gap?: number; indent?: number } = {}) => {
    const size = options.size ?? 10.5;
    const font = options.font ?? regular;
    const gap = options.gap ?? 9;
    const indent = options.indent ?? 0;
    const lines = wrap(text, font, size, contentWidth - indent);
    const lineHeight = size * 1.42;
    for (const line of lines) {
      ensure(lineHeight + gap);
      if (line) page!.drawText(line, { x: margin + indent, y, size, font, color: rgb(0.11, 0.13, 0.17) });
      y -= lineHeight;
    }
    y -= gap;
  };

  const heading = (text: string, level = 2) => {
    const size = level === 1 ? 18 : 12;
    ensure(size * 2.5);
    y -= level === 1 ? 4 : 9;
    page!.drawText(pdfText(text), { x: margin, y, size, font: level === 1 ? bold : sansBold, color: rgb(0.08, 0.11, 0.17) });
    y -= size * 1.7;
  };

  addPage();
  const titleLines = wrap(agreement.title, bold, 21, contentWidth);
  for (const line of titleLines) {
    page!.drawText(line, { x: margin + (contentWidth - bold.widthOfTextAtSize(line, 21)) / 2, y, size: 21, font: bold, color: rgb(0.06, 0.09, 0.15) });
    y -= 27;
  }
  const subtitle = `${agreement.template.name} | Template ${agreement.template.version}`;
  page!.drawText(pdfText(subtitle), { x: margin + (contentWidth - sans.widthOfTextAtSize(pdfText(subtitle), 8.5)) / 2, y, size: 8.5, font: sans, color: rgb(0.38, 0.42, 0.5) });
  y -= 30;

  const partyRole = (role: PartyRole) => agreement.kind === "mutual"
    ? role === "author" ? "First Party" : "Second Party"
    : role === "author" ? "Disclosing Party" : "Receiving Party";
  paragraph(`This ${agreement.kind === "mutual" ? "Mutual " : ""}Non-Disclosure Agreement (the "Agreement") is entered into as of ${agreement.fields.effectiveDate} (the "Effective Date") by and between:`);
  for (const role of ["author", "signer"] as PartyRole[]) {
    const party = agreement[role];
    paragraph(`${party.legalName} (the "${partyRole(role)}")\n${party.address}\nAttention: ${party.signatoryName}, ${party.signatoryTitle}\n${party.email}`, { indent: 18 });
  }
  if (agreement.kind === "mutual") paragraph('Each may be a "Disclosing Party" or "Receiving Party" depending on the circumstances, and together they are the "Parties."');
  else paragraph('Together, they are the "Parties."');
  paragraph(`Purpose. The Parties wish to evaluate or pursue ${agreement.fields.purpose}.`, { font: bold });

  for (const section of agreement.sections) {
    heading(section.title);
    paragraph(section.body);
  }

  heading("Signatures", 1);
  paragraph("The Parties intend electronic signatures to have the same effect as original signatures.");
  for (const role of ["author", "signer"] as PartyRole[]) {
    const party = agreement[role];
    const signature = agreement.signatures[role];
    heading(`${partyRole(role)} - ${party.legalName}`);
    paragraph(signature
      ? `By: ${signature.typedName}\nTitle: ${party.signatoryTitle}\nSigned electronically: ${signature.signedAt} UTC\nEmail verified: ${signature.verifiedEmail}`
      : `By: ${party.signatoryName}\nTitle: ${party.signatoryTitle}\nDate: ____________________`, { indent: 18 });
  }

  for (const [index, role] of visibleKnownInformationRoles(agreement).entries()) {
    const party = agreement[role];
    heading(`Appendix ${String.fromCharCode(65 + index)} - Previously Known Information of ${party.legalName}`, 1);
    paragraph(`The following information is identified by ${party.legalName} as information it knew lawfully and without restriction before disclosure under this Agreement:`);
    paragraph(agreement.fields[knownInformationField(role)]?.trim() || "None disclosed.", { indent: 18 });
  }

  if (agreement.status === "signed" && agreement.execution?.sealHash) {
    ensure(76);
    y -= 10;
    page!.drawRectangle({ x: margin, y: y - 48, width: contentWidth, height: 58, color: rgb(0.94, 0.97, 0.96), borderColor: rgb(0.65, 0.79, 0.74), borderWidth: 0.7 });
    page!.drawText("HANDSHAKE EXECUTION SEAL (SHA-256)", { x: margin + 12, y: y - 7, size: 7.5, font: sansBold, color: rgb(0.08, 0.4, 0.29) });
    const sealLines = wrap(agreement.execution.sealHash, sans, 7, contentWidth - 24);
    sealLines.forEach((line, index) => page!.drawText(line, { x: margin + 12, y: y - 23 - index * 10, size: 7, font: sans, color: rgb(0.12, 0.2, 0.18) }));
  }

  pdf.setTitle(agreement.title);
  pdf.setSubject(agreement.template.name);
  pdf.setCreator("Handshake");
  pdf.setProducer("Handshake");
  return pdf.save();
}
