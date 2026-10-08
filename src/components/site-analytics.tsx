"use client";

import { Analytics } from "@vercel/analytics/next";

export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname
      .replace(/^\/deal\/[^/]+/, "/deal/[id]")
      .replace(/^\/handoff\/[^/]+/, "/handoff/[id]");
    return { ...event, url: url.toString() };
  }} />;
}
