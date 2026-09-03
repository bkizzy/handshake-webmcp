"use client";

import { useCallback, useEffect, useState } from "react";

function storageKey(id: string) {
  return `handshake:agreement-access:${id}`;
}

export function useAgreementAccess(id: string) {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const incoming = fragment.get("access") || url.searchParams.get("access");
    if (incoming) {
      window.sessionStorage.setItem(storageKey(id), incoming);
      url.searchParams.delete("access");
      fragment.delete("access");
      url.hash = fragment.toString();
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const storedToken = incoming || window.sessionStorage.getItem(storageKey(id)) || "";
    queueMicrotask(() => {
      setToken(storedToken);
      setReady(true);
    });
  }, [id]);

  const authHeaders = useCallback((headers: HeadersInit = {}) => {
    const next = new Headers(headers);
    if (token) next.set("authorization", `Bearer ${token}`);
    return next;
  }, [token]);

  return { ready, token, authHeaders };
}
