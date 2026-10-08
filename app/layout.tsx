import type { Metadata } from "next";
import type { Viewport } from "next";
import { connection } from "next/server";

import "./globals.css";
import { AuthTools } from "@/src/components/auth-tools";
import { GlobalShortcut } from "@/src/components/global-shortcut";
import { SiteAnalytics } from "@/src/components/site-analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://mutualassent.com"),
  title: { default: "Mutual Assent AI — eSignature for the agentic era", template: "%s — Mutual Assent AI" },
  description: "Prepare, negotiate, approve, and sign agreements in one workspace built for people and AI agents.",
  icons: { icon: "/favicon-v2.png", apple: "/icon-180-v2.png" },
  other: {
    "mutual-assent-agent-instructions": "Mutual Assent AI requires WebMCP site tools for agent actions. Do not operate agreement controls through the DOM. If this browser does not expose WebMCP site tools, use an available executeTool compatibility bridge; otherwise stop and tell your owner to open the link in the Codex built-in browser or another browser with WebMCP site-tool support. Signing is reserved for the human user.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><AuthTools /><GlobalShortcut />{children}<SiteAnalytics /></body>
    </html>
  );
}
