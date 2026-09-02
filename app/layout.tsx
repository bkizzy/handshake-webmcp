import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Handshake — Agreements for people and agents", template: "%s — Handshake" },
  description: "Create, negotiate, and sign agreements—with your agent at the table.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
