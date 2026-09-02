import { redirect } from "next/navigation";

import { AgreementList } from "@/src/components/agreement-list";
import { SiteHeader } from "@/src/components/site-header";
import { listAgreementsByOwner } from "@/src/lib/agreements/repository";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Executed agreements" };

export default async function ExecutedAgreementsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?returnTo=/agreements/executed");
  const agreements = (await listAgreementsByOwner(user.id)).filter((agreement) => agreement.status === "signed");
  return <main className="account-page"><SiteHeader /><section className="account-shell app-shell"><div className="account-heading"><p className="eyebrow">Your records</p><h1>Executed agreements</h1><p>Completed agreements are locked to their signed version and retain their full activity record.</p></div><AgreementList agreements={agreements} emptyTitle="No executed agreements yet" emptyCopy="When both parties sign, the immutable final agreement will be stored here." /></section><style>{`.account-page{min-height:100vh;background:var(--canvas)}.account-shell{max-width:980px;padding-top:58px;padding-bottom:100px}.account-heading{margin-bottom:24px}.account-heading h1{margin:10px 0 0;color:#243047;font-size:36px;line-height:1.1;letter-spacing:-.04em}.account-heading p:last-child{margin:9px 0 0;color:#727d90;font-size:12px}`}</style></main>;
}
