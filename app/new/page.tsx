import { ArrowRight, BriefcaseBusiness, FilePenLine, LockKeyhole, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/src/components/brand";
import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { hasSupabasePublicConfig } from "@/src/lib/supabase/config";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata = { title: "Choose an agreement" };

export default async function NewAgreementPage() {
  if (hasSupabasePublicConfig() && !(await getAuthenticatedUser())) redirect("/login?returnTo=/new");
  return (
    <main className="chooser-page">
      <CreateAgreementTool />
      <header><div className="app-shell header-inner"><Brand /><div className="secure"><LockKeyhole size={14} /> Private workspace</div></div></header>
      <section className="chooser app-shell">
        <Link href="/" className="back-link">← Back</Link>
        <p className="eyebrow">New agreement</p>
        <h1>What would you like to prepare?</h1>
        <p className="intro">Choose a starting point. You and your agent can work in the same agreement workspace.</p>
        <div className="agreement-types">
          <Link className="type-card available" href="/new/nda"><span className="type-icon"><FilePenLine size={24} /></span><div><span className="available-label">Available now</span><h2>Non-disclosure agreement</h2><p>Create a mutual or one-way NDA, invite the other party, redline, approve, and sign.</p></div><ArrowRight className="arrow" size={19} /></Link>
          <div className="type-card unavailable" aria-disabled="true"><span className="type-icon"><BriefcaseBusiness size={24} /></span><div><span>Coming soon</span><h2>Consulting agreement</h2><p>Define services, payment terms, ownership, confidentiality, and termination.</p></div></div>
          <div className="type-card unavailable" aria-disabled="true"><span className="type-icon"><Upload size={24} /></span><div><span>Coming soon</span><h2>Upload your own</h2><p>Bring an existing agreement into the same review, redline, and signature workflow.</p></div></div>
        </div>
        <div className="agent-path"><span>Using an agent?</span> Ask it to create an NDA here and it can skip the form, prepare the draft, and return your private author link.</div>
      </section>
      <style>{`
        .chooser-page{min-height:100vh;background:var(--canvas)}.chooser-page header{height:72px;display:flex;align-items:center;background:#fff;border-bottom:1px solid var(--line)}.header-inner{display:flex;align-items:center;justify-content:space-between}.secure{display:flex;align-items:center;gap:6px;color:#5f6a7e;font-size:14px;font-weight:650}.chooser{max-width:980px;padding-top:64px;padding-bottom:100px;position:relative;text-align:center}.back-link{position:absolute;top:28px;left:0;color:#5f6a7e;text-decoration:none;font-size:14px;font-weight:650}.chooser h1{max-width:720px;margin:14px auto 0;color:#172033;font-size:clamp(38px,5vw,56px);line-height:1.04;letter-spacing:-.05em}.intro{max-width:640px;margin:17px auto 0;color:#606b7f;font-size:17px}.agreement-types{margin-top:42px;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:16px;text-align:left}.type-card{min-height:280px;position:relative;padding:26px;display:flex;flex-direction:column;border:1px solid #d9e0e9;border-radius:14px;background:#fff;text-decoration:none;box-shadow:var(--shadow-sm)}.type-card.available{border-color:#bfcdf2;box-shadow:0 16px 42px rgba(36,87,214,.11);transition:transform 150ms,border-color 150ms}.type-card.available:hover{transform:translateY(-2px);border-color:var(--blue)}.type-icon{width:48px;height:48px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:11px}.type-card div{margin-top:28px}.type-card div>span{color:#737e91;font-size:12px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.type-card .available-label{color:var(--blue)}.type-card h2{margin:8px 0 0;color:#2f3a4f;font-size:20px;letter-spacing:-.02em}.type-card p{margin:9px 0 0;color:#667287;font-size:14px;line-height:1.55}.type-card .arrow{position:absolute;right:23px;bottom:23px;color:var(--blue)}.type-card.unavailable{background:#fafbfd;box-shadow:none}.type-card.unavailable .type-icon{color:#758094;background:#eef1f5}.agent-path{margin-top:20px;padding:16px 18px;color:#5e697d;border:1px solid #d7dfeb;border-radius:9px;background:#fff;font-size:14px;line-height:1.5}.agent-path span{color:var(--blue);font-weight:750}@media(max-width:760px){.chooser{padding-top:72px}.back-link{left:12px}.agreement-types{grid-template-columns:1fr}.type-card{min-height:220px}.chooser h1{font-size:39px}}
      `}</style>
    </main>
  );
}
