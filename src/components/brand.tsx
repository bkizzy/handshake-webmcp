"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Handshake AI home">
      <Image className="brand-mark" src="/handshake-mark-two-color.png" width={48} height={48} alt="" priority />
      {!compact && <span className="brand-wordmark" aria-label="Handshake AI"><span>handshake</span><span>AI</span></span>}
      <style jsx>{`
        :global(.brand-mark) { width: 48px; height: 48px; object-fit: contain; }
        @font-face { font-family: HandshakeGeist; src: url('/fonts/handshake-geist.woff2') format('woff2'); font-style: normal; font-weight: 100 900; font-display: swap; }
        :global(.brand-wordmark) { display: inline-flex; align-items: baseline; gap: 5px; font-family: HandshakeGeist, ui-sans-serif, sans-serif; font-size: 21px; font-weight: 560; letter-spacing: -.055em; line-height: 1; text-transform: lowercase; }
        :global(.brand-wordmark span:last-child) { color: var(--blue); font-size: .88em; font-weight: 700; letter-spacing: -.07em; text-transform: uppercase; }
        @media (max-width: 390px) { :global(.brand-wordmark) { font-size: 20px; gap: 4px; } }
      `}</style>
    </Link>
  );
}
