"use client";

import { useCallback, useEffect, useState } from "react";

export function useAgreementAccess(id: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const incoming = fragment.get("access") ?? "";

    async function establishAccess() {
      try {
        if (incoming) {
          const response = await fetch(`/api/agreements/${id}/access-session`, {
            method: "POST",
            headers: { authorization: `Bearer ${incoming}` },
          });
          if (!response.ok) return;
          fragment.delete("access");
          url.hash = fragment.toString();
          window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } finally {
        if (active) setReady(true);
      }
    }

    void establishAccess();
    return () => { active = false; };
  }, [id]);

  const authHeaders = useCallback((headers: HeadersInit = {}) => {
    return new Headers(headers);
  }, []);

  return { ready, authHeaders };
}
