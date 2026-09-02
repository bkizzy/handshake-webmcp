"use client";

import { CreditCard, FileCheck2, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Brand } from "./brand";

export function SiteHeader() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setEmail(typeof data.email === "string" ? data.email : ""))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <header className="site-header">
      <div className="app-shell header-inner">
        <Brand />
        <nav aria-label="Primary navigation">
          {email ? <Link href="/dashboard">In progress</Link> : <Link href="/#how-it-works">How it works</Link>}
          <Link href="/webmcp">WebMCP status</Link>
          {!email && <Link href="/login">Sign in</Link>}
          <Link href="/new" className="button-primary">Start an agreement</Link>
          {email && <details className="user-menu"><summary aria-label="Open user menu"><span>{email.slice(0, 1).toUpperCase()}</span><div><b>Account</b><small>{email}</small></div></summary><div className="menu-popover"><Link href="/agreements/executed"><FileCheck2 size={15} /> Executed agreements</Link><Link href="/billing"><CreditCard size={15} /> Billing</Link><form action="/api/auth/logout" method="post"><button><LogOut size={15} /> Log out</button></form></div></details>}
        </nav>
      </div>
      <style jsx>{`
        .site-header{height:72px;display:flex;align-items:center;border-bottom:1px solid rgba(223,228,236,.75);background:rgba(255,255,255,.92);backdrop-filter:blur(14px);position:sticky;top:0;z-index:20}.header-inner{display:flex;align-items:center;justify-content:space-between}nav{display:flex;align-items:center;gap:23px}nav :global(a:not(.button-primary)){color:#4b566b;text-decoration:none;font-size:14px;font-weight:600}nav :global(a:not(.button-primary):hover){color:var(--ink)}.user-menu{position:relative}.user-menu summary{list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer}.user-menu summary::-webkit-details-marker{display:none}.user-menu summary>span{width:31px;height:31px;display:grid;place-items:center;color:#fff;background:#53627d;border-radius:50%;font-size:11px;font-weight:750}.user-menu summary div{max-width:125px;display:grid;line-height:1.2}.user-menu summary b{color:#394459;font-size:10px}.user-menu summary small{overflow:hidden;color:#7d8798;font-size:8px;text-overflow:ellipsis}.menu-popover{width:220px;position:absolute;right:0;top:43px;padding:7px;display:grid;border:1px solid #dbe1e9;border-radius:10px;background:#fff;box-shadow:var(--shadow-md)}.menu-popover :global(a),.menu-popover button{min-height:38px;padding:8px 9px;display:flex;align-items:center;gap:8px;border:0;border-radius:6px;color:#4d596e;background:transparent;text-decoration:none;font-size:11px;font-weight:650;cursor:pointer}.menu-popover :global(a:hover),.menu-popover button:hover{background:#f4f6f9;color:var(--ink)}.menu-popover form{border-top:1px solid #edf0f4;margin-top:4px;padding-top:4px}.menu-popover button{width:100%}@media(max-width:760px){nav :global(a:not(.button-primary)){display:none}nav{gap:9px}nav :global(.button-primary){padding:9px 11px;font-size:12px}.user-menu summary div{display:none}}
      `}</style>
    </header>
  );
}
