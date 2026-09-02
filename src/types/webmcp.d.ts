type WebMcpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: unknown, client?: { signal?: AbortSignal }) => Promise<WebMcpToolResult> | WebMcpToolResult;
};

interface Document {
  modelContext?: {
    registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>;
  };
}
