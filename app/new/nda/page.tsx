"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/src/components/brand";
import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { NewAgreementForm } from "@/src/components/new-agreement-form";

export default function NewNdaPage() {
  return (
    <main className="new-page">
      <CreateAgreementTool />
      <header><div className="app-shell header-inner"><Brand /><div className="secure"><LockKeyhole size={14} /> Private workspace</div></div></header>
      <div className="page-heading app-shell"><Link href="/new" className="back-link">← Agreement types</Link><p className="eyebrow">New NDA</p><h1>Start with the people,<br />not the paperwork.</h1><p>Set up the essential details. You or your agent can refine the document before it goes to the other party.</p></div>
      <NewAgreementForm />
      <style jsx>{`
        .new-page { min-height: 100vh; padding-bottom: 100px; background: var(--canvas); } header { height: 72px; display: flex; align-items: center; background: white; border-bottom: 1px solid var(--line); } .header-inner { display: flex; align-items: center; justify-content: space-between; } .secure { display: flex; align-items: center; gap: 6px; color: #6a7487; font-size: 12px; font-weight: 650; } .page-heading { position: relative; padding-top: 64px; padding-bottom: 37px; text-align: center; } .back-link { position: absolute; top: 28px; left: 0; color: #687287; text-decoration: none; font-size: 13px; font-weight: 650; } h1 { margin: 14px 0 0; color: #172033; font-size: clamp(38px, 4.6vw, 55px); line-height: 1.06; letter-spacing: -.048em; } .page-heading > p:last-child { max-width: 620px; margin: 18px auto 0; color: #6b7588; font-size: 16px; } @media (max-width: 680px) { .page-heading { padding-top: 72px; } .back-link { left: 12px; } h1 { font-size: 38px; } }
      `}</style>
    </main>
  );
}
