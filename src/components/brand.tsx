"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Handshake home">
      <Image className="brand-mark" src="/handshake-mark.png" width={36} height={36} alt="" priority />
      {!compact && <span>Handshake</span>}
      <style jsx>{`
        :global(.brand-mark) { width: 36px; height: 36px; object-fit: contain; }
      `}</style>
    </Link>
  );
}
