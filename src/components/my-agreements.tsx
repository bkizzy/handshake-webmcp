"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgreementList } from "./agreement-list";
import type { StoredAgreement } from "@/src/lib/agreements/types";

export function MyAgreements({ agreements, initialTab = "in-progress" }: { agreements: StoredAgreement[]; initialTab?: "in-progress" | "executed" }) {
  const [tab, setTab] = useState<"in-progress" | "executed">(initialTab);
  const router = useRouter();
  const selectTab = (next: "in-progress" | "executed") => {
    setTab(next);
    router.push(next === "executed" ? "/dashboard?tab=executed" : "/dashboard", { scroll: false });
  };
  const visible = agreements.filter((agreement) => tab === "executed" ? agreement.status === "signed" : agreement.status !== "signed");
  return <>
    <div className="agreement-tabs" role="tablist" aria-label="Agreement status">
      <button id="tab-in-progress" role="tab" aria-controls="panel-in-progress" aria-selected={tab === "in-progress"} className={tab === "in-progress" ? "active" : ""} onClick={() => selectTab("in-progress")}>In progress <span>{agreements.filter((a) => a.status !== "signed").length}</span></button>
      <button id="tab-executed" role="tab" aria-controls="panel-executed" aria-selected={tab === "executed"} className={tab === "executed" ? "active" : ""} onClick={() => selectTab("executed")}>Executed <span>{agreements.filter((a) => a.status === "signed").length}</span></button>
    </div>
    <div id={tab === "executed" ? "panel-executed" : "panel-in-progress"} role="tabpanel" aria-labelledby={tab === "executed" ? "tab-executed" : "tab-in-progress"} tabIndex={0}><AgreementList agreements={visible} emptyTitle={tab === "executed" ? "No executed agreements yet" : "No agreements in progress"} emptyCopy={tab === "executed" ? "When both parties sign, the immutable final agreement will be stored here." : "Start an agreement yourself or ask your agent to prepare one and it will appear here automatically."} /></div>
    <style jsx>{`.agreement-tabs{display:flex;gap:8px;margin:0 0 20px;padding:4px;border:1px solid #dbe1e9;border-radius:10px;background:#f4f6f9;width:max-content}.agreement-tabs button{min-height:44px;padding:9px 18px;border:0;border-radius:7px;color:#667287;background:transparent;font-size:14px;font-weight:700;cursor:pointer}.agreement-tabs button.active{color:#243047;background:#fff;box-shadow:0 1px 4px rgba(30,45,70,.12)}.agreement-tabs span{margin-left:5px;color:#8791a1;font-size:12px}@media(max-width:500px){.agreement-tabs{width:100%}.agreement-tabs button{flex:1;padding-inline:10px}}`}</style>
  </>;
}
