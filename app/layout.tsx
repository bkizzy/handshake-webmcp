import type { Metadata } from "next";
import type { Viewport } from "next";

import "./globals.css";
import { GlobalShortcut } from "@/src/components/global-shortcut";

export const metadata: Metadata = {
  title: { default: "Handshake AI — eSignature for the agentic era", template: "%s — Handshake AI" },
  description: "Prepare, negotiate, approve, and sign agreements in one workspace built for people and AI agents.",
  icons: { icon: "/favicon.png", apple: "/icon-180.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><GlobalShortcut />{children}</body>
    </html>
  );
}
