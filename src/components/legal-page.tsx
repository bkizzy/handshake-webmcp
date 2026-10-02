import Link from "next/link";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type LegalSection = {
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
};

export function LegalPage({ title, intro, effectiveDate, sections }: {
  title: string;
  intro: string;
  effectiveDate: string;
  sections: readonly LegalSection[];
}) {
  return (
    <main className="legal-page">
      <SiteHeader />
      <article className="legal-document app-shell">
        <Link href="/" className="back-link">← Home</Link>
        <p className="eyebrow">Legal</p>
        <h1>{title}</h1>
        <p className="effective">Effective {effectiveDate}</p>
        <p className="legal-intro">{intro}</p>
        <aside className="beta-notice"><strong>Free beta software.</strong> Mutual Assent AI is experimental, provided as-is, and used at your own risk.</aside>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>
        ))}
      </article>
      <SiteFooter />
      <style>{`
        .legal-page{min-height:100vh;background:var(--canvas)}
        .legal-document{max-width:860px;padding-top:68px;padding-bottom:88px}
        .legal-document .back-link{display:inline-flex;margin-bottom:42px;color:#59657a;text-decoration:none;font-size:15px;font-weight:700}
        .legal-document h1{max-width:700px;margin:13px 0 0;color:var(--ink);font-size:clamp(40px,6vw,62px);line-height:1.03;letter-spacing:-.045em}
        .legal-document .effective{margin:14px 0 0;color:#6b7588;font-size:15px;font-weight:650}
        .legal-intro{max-width:760px;margin:24px 0 0;color:#485469;font-size:19px;line-height:1.7}
        .beta-notice{margin:32px 0 45px;padding:18px 20px;border:1px solid #edcf88;border-radius:10px;color:#62420a;background:var(--amber-soft);font-size:16px;line-height:1.55}
        .legal-document section{padding:31px 0;border-top:1px solid var(--line)}
        .legal-document section h2{margin:0 0 13px;color:#202a3d;font-size:23px;letter-spacing:-.025em}
        .legal-document section p,.legal-document section li{color:#4c586d;font-size:16px;line-height:1.72}
        .legal-document section p{margin:10px 0 0}
        .legal-document section ul{margin:14px 0 0;padding-left:24px}
        .legal-document section li+li{margin-top:8px}
      `}</style>
    </main>
  );
}
