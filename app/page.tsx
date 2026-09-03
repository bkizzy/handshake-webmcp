"use client";

import { ArrowRight, Bot, Check, FilePenLine, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";

import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { DocumentIllustration } from "@/src/components/document-illustration";
import { SiteHeader } from "@/src/components/site-header";
import { homeCopy } from "@/src/content/site-copy";
import "./home.css";

const stepIcons = [FilePenLine, Bot, UserCheck];
const trustIcons = [ShieldCheck, FilePenLine, Bot];

export default function HomePage() {
  return <main className="home-page"><CreateAgreementTool /><SiteHeader /><section className="hero app-shell"><div className="hero-copy"><div className="agent-badge"><Bot size={15} /> {homeCopy.badge}</div><h1>{homeCopy.headline}<br /><span>{homeCopy.headlineAccent}</span></h1><p className="hero-subhead">{homeCopy.subhead}</p><div className="hero-actions"><Link className="button-primary" href="/new">{homeCopy.primaryAction} <ArrowRight size={17} /></Link><Link className="button-secondary" href="#how-it-works">{homeCopy.secondaryAction}</Link></div><p className="hero-proof"><Check size={15} /> {homeCopy.proof}</p></div><DocumentIllustration /></section><section className="trust-strip"><div className="app-shell">{homeCopy.trust.map((label, index) => { const Icon = trustIcons[index]; return <span key={label}><Icon size={17} /> {label}</span>; })}</div></section><section className="how app-shell" id="how-it-works"><p className="eyebrow">{homeCopy.howEyebrow}</p><h2>{homeCopy.howHeadline}<br />{homeCopy.howHeadlineAccent}</h2><p className="section-intro">{homeCopy.howIntro}</p><div className="steps">{homeCopy.steps.map((step, index) => { const Icon = stepIcons[index]; return <article key={step.title}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div className="step-icon"><Icon size={21} /></div><h3>{step.title}</h3><p>{step.body}</p></article>; })}</div></section><section className="closing"><div className="app-shell closing-inner"><div><p className="eyebrow">{homeCopy.closingEyebrow}</p><h2>{homeCopy.closingHeadline}</h2></div><Link className="button-primary" href="/new">{homeCopy.closingAction} <ArrowRight size={17} /></Link></div></section><footer className="app-shell"><span>© 2026 Handshake AI</span><span>{homeCopy.footer}</span></footer></main>;
}
