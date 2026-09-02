"use client";

import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Handshake home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-node brand-node-left" />
        <span className="brand-bridge" />
        <span className="brand-node brand-node-right" />
      </span>
      {!compact && <span>Handshake</span>}
      <style jsx>{`
        .brand-mark {
          width: 31px;
          height: 31px;
          position: relative;
          display: inline-block;
          border-radius: 9px;
          background: var(--blue-soft);
          border: 1px solid #d8e4ff;
        }
        .brand-node {
          width: 7px;
          height: 7px;
          position: absolute;
          top: 11px;
          z-index: 2;
          border: 2px solid var(--blue);
          border-radius: 50%;
          background: white;
        }
        .brand-node-left { left: 5px; }
        .brand-node-right { right: 5px; }
        .brand-bridge {
          width: 13px;
          height: 7px;
          position: absolute;
          top: 11px;
          left: 9px;
          border-bottom: 2px solid var(--blue);
          transform: rotate(-10deg);
        }
      `}</style>
    </Link>
  );
}
