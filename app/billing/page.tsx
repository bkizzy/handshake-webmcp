import { CreditCard } from "lucide-react";

import { SiteHeader } from "@/src/components/site-header";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return <main className="billing-page"><SiteHeader /><section className="billing-card app-shell"><span><CreditCard size={24} /></span><p className="eyebrow">Billing</p><h1>Simple plans are coming soon.</h1><p>Handshake is free while we prepare account billing. Nothing is required from you today.</p><a className="button-secondary" href="/dashboard">Back to agreements</a></section><style>{`.billing-page{min-height:100vh;background:var(--canvas)}.billing-card{max-width:620px;margin-top:80px;padding:55px;border:1px solid #dbe1e9;border-radius:14px;background:#fff;text-align:center;box-shadow:var(--shadow-sm)}.billing-card>span{width:50px;height:50px;margin:0 auto 20px;display:grid;place-items:center;color:var(--blue);background:var(--blue-soft);border-radius:13px}.billing-card h1{margin:12px 0 0;color:#2d394e;font-size:32px;letter-spacing:-.04em}.billing-card>p:last-of-type{margin:11px auto 25px;color:#657084;font-size:15px;line-height:1.55}.billing-card .button-secondary{display:inline-flex}`}</style></main>;
}
