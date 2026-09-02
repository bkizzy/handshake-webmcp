import { DealWorkspace } from "@/src/components/deal-workspace";
import { redirect } from "next/navigation";

type DealPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function DealPage({ params, searchParams }: DealPageProps) {
  const [{ id }, { token = "" }] = await Promise.all([params, searchParams]);
  if (token) redirect(`/access/${id}/${encodeURIComponent(token)}`);
  return <DealWorkspace id={id} />;
}
