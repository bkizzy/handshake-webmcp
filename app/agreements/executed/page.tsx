import { redirect } from "next/navigation";


export const dynamic = "force-dynamic";
export const metadata = { title: "Executed agreements" };

export default async function ExecutedAgreementsPage() {
  redirect("/dashboard?tab=executed");
}
