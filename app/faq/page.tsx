import Link from "next/link";

import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";
import { faqSections } from "@/src/content/faq-copy";

export const metadata = { title: "Frequently asked questions" };

export default function FaqPage() {
  return (
    <main className="faq-page">
      <SiteHeader />
      <section className="faq app-shell">
        <Link href="/" className="back-link">← Home</Link>
        <p className="eyebrow">Frequently asked questions</p>
        <h1>For people and their agents.</h1>
        <p className="intro">How Mutual Assent AI handles access, negotiation, attribution, signing, and the cases where an agent cannot use the site directly.</p>
        <div className="faq-sections">
          {faqSections.map((section) => <section key={section.title}><h2>{section.title}</h2><div>{section.items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}{"linkUrl" in item && <> <a href={item.linkUrl} target="_blank" rel="noreferrer">{item.linkLabel}</a>.</>}</p></details>)}</div></section>)}
        </div>
      </section>
      <SiteFooter note="Still have a question? Contact us." />
      <style>{`
        .faq-page{min-height:100vh;background:var(--canvas)}.faq{max-width:900px;padding-top:68px;padding-bottom:96px}
        .back-link{display:inline-flex;margin-bottom:42px;color:#59657a;text-decoration:none;font-size:15px;font-weight:700}
        h1{margin:13px 0 0;color:var(--ink);font-size:clamp(42px,6vw,62px);line-height:1.03;letter-spacing:-.045em}
        .intro{max-width:760px;margin:18px 0 0;color:#536077;font-size:19px;line-height:1.65}.faq-sections{margin-top:58px;display:grid;gap:48px}
        .faq-sections h2{margin:0 0 16px;color:var(--ink);font-size:25px;letter-spacing:-.025em}.faq-sections section>div{display:grid;gap:10px}
        details{border:1px solid var(--line);border-radius:11px;background:#fff;box-shadow:var(--shadow-sm)}summary{padding:19px 52px 19px 20px;position:relative;cursor:pointer;color:#263147;font-size:17px;font-weight:750;list-style:none}summary::-webkit-details-marker{display:none}summary::after{content:"+";position:absolute;right:20px;color:var(--blue);font-size:23px;font-weight:500;line-height:1}details[open] summary::after{content:"−"}details p{margin:0;padding:0 20px 20px;color:#5d687b;font-size:16px;line-height:1.65}details p a{color:var(--blue);font-weight:700}
        @media(max-width:640px){.faq{padding-top:42px}.faq-sections{margin-top:42px;gap:36px}summary{font-size:16px}.intro{font-size:17px}}
      `}</style>
    </main>
  );
}
