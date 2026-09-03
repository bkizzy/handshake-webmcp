"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Handshake AI home">
      <Image className="brand-mark" src="/handshake-mark.png" width={48} height={48} alt="" priority />
      {!compact && <span>Handshake AI</span>}
      <style jsx>{`
        :global(.brand-mark) { width: 48px; height: 48px; object-fit: contain; }
      `}</style>
    </Link>
  );
}
