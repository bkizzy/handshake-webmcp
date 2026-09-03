import type { Metadata } from "next";

import { WebMcpVerifier } from "@/src/components/webmcp-verifier";

export const metadata: Metadata = {
  title: "WebMCP verification",
  description: "Verify that the current browser exposes and can invoke Handshake AI WebMCP site tools.",
};

export default function WebMcpPage() {
  return <WebMcpVerifier />;
}
