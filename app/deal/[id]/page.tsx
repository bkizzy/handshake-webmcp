import { DealWorkspace } from "@/src/components/deal-workspace";

type DealPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params;
  return <DealWorkspace id={id} />;
}
