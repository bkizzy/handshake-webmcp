import { LegalPage } from "@/src/components/legal-page";
import { legalEffectiveDate, termsSections } from "@/src/content/legal-copy";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return <LegalPage title="Terms of Use" intro="These Terms govern access to and use of the Mutual Assent AI free beta, including use through people, browsers, and AI agents." effectiveDate={legalEffectiveDate} sections={termsSections} />;
}
