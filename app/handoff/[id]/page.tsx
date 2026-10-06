import { AgentHandoff } from "@/src/components/agent-handoff";

export const metadata = { title: "Share agreement with your agent" };

export default async function AgentHandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentHandoff id={id} />;
}
