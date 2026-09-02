"use client";

import { ArrowRight, Bot, Check, FilePenLine, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";

import { DocumentIllustration } from "@/src/components/document-illustration";
import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { SiteHeader } from "@/src/components/site-header";

export default function HomePage() {
  return (
    <main>
      <CreateAgreementTool />
      <SiteHeader />
      <section className="hero app-shell">
        <div className="hero-copy">
          <div className="agent-badge"><Bot size={15} /> Built for people and their agents</div>
          <h1>Your agents negotiate.<br /><span>You decide.</span></h1>
          <p className="hero-subhead">
            Create, redline, and sign real agreements in one shared workspace. Let agents handle the
            repetitive details while every decision stays visible—and every signature stays human.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href="/new">Start an agreement <ArrowRight size={17} /></Link>
            <Link className="button-secondary" href="#how-it-works">See how it works</Link>
          </div>
          <p className="hero-proof"><Check size={15} /> No account needed to review or sign</p>
        </div>
        <DocumentIllustration />
      </section>

      <section className="trust-strip">
        <div className="app-shell">
          <span><ShieldCheck size={17} /> Human-approved signatures</span>
          <span><FilePenLine size={17} /> Transparent redline history</span>
          <span><Bot size={17} /> Agent-accessible workflows</span>
        </div>
      </section>

      <section className="how app-shell" id="how-it-works">
        <p className="eyebrow">How it works</p>
        <h2>Two parties. Two agents.<br />One agreement.</h2>
        <p className="section-intro">Use Handshake yourself, hand work to an agent, or move between both. The document never leaves the shared workspace.</p>
        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <div className="step-icon"><FilePenLine size={21} /></div>
            <h3>Create and invite</h3>
            <p>Start from a practical NDA, fill in the parties and purpose, then invite the other side with a secure link.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <div className="step-icon"><Bot size={21} /></div>
            <h3>Review and redline</h3>
            <p>People or their agents can propose, accept, reject, or counter changes—with every action attributed and recorded.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <div className="step-icon"><UserCheck size={21} /></div>
            <h3>Approve and sign</h3>
            <p>Both parties approve the final version. The humans review once more and add their own signatures.</p>
          </article>
        </div>
      </section>

      <section className="closing">
        <div className="app-shell closing-inner">
          <div><p className="eyebrow">Agent-negotiated. Human-approved.</p><h2>Move the agreement forward.</h2></div>
          <Link className="button-primary" href="/new">Create an NDA <ArrowRight size={17} /></Link>
        </div>
      </section>

      <footer className="app-shell"><span>© 2026 Handshake</span><span>Agreements for people and agents.</span></footer>

      <style jsx>{`
        .hero { min-height: 670px; display: grid; grid-template-columns: .94fr 1.06fr; gap: 62px; align-items: center; padding-top: 54px; padding-bottom: 52px; }
        .hero-copy { padding-bottom: 18px; }
        .agent-badge { width: fit-content; display: flex; align-items: center; gap: 7px; margin-bottom: 24px; padding: 7px 10px; color: var(--blue); background: var(--blue-soft); border: 1px solid #dce6ff; border-radius: 999px; font-size: 12px; font-weight: 700; }
        h1 { margin: 0; color: #172033; font-size: clamp(47px, 5.2vw, 70px); line-height: 1.01; letter-spacing: -0.055em; font-weight: 730; }
        h1 span { color: var(--blue); }
        .hero-subhead { max-width: 590px; margin: 25px 0 0; color: #5e697e; font-size: 18px; line-height: 1.65; }
        .hero-actions { display: flex; gap: 11px; margin-top: 31px; }
        .hero-actions :global(.button-primary), .hero-actions :global(.button-secondary) { min-height: 49px; padding-left: 20px; padding-right: 20px; }
        .hero-proof { margin: 18px 0 0; display: flex; align-items: center; gap: 6px; color: #737e91; font-size: 12px; font-weight: 600; }
        .hero-proof :global(svg) { color: var(--green); }
        .trust-strip { border-top: 1px solid var(--soft-line); border-bottom: 1px solid var(--soft-line); background: #fbfcfe; }
        .trust-strip .app-shell { min-height: 76px; display: flex; align-items: center; justify-content: center; gap: 72px; color: #59657a; font-size: 13px; font-weight: 650; }
        .trust-strip span { display: flex; align-items: center; gap: 8px; }
        .trust-strip :global(svg) { color: var(--blue); }
        .how { padding-top: 112px; padding-bottom: 120px; text-align: center; }
        h2 { margin: 14px 0 0; color: #182137; font-size: clamp(37px, 4.1vw, 54px); line-height: 1.08; letter-spacing: -0.045em; }
        .section-intro { max-width: 640px; margin: 20px auto 0; color: #687287; font-size: 17px; line-height: 1.65; }
        .steps { margin-top: 58px; display: grid; grid-template-columns: repeat(3, 1fr); text-align: left; border: 1px solid var(--line); border-radius: 14px; background: white; overflow: hidden; box-shadow: var(--shadow-sm); }
        .steps article { min-height: 278px; position: relative; padding: 33px 31px; border-right: 1px solid var(--line); }
        .steps article:last-child { border-right: 0; }
        .step-number { position: absolute; top: 29px; right: 28px; color: #bcc3ce; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
        .step-icon { width: 43px; height: 43px; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 10px; }
        .steps h3 { margin: 35px 0 10px; color: #263147; font-size: 18px; letter-spacing: -.02em; }
        .steps p { margin: 0; color: #707a8d; line-height: 1.65; }
        .closing { padding: 74px 0; background: #16203a; color: white; }
        .closing-inner { display: flex; align-items: center; justify-content: space-between; gap: 32px; }
        .closing h2 { margin-top: 10px; color: white; font-size: clamp(34px, 4vw, 48px); }
        .closing .eyebrow { color: #9bb6ff; }
        .closing :global(.button-primary) { flex: 0 0 auto; background: white; color: #1d49bb; }
        .closing :global(.button-primary:hover) { background: #eef3ff; }
        footer { min-height: 90px; display: flex; align-items: center; justify-content: space-between; color: #7a8495; font-size: 12px; }
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; gap: 16px; padding-top: 70px; text-align: center; }
          .hero-copy { display: grid; justify-items: center; }
          .hero-subhead { max-width: 680px; }
          .trust-strip .app-shell { gap: 25px; justify-content: space-between; }
          .steps { grid-template-columns: 1fr; }
          .steps article { min-height: 230px; border-right: 0; border-bottom: 1px solid var(--line); }
          .steps article:last-child { border-bottom: 0; }
        }
        @media (max-width: 680px) {
          .hero { padding-top: 50px; min-height: auto; }
          h1 { font-size: 46px; }
          .hero-subhead { font-size: 16px; }
          .hero-actions { width: 100%; flex-direction: column; }
          .hero-actions :global(a) { width: 100%; }
          .trust-strip .app-shell { padding: 20px 0; flex-direction: column; align-items: flex-start; gap: 12px; }
          .how { padding-top: 80px; padding-bottom: 80px; }
          .closing-inner { align-items: flex-start; flex-direction: column; }
          footer { align-items: flex-start; justify-content: center; flex-direction: column; gap: 3px; }
        }
      `}</style>
    </main>
  );
}
