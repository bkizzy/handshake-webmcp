import { LegalPage } from "@/src/components/legal-page";
import { legalEffectiveDate, privacySections } from "@/src/content/legal-copy";

export const metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy Notice" intro="This notice describes the information handled by Mutual Assent AI and the choices available while the service is in beta." effectiveDate={legalEffectiveDate} sections={privacySections} />;
}
