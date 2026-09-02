import Link from "next/link";

import { Brand } from "@/src/components/brand";
import { LoginForm } from "@/src/components/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const requested = (await searchParams).returnTo ?? "/dashboard";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  return (
    <main className="login-page">
      <header className="app-shell"><Brand /></header>
      <div className="login-shell">
        <LoginForm returnTo={returnTo} />
        <p className="legal">By continuing, you agree to use electronic records and signatures where permitted.</p>
      </div>
      <Link className="home-link" href="/">← Back to Handshake</Link>
      <style>{`
        .login-page { min-height: 100vh; position: relative; padding-bottom: 80px; background: #f5f7fa; }
        .login-page header { height: 76px; display: flex; align-items: center; }
        .login-shell { width: min(430px, calc(100% - 28px)); margin: 58px auto 0; }
        .login-shell .legal { max-width: 340px; margin: 18px auto 0; color: #8a93a2; font-size: 10px; line-height: 1.5; text-align: center; }
        .home-link { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); color: #697488; font-size: 11px; font-weight: 650; text-decoration: none; }
      `}</style>
    </main>
  );
}
