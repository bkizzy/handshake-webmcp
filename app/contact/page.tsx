import Link from "next/link";

import { ContactForm } from "@/src/components/contact-form";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="contact-page">
      <SiteHeader />
      <section className="contact app-shell">
        <Link href="/" className="back-link">← Home</Link>
        <p className="eyebrow">Contact</p>
        <h1>Get in touch.</h1>
        <p className="intro">Questions, beta feedback, security reports, and privacy requests are welcome.</p>
        <aside><strong>Free beta:</strong> please do not include passwords, signing codes, private agreement links, or unnecessary confidential information.</aside>
        <ContactForm />
      </section>
      <SiteFooter note="Questions and feedback help improve the beta." />
      <style>{`
        .contact-page{min-height:100vh;background:var(--canvas)}.contact{max-width:720px;padding-top:68px;padding-bottom:90px}
        .back-link{display:inline-flex;margin-bottom:42px;color:#59657a;text-decoration:none;font-size:15px;font-weight:700}
        h1{margin:13px 0 0;color:var(--ink);font-size:clamp(42px,6vw,62px);line-height:1.03;letter-spacing:-.045em}
        .intro{margin:18px 0 0;color:#536077;font-size:19px;line-height:1.65}
        aside{margin-top:28px;padding:16px 18px;border:1px solid #edcf88;border-radius:10px;color:#62420a;background:var(--amber-soft);font-size:15px;line-height:1.55}
      `}</style>
    </main>
  );
}
