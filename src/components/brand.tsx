"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Mutual Assent AI home">
      <Image className="brand-mark" src="/mutual-assent-mark-cobalt-v8.png" width={152} height={152} alt="" priority />
      {!compact && <span className="brand-wordmark" aria-label="Mutual Assent AI"><span className="brand-wordmark-top">mutual</span><span className="brand-wordmark-bottom"><span>assent</span><span>AI</span></span></span>}
      <style jsx>{`
        :global(.brand-mark) { width: 152px; height: 152px; margin-left: -37px; margin-right: -32px; object-fit: contain; }
        @font-face { font-family: HandshakeGeist; src: url('/fonts/handshake-geist.woff2') format('woff2'); font-style: normal; font-weight: 100 900; font-display: swap; }
        :global(.brand-wordmark) { width: 164px; display: grid; font-family: HandshakeGeist, ui-sans-serif, sans-serif; font-size: 32px; font-weight: 590; letter-spacing: -.055em; line-height: .82; text-transform: lowercase; }
        :global(.brand-wordmark-top) { justify-self: start; }
        :global(.brand-wordmark-bottom) { display: inline-flex; align-items:baseline; justify-self: end; gap: 4px; }
        :global(.brand-wordmark-bottom span:last-child) { color: var(--blue); font-size: .82em; font-weight: 750; letter-spacing: -.07em; text-transform: uppercase; }
        @media (max-width: 760px) { :global(.brand-mark) { width: 88px; height: 88px; margin-left: -22px; margin-right: -14px; } :global(.brand-wordmark) { width: 122px; font-size: 24px; } }
      `}</style>
    </Link>
  );
}
