"use client";

import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Mutual Assent AI home">
      <Image className="brand-mark" src="/mutual-assent-mark-cobalt-v8.png" width={152} height={152} alt="" priority />
      {!compact && <span className="brand-wordmark" aria-label="Mutual Assent AI"><span className="brand-wordmark-top">mutual</span><span className="brand-wordmark-bottom"><span>assent</span><span>AI</span></span></span>}
    </Link>
  );
}
