import { ArrowRight, BriefcaseBusiness, FilePenLine, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/src/components/site-header";
import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { CopyAgentPromptButton } from "@/src/components/copy-agent-prompt-button";
import { homeCopy } from "@/src/content/site-copy";
import { hasSupabasePublicConfig } from "@/src/lib/supabase/config";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata = { title: "Choose an agreement" };

export default async function NewAgreementPage() {
  if (hasSupabasePublicConfig() && !(await getAuthenticatedUser())) redirect("/login?returnTo=/new");
  return (
    <main className="chooser-page">
      <CreateAgreementTool />
      <SiteHeader />
      <section className="chooser app-shell">
        <Link href="/" className="back-link">← Back</Link>
        <p className="eyebrow">New agreement</p>
        <h1>What would you like to prepare?</h1>
        <p className="intro">Choose a starting point. You and your agent can work in the same agreement workspace.</p>
        <div className="agreement-types">
          <div className="type-card available"><span className="type-icon"><FilePenLine size={24} /></span><div><span className="available-label">Available now</span><h2>Non-disclosure agreement</h2><p>Create a mutual or one-way NDA, invite the other party, redline, approve, and sign.</p><p className="agent-prompt-preview">{homeCopy.agentPrompt.replace("{url}", "https://mutualassent.site")}</p></div><div className="type-actions"><CopyAgentPromptButton prompt={homeCopy.agentPrompt} /><Link href="/new/nda" aria-label="Create a non-disclosure agreement"><ArrowRight size={19} /></Link></div></div>
          <div className="type-card unavailable" aria-disabled="true"><span className="type-icon"><BriefcaseBusiness size={24} /></span><div><span>Coming soon</span><h2>Consulting agreement</h2><p>Define services, payment terms, ownership, confidentiality, and termination.</p><p className="agent-prompt-preview">“Prepare my next consulting agreement.”</p></div><div className="type-actions"><CopyAgentPromptButton disabled prompt="Open Mutual Assent AI at {url} and prepare my next consulting agreement when this workspace is available. Use the information you already know and ask me only for details that materially affect the agreement." /></div></div>
          <div className="type-card unavailable" aria-disabled="true"><span className="type-icon"><Upload size={24} /></span><div><span>Coming soon</span><h2>Upload your own</h2><p>Bring an existing agreement into the same review, redline, and signature workflow.</p><p className="agent-prompt-preview">“Bring my agreement into Mutual Assent AI.”</p></div><div className="type-actions"><CopyAgentPromptButton disabled prompt="Open Mutual Assent AI at {url} and bring my existing agreement into the review, redline, and signature workflow when document upload is available." /></div></div>
        </div>
      </section>
      <style>{`
        .chooser-page{min-height:100vh;background:var(--canvas)}.chooser-page header{height:72px;display:flex;align-items:center;background:#fff;border-bottom:1px solid var(--line)}.header-inner{display:flex;align-items:center;justify-content:space-between}.secure{display:flex;align-items:center;gap:6px;color:#5f6a7e;font-size:14px;font-weight:650}.chooser{max-width:980px;padding-top:64px;padding-bottom:100px;position:relative;text-align:center}.back-link{position:absolute;top:28px;left:0;color:#5f6a7e;text-decoration:none;font-size:14px;font-weight:650}.chooser h1{max-width:720px;margin:14px auto 0;color:#172033;font-size:clamp(38px,5vw,56px);line-height:1.04;letter-spacing:-.05em}.intro{max-width:640px;margin:17px auto 0;color:#606b7f;font-size:17px}.agreement-types{margin-top:42px;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:16px;text-align:left}.type-card{min-height:280px;position:relative;padding:26px;display:flex;flex-direction:column;border:1px solid #d9e0e9;border-radius:14px;background:#fff;text-decoration:none;box-shadow:var(--shadow-sm)}.type-card.available{border-color:#bfcdf2;box-shadow:0 16px 42px rgba(36,87,214,.11);transition:transform 150ms,border-color 150ms}.type-card.available:hover{transform:translateY(-2px);border-color:var(--blue)}.type-icon{width:48px;height:48px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:11px}.type-card>div:not(.type-actions){margin-top:28px}.type-card div>span{color:#737e91;font-size:12px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.type-card .available-label{color:var(--blue)}.type-card h2{margin:8px 0 0;color:#2f3a4f;font-size:20px;letter-spacing:-.02em}.type-card p{margin:9px 0 0;color:#667287;font-size:14px;line-height:1.55}.type-card .agent-prompt-preview{display:-webkit-box;overflow:hidden;margin-top:16px;color:#456274;font-size:13px;font-weight:650;-webkit-box-orient:vertical;-webkit-line-clamp:2}.type-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:20px}.type-actions>a{width:36px;height:36px;display:grid;place-items:center;color:var(--blue);border-radius:7px}.type-actions>a:hover{background:var(--blue-soft)}.copy-agent-prompt{min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 9px;color:#345069;border:1px solid #ced9df;border-radius:7px;background:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.copy-agent-prompt:hover{border-color:var(--blue);color:var(--blue)}.copy-agent-prompt:disabled{cursor:not-allowed;opacity:.45}.type-card.unavailable{background:#fafbfd;box-shadow:none}.type-card.unavailable .type-icon{color:#758094;background:#eef1f5}@media(max-width:760px){.chooser{padding-top:72px}.back-link{left:12px}.agreement-types{grid-template-columns:1fr}.type-card{min-height:220px}.chooser h1{font-size:39px}}
      `}</style>
    </main>
  );
}
