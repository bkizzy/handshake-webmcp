import { ArrowRight, Clock3, FileCheck2, FilePenLine, UsersRound } from "lucide-react";
import Link from "next/link";

import type { StoredAgreement } from "@/src/lib/agreements/types";

function displayStatus(agreement: StoredAgreement) {
  if (agreement.status === "signed") return "Executed";
  if (agreement.status === "declined") return "Declined";
  if (agreement.status === "voided") return "Voided";
  if (agreement.status === "ready") return Object.keys(agreement.signatures).length ? "Awaiting signature" : "Ready to sign";
  if (agreement.status === "review") {
    if (agreement.redlines.some((redline) => redline.status === "open")) return "Redlining";
    if (agreement.readiness.author || agreement.readiness.signer) return "Awaiting approval";
    return "Awaiting review";
  }
  return "Draft";
}

function statusIcon(agreement: StoredAgreement) {
  if (agreement.status === "signed") return <FileCheck2 size={17} />;
  if (agreement.status === "review") return <UsersRound size={17} />;
  if (agreement.status === "ready") return <Clock3 size={17} />;
  return <FilePenLine size={17} />;
}

export function AgreementList({ agreements, emptyTitle, emptyCopy }: { agreements: StoredAgreement[]; emptyTitle: string; emptyCopy: string }) {
  if (!agreements.length) return <div className="empty-list"><span><FilePenLine size={23} /></span><h2>{emptyTitle}</h2><p>{emptyCopy}</p><Link className="button-primary" href="/new">Start an agreement <ArrowRight size={15} /></Link><style>{styles}</style></div>;
  return <div className="agreement-list">{agreements.map((agreement) => <Link className="agreement-row" href={`/deal/${agreement.id}`} key={agreement.id}><span className={`row-icon ${agreement.status}`}>{statusIcon(agreement)}</span><div className="agreement-main"><h2>{agreement.title}</h2><p>{agreement.signer.legalName} · Updated {new Date(agreement.updatedAt).toLocaleDateString()}</p></div><div className="row-status"><b>{displayStatus(agreement)}</b><small>Version {agreement.version}</small></div><ArrowRight className="row-arrow" size={17} /></Link>)}<style>{styles}</style></div>;
}

const styles = `
  .agreement-list{display:grid;border:1px solid #dbe1e9;border-radius:12px;background:#fff;box-shadow:var(--shadow-sm);overflow:hidden}.agreement-row{min-height:92px;padding:18px;display:grid;grid-template-columns:42px 1fr auto 22px;align-items:center;gap:14px;color:inherit;text-decoration:none;border-bottom:1px solid #edf0f4;transition:background 160ms ease,transform 160ms ease}.agreement-row:last-child{border-bottom:0}.agreement-row:hover{background:#fafbfe}.agreement-row:active{transform:scale(.995)}.row-icon{width:42px;height:42px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:9px}.row-icon.signed,.row-icon.ready{color:var(--green);background:var(--green-soft)}.agreement-main h2{margin:0;color:#303b50;font-size:16px}.agreement-main p{margin:4px 0 0;color:#6f798c;font-size:14px}.row-status{min-width:130px;display:grid;text-align:right}.row-status b{color:#48546a;font-size:14px}.row-status small{color:#7e8796;font-size:12px}.row-arrow{color:#7f8999}.empty-list{padding:56px 24px;display:grid;justify-items:center;border:1px solid #dbe1e9;border-radius:12px;background:#fff;text-align:center}.empty-list>span{width:49px;height:49px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:13px}.empty-list h2{margin:15px 0 0;color:#344057;font-size:19px}.empty-list p{max-width:440px;margin:7px 0 22px;color:#6f798c;font-size:14px}@media(max-width:650px){.agreement-row{grid-template-columns:40px 1fr 20px}.row-status{grid-column:2;text-align:left}.row-arrow{grid-column:3;grid-row:1 / span 2}.agreement-main p{line-height:1.4}}
`;
