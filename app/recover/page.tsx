import Link from "next/link";

import { Brand } from "@/src/components/brand";
import { RecoveryForm } from "@/src/components/recovery-form";

export const metadata = { title: "Recover agreement access" };

export default function RecoverPage() {
  return <main className="recovery-page"><header><Brand /></header><RecoveryForm /><Link className="recovery-home" href="/">← Back to Handshake</Link></main>;
}
