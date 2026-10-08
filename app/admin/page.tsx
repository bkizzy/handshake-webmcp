import { BarChart3, ExternalLink, FileCheck2, FileClock, FilePlus2, Send, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { SiteHeader } from "@/src/components/site-header";
import { isAdminEmail } from "@/src/lib/admin-auth";
import { getAdminDashboardData } from "@/src/lib/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };

const statusLabels = {
  draft: "Draft",
  review: "In review",
  ready: "Ready to sign",
  signed: "Executed",
  declined: "Declined",
  voided: "Voided",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (!isAdminEmail(user.email)) notFound();
  const data = await getAdminDashboardData();

  const metrics = [
    { label: "Accounts", value: data.accountCount, icon: Users },
    { label: "Agreements started", value: data.agreementCount, icon: FilePlus2 },
    { label: "In progress", value: data.inProgressCount, icon: FileClock },
    { label: "Invitations sent", value: data.invitedCount, icon: Send },
    { label: "Executed", value: data.executedCount, icon: FileCheck2 },
  ];

  return <main className="admin-page"><SiteHeader /><section className="admin-shell app-shell"><div className="admin-heading"><div><p className="eyebrow">Private reporting</p><h1>Admin dashboard</h1><p>A lightweight view of account and agreement activity.</p></div><a className="button-secondary" href="https://vercel.com/boris-kizelshteyns-projects/handshake-webmcp/analytics" target="_blank" rel="noreferrer">View web analytics <ExternalLink size={16} /></a></div><div className="metric-grid">{metrics.map(({ label, value, icon: Icon }) => <article key={label}><span><Icon size={19} /></span><p>{label}</p><strong>{value}</strong></article>)}</div><section className="analytics-card"><div><span><BarChart3 size={20} /></span><div><h2>Visitor analytics</h2><p>Pageviews, visitors, top pages, referrers, geography, browsers, and devices are available in Vercel Analytics.</p></div></div><a href="https://vercel.com/boris-kizelshteyns-projects/handshake-webmcp/analytics" target="_blank" rel="noreferrer">Open Vercel Analytics <ExternalLink size={15} /></a></section><div className="admin-tables"><section><div className="table-heading"><h2>Recent accounts</h2><span>{data.accountCount} total</span></div><div className="table-list">{data.recentAccounts.map((account) => <div className="table-row" key={account.id}><div><strong>{account.email || "Email unavailable"}</strong><small>Joined {formatDate(account.created_at)}</small></div><span>{account.last_sign_in_at ? `Active ${formatDate(account.last_sign_in_at)}` : "Not yet active"}</span></div>)}</div></section><section><div className="table-heading"><h2>Recent agreements</h2><span>{data.agreementCount} total</span></div><div className="table-list">{data.recentAgreements.map((agreement) => <div className="table-row" key={agreement.id}><div><strong>{agreement.title}</strong><small>Started {formatDate(agreement.createdAt)}</small></div><span className={`status ${agreement.status}`}>{statusLabels[agreement.status]}</span></div>)}</div></section></div></section><style>{styles}</style></main>;
}

const styles = `.admin-page{min-height:100vh;background:var(--canvas)}.admin-shell{padding-top:58px;padding-bottom:100px}.admin-heading{margin-bottom:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.admin-heading h1{margin:9px 0 0;color:#243047;font-size:40px;line-height:1.08;letter-spacing:-.04em}.admin-heading p:last-child{margin:9px 0 0;color:var(--muted);font-size:16px}.metric-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.metric-grid article{padding:20px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow-sm)}.metric-grid article>span,.analytics-card>div>span{width:38px;height:38px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:9px}.metric-grid p{margin:16px 0 3px;color:var(--muted);font-size:13px;font-weight:700}.metric-grid strong{color:var(--ink);font-size:31px;line-height:1}.analytics-card{margin-top:16px;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid #cfd9f1;border-radius:12px;background:#f7f9ff}.analytics-card>div{display:flex;align-items:center;gap:14px}.analytics-card h2{margin:0;color:#263147;font-size:18px}.analytics-card p{margin:3px 0 0;color:var(--muted);font-size:14px}.analytics-card>a{display:inline-flex;align-items:center;gap:6px;color:var(--blue);font-size:14px;font-weight:750;text-decoration:none;white-space:nowrap}.admin-tables{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:18px}.admin-tables>section{overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow-sm)}.table-heading{padding:18px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--soft-line)}.table-heading h2{margin:0;color:#2d394e;font-size:18px}.table-heading span{color:var(--muted);font-size:12px;font-weight:700}.table-list{display:grid}.table-row{min-height:67px;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--soft-line);color:inherit;text-decoration:none}.table-row:last-child{border-bottom:0}.table-row>div{min-width:0;display:grid;gap:3px}.table-row strong{overflow:hidden;color:#354057;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.table-row small{color:#7a8496;font-size:12px}.table-row>span{color:#657084;font-size:12px;text-align:right;white-space:nowrap}.table-row .status{padding:5px 8px;border-radius:999px;background:#f1f3f6;font-weight:750}.table-row .status.signed{color:var(--green);background:var(--green-soft)}.table-row .status.review,.table-row .status.ready{color:var(--blue);background:var(--blue-soft)}@media(max-width:980px){.metric-grid{grid-template-columns:repeat(3,1fr)}.admin-tables{grid-template-columns:1fr}}@media(max-width:650px){.admin-heading,.analytics-card{align-items:flex-start;flex-direction:column}.metric-grid{grid-template-columns:1fr 1fr}.admin-heading h1{font-size:34px}}`;
