"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Handshake AI home">
      <Image className="brand-mark" src="/handshake-mark-cobalt-outline-cluster.png" width={104} height={104} alt="" priority />
      {!compact && <span className="brand-wordmark" aria-label="Handshake AI"><span>handshake</span><span>AI</span></span>}
      <style jsx>{`
        :global(.brand-mark) { width: 104px; height: 104px; object-fit: contain; }
        @font-face { font-family: HandshakeGeist; src: url('/fonts/handshake-geist.woff2') format('woff2'); font-style: normal; font-weight: 100 900; font-display: swap; }
        :global(.brand-wordmark) { display: inline-flex; align-items: baseline; gap: 6px; font-family: HandshakeGeist, ui-sans-serif, sans-serif; font-size: 28px; font-weight: 560; letter-spacing: -.055em; line-height: 1; text-transform: lowercase; }
        :global(.brand-wordmark span:last-child) { color: var(--blue); font-size: .88em; font-weight: 700; letter-spacing: -.07em; text-transform: uppercase; }
        @media (max-width: 390px) { :global(.brand-mark) { width: 72px; height: 72px; } :global(.brand-wordmark) { font-size: 22px; gap: 4px; } }
      `}</style>
    </Link>
  );
}
