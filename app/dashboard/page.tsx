import { redirect } from "next/navigation";

import { AgreementList } from "@/src/components/agreement-list";
import { SiteHeader } from "@/src/components/site-header";
import { listAgreementsByOwner } from "@/src/lib/agreements/repository";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "In-progress agreements" };

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?returnTo=/dashboard");
  const agreements = (await listAgreementsByOwner(user.id)).filter((agreement) => agreement.status !== "signed");
  return <main className="account-page"><SiteHeader /><section className="account-shell app-shell"><div className="account-heading"><div><p className="eyebrow">Your workspace</p><h1>Agreements in progress</h1><p>Drafts, reviews, redlines, approvals, and signatures that still need attention.</p></div><a className="button-primary" href="/new">New agreement</a></div><AgreementList agreements={agreements} emptyTitle="No agreements in progress" emptyCopy="Start an agreement yourself or ask your agent to prepare one and it will appear here automatically." /></section><style>{accountStyles}</style></main>;
}

const accountStyles = `.account-page{min-height:100vh;background:var(--canvas)}.account-shell{max-width:980px;padding-top:58px;padding-bottom:100px}.account-heading{margin-bottom:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.account-heading h1{margin:10px 0 0;color:#243047;font-size:38px;line-height:1.1;letter-spacing:-.04em}.account-heading p:last-child{margin:10px 0 0;color:#657084;font-size:15px}.account-heading .button-primary{flex:0 0 auto}@media(max-width:650px){.account-heading{align-items:flex-start;flex-direction:column}.account-heading h1{font-size:32px}}`;
