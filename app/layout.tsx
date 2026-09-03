import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Handshake — eSignature for the agentic era", template: "%s — Handshake" },
  description: "Prepare, negotiate, approve, and sign agreements in one workspace built for people and AI agents.",
  icons: { icon: "/handshake-mark.png", apple: "/handshake-mark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
