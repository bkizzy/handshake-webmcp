import Link from "next/link";

export function SiteFooter({ note = "Electronic signature for the agentic era." }: { note?: string }) {
  return (
    <footer className="site-footer">
      <div className="app-shell footer-inner">
        <div><span>© 2026 Mutual Assent AI</span><span className="beta-footer">Free beta · Use at your own risk</span></div>
        <nav aria-label="Legal and support">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <span>{note}</span>
      </div>
      <style>{`
        .site-footer{border-top:1px solid var(--line);background:#fff;color:#707b8e;font-size:14px}
        .footer-inner{min-height:104px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px}
        .footer-inner>div{display:grid;gap:3px}.beta-footer{color:#9a620c;font-weight:700}
        .footer-inner>span:last-child{text-align:right}
        nav{display:flex;align-items:center;gap:20px}nav a{color:#536077;font-weight:700;text-decoration:none}nav a:hover{color:var(--blue)}
        @media(max-width:760px){.footer-inner{padding-top:25px;padding-bottom:25px;grid-template-columns:1fr;gap:16px}.footer-inner>span:last-child{text-align:left}nav{order:-1}}
      `}</style>
    </footer>
  );
}
