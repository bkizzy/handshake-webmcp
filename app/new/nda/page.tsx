import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/src/components/site-header";
import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { NewAgreementForm } from "@/src/components/new-agreement-form";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export default async function NewNdaPage() {
  if (!(await getAuthenticatedUser())) redirect("/login?returnTo=/new/nda");
  return (
    <main className="new-page">
      <CreateAgreementTool />
      <SiteHeader />
      <div className="page-heading app-shell"><Link href="/new" className="back-link">← Agreement types</Link><h1>New NDA</h1><p>Set up the essential details before creating the draft.</p></div>
      <NewAgreementForm />
      <style>{`
        .new-page { min-height: 100vh; padding-bottom: 100px; background: var(--canvas); } header { height: 72px; display: flex; align-items: center; background: white; border-bottom: 1px solid var(--line); } .header-inner { display: flex; align-items: center; justify-content: space-between; } .secure { display: flex; align-items: center; gap: 6px; color: #6a7487; font-size: 12px; font-weight: 650; } .page-heading { position: relative; max-width: 920px; padding-top: 62px; padding-bottom: 28px; text-align: left; } .back-link { position: absolute; top: 25px; left: 0; color: #687287; text-decoration: none; font-size: 13px; font-weight: 650; } h1 { margin: 0; color: #172033; font-size: 30px; line-height: 1.15; letter-spacing: -.025em; } .page-heading > p:last-child { margin: 7px 0 0; color: #6b7588; font-size: 16px; } @media (max-width: 680px) { .page-heading { padding: 62px 12px 24px; } .back-link { left: 12px; } h1 { font-size: 28px; } }
      `}</style>
    </main>
  );
}
