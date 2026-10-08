"use client";

import { ArrowRight, Bot, Check, FilePenLine, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";

import { CreateAgreementTool } from "@/src/components/create-agreement-tool";
import { AgentNdaPrompt } from "@/src/components/agent-nda-prompt";
import { DocumentIllustration } from "@/src/components/document-illustration";
import { SiteHeader } from "@/src/components/site-header";
import { SiteFooter } from "@/src/components/site-footer";
import { homeCopy } from "@/src/content/site-copy";
import { faqSections } from "@/src/content/faq-copy";
import "./home.css";

const stepIcons = [FilePenLine, Bot, UserCheck];
const trustIcons = [ShieldCheck, FilePenLine, Bot];

export default function HomePage() {
  return <main className="home-page"><CreateAgreementTool /><SiteHeader /><section className="hero app-shell"><div className="hero-copy"><div className="agent-badge"><Bot size={15} /> {homeCopy.badge}</div><h1>{homeCopy.headline}<br /><span>{homeCopy.headlineAccent}</span></h1><p className="hero-subhead">{homeCopy.subhead}</p><div className="hero-actions"><Link className="button-primary" href="/new" aria-label="Start an agreement with Mutual Assent AI" data-primary-action="start-agreement">{homeCopy.primaryAction} <ArrowRight size={17} /></Link></div><p className="hero-proof"><Check size={15} /> {homeCopy.proof}</p></div><DocumentIllustration /></section><div className="app-shell"><AgentNdaPrompt prompt={homeCopy.agentPrompt} /></div><section className="trust-strip"><div className="app-shell">{homeCopy.trust.map((label, index) => { const Icon = trustIcons[index]; return <span key={label}><Icon size={17} /> {label}</span>; })}</div></section><section className="how app-shell" id="how-it-works"><p className="eyebrow">{homeCopy.howEyebrow}</p><h2>{homeCopy.howHeadline}<br />{homeCopy.howHeadlineAccent}</h2><p className="section-intro">{homeCopy.howIntro}</p><div className="steps">{homeCopy.steps.map((step, index) => { const Icon = stepIcons[index]; return <article key={step.title}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div className="step-icon"><Icon size={21} /></div><h3>{step.title}</h3><p>{step.body}</p></article>; })}</div></section><section className="home-faq app-shell" id="faq"><p className="eyebrow">Frequently asked questions</p><h2>For people and their agents.</h2><p className="section-intro">How Mutual Assent AI handles access, negotiation, attribution, signing, and the cases where an agent cannot use the site directly.</p><div className="home-faq-sections">{faqSections.map((section) => <section key={section.title}><h3>{section.title}</h3><div className="home-faq-list">{section.items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>)}</div><div className="home-faq-actions"><Link className="button-secondary" href="/contact">Still have a question? Contact us</Link></div></section><section className="closing"><div className="app-shell closing-inner"><div><p className="eyebrow">{homeCopy.closingEyebrow}</p><h2>{homeCopy.closingHeadline}</h2></div><Link className="button-primary" href="/new" aria-label="Start an agreement with Mutual Assent AI" data-primary-action="start-agreement">{homeCopy.closingAction} <ArrowRight size={17} /></Link></div></section><SiteFooter note={homeCopy.footer} /></main>;
}
