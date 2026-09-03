"use client";

import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Download,
  FileCheck2,
  FilePenLine,
  History,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  PenLine,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { agreementCopy, roleLabel } from "@/src/content/agreement-copy";
import {
  agreementFieldLabels,
  agreementSummaryFieldIds,
  knownInformationField,
  signatureConsentVersion,
  targetKey,
  visibleKnownInformationRoles,
} from "@/src/lib/agreements/contract";
import type {
  AgreementAction,
  AgreementFields,
  AgreementView,
  NegotiationCertificate,
  PartyRole,
  Redline,
  RedlineTarget,
} from "@/src/lib/agreements/types";

import { Brand } from "./brand";
import { useAgreementAccess } from "./use-agreement-access";
import { useAgreementTools } from "./use-agreement-tools";
import "./deal-workspace.css";

type ActionResult = {
  agreement: AgreementView;
  invitation?: { email: string; url?: string; delivered: boolean };
  replayed?: boolean;
};

type ProfileState = { signedIn: boolean; saved: boolean; canClaim: boolean; role: PartyRole; requiredEmail: string };
type PanelTab = "redlines" | "activity" | "versions" | "certificate";
type ProposedTarget = { target: RedlineTarget; label: string; currentValue: string };

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function targetLabel(agreement: AgreementView, target: RedlineTarget) {
  if (target.kind === "field") return agreementFieldLabels[target.id];
  return agreement.sections.find((section) => section.id === target.id)?.title ?? target.id;
}

function targetValue(agreement: AgreementView, target: RedlineTarget) {
  if (target.kind === "field") return agreement.fields[target.id];
  return agreement.sections.find((section) => section.id === target.id)?.body ?? "";
}

function lifecycleMeta(agreement: AgreementView) {
  if (agreement.status === "signed") return { label: "Executed", detail: "The final record and seal are locked" };
  if (agreement.status === "declined") return { label: "Declined", detail: agreement.termination?.reason ?? "Closed by the signer" };
  if (agreement.status === "voided") return { label: "Voided", detail: agreement.termination?.reason ?? "Closed by the author" };
  if (agreement.status === "ready") {
    return Object.keys(agreement.signatures).length
      ? { label: "Awaiting signature", detail: "One human signature remains" }
      : { label: "Ready to sign", detail: "Approved by both parties" };
  }
  if (agreement.status === "review") {
    if (agreement.redlines.some((redline) => redline.status === "open")) return { label: "Redlining", detail: "Both parties can propose changes" };
    if (agreement.readiness.author || agreement.readiness.signer) return { label: "Awaiting approval", detail: "One party approved this version" };
    return { label: "Awaiting review", detail: "The agreement is with both parties" };
  }
  return { label: "Draft", detail: "Only the author can edit directly" };
}

function progressRank(status: AgreementView["status"]) {
  if (status === "signed") return 3;
  if (status === "ready") return 2;
  if (status === "review") return 1;
  return 0;
}

export function DealWorkspace({ id }: { id: string }) {
  const [agreement, setAgreement] = useState<AgreementView | null>(null);
  const agreementRef = useRef<AgreementView | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitation, setInvitation] = useState<ActionResult["invitation"]>();
  const [tab, setTab] = useState<PanelTab>("redlines");
  const [proposedTarget, setProposedTarget] = useState<ProposedTarget | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionText, setSectionText] = useState("");
  const [draftFields, setDraftFields] = useState<AgreementFields | null>(null);
  const [signing, setSigning] = useState(false);
  const [correcting, setCorrecting] = useState<PartyRole | null>(null);
  const [ending, setEnding] = useState<"decline" | "void" | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [countering, setCountering] = useState<string | null>(null);
  const [counterText, setCounterText] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [freshRedlines, setFreshRedlines] = useState<string[]>([]);
  const [certificate, setCertificate] = useState<NegotiationCertificate | null>(null);
  const [sealValid, setSealValid] = useState<boolean | null>(null);
  const seenRedlines = useRef<Set<string>>(new Set());
  const acknowledgedInitialView = useRef(false);
  const { ready: accessReady, authHeaders } = useAgreementAccess(id);

  const acceptAgreement = useCallback((next: AgreementView) => {
    const newlySeen = next.redlines.filter((redline) => !seenRedlines.current.has(redline.id)).map((redline) => redline.id);
    if (seenRedlines.current.size && newlySeen.length) {
      setFreshRedlines(newlySeen);
      window.setTimeout(() => setFreshRedlines([]), 3200);
    }
    seenRedlines.current = new Set(next.redlines.map((redline) => redline.id));
    agreementRef.current = next;
    setAgreement(next);
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!accessReady) return;
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/agreements/${id}`, { cache: "no-store", headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Could not open this agreement.");
      acceptAgreement(data.agreement);
      setProfile(data.profile);
      setDraftFields((current) => current ?? data.agreement.fields);
      const url = new URL(window.location.href);
      if (url.searchParams.get("as") !== data.agreement.viewerRole) {
        url.searchParams.set("as", data.agreement.viewerRole);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      setError("");
    } catch (caught) {
      if (!quiet) setError(caught instanceof Error ? caught.message : "Could not open this agreement.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [acceptAgreement, accessReady, authHeaders, id]);

  useEffect(() => {
    if (!accessReady) return;
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 4000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [accessReady, load]);

  const acknowledgeCurrent = useCallback(() => {
    const current = agreementRef.current;
    if (!current) return;
    void fetch(`/api/agreements/${id}/acknowledge`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ throughSequence: current.eventSequence }),
    });
  }, [authHeaders, id]);

  useEffect(() => {
    if (!agreement || acknowledgedInitialView.current) return;
    acknowledgedInitialView.current = true;
    queueMicrotask(acknowledgeCurrent);
  }, [acknowledgeCurrent, agreement]);

  useEffect(() => {
    const onFocus = () => acknowledgeCurrent();
    const onVisibility = () => { if (document.visibilityState === "visible") acknowledgeCurrent(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [acknowledgeCurrent]);

  const performAction = useCallback(async (
    action: AgreementAction,
    source: "human" | "agent" = "human",
    idempotencyKey?: string,
  ) => {
    const current = agreementRef.current;
    if (!current) throw new Error("The agreement is not loaded.");
    setWorking(true);
    if (action.type === "update_document_fields" || action.type === "update_draft_section") setSaveState("saving");
    setError("");
    try {
      const endpoint = source === "agent" ? "agent-actions" : "actions";
      const response = await fetch(`/api/agreements/${id}/${endpoint}`, {
        method: "POST",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ action, idempotencyKey, expectedEventSequence: current.eventSequence }),
      });
      const data = await response.json() as ActionResult & { error?: { message: string; details?: { agreement?: AgreementView } } };
      if (!response.ok) {
        if (data.error?.details?.agreement) acceptAgreement(data.error.details.agreement);
        throw new Error(data.error?.message ?? "The action could not be completed.");
      }
      const applyResult = () => {
        acceptAgreement(data.agreement);
        setDraftFields(data.agreement.fields);
        if (data.invitation) setInvitation(data.invitation);
      };
      if (source === "agent") {
        agreementRef.current = data.agreement;
        window.setTimeout(applyResult, 75);
      } else {
        applyResult();
      }
      setSaveState("saved");
      return data;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The action could not be completed.";
      setError(message);
      throw caught;
    } finally {
      setWorking(false);
    }
  }, [acceptAgreement, authHeaders, id]);

  useEffect(() => {
    if (!agreement?.permissions.canEditDraft || !draftFields) return;
    if (JSON.stringify(draftFields) === JSON.stringify(agreement.fields)) return;
    const timeout = window.setTimeout(() => {
      void performAction({ type: "update_document_fields", fields: draftFields }).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [agreement, draftFields, performAction]);

  useEffect(() => {
    if (!agreement?.permissions.canEditDraft || !editingSection) return;
    const current = agreement.sections.find((section) => section.id === editingSection)?.body;
    if (!sectionText.trim() || current === sectionText) return;
    const timeout = window.setTimeout(() => {
      void performAction({ type: "update_draft_section", sectionId: editingSection, body: sectionText }).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [agreement, editingSection, performAction, sectionText]);

  const webMcpState = useAgreementTools({ id, agreement, performAction, authHeaders, onAgreement: acceptAgreement });
  const openRedlines = useMemo(() => agreement?.redlines.filter((redline) => redline.status === "open") ?? [], [agreement]);

  async function fetchCertificate() {
    const response = await fetch(`/api/agreements/${id}/verify`, { headers: authHeaders(), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Could not load the certificate.");
    setCertificate(data.certificate);
    setSealValid(Boolean(data.verification?.valid));
  }

  async function download(format: "pdf" | "markdown" | "certificate" | "print-contract" | "print-certificate") {
    const opensWindow = format === "pdf" || format.startsWith("print-");
    const printWindow = opensWindow ? window.open("about:blank", "_blank") : null;
    setWorking(true);
    try {
      const response = await fetch(`/api/agreements/${id}/download?format=${format}`, { headers: authHeaders() });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message ?? "Could not prepare the file.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (opensWindow) {
        if (printWindow) printWindow.location.assign(url);
        else throw new Error("Your browser blocked the print window. Allow pop-ups and try again.");
      }
      else {
        const link = document.createElement("a");
        link.href = url;
        link.download = response.headers.get("x-filename") ?? `${agreement?.title ?? "agreement"}.${format === "markdown" ? "md" : "json"}`;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      printWindow?.close();
      setError(caught instanceof Error ? caught.message : "Could not prepare the file.");
    } finally {
      setWorking(false);
    }
  }

  function suggest(target: RedlineTarget) {
    if (!agreement) return;
    setProposedTarget({ target, label: targetLabel(agreement, target), currentValue: targetValue(agreement, target) });
  }

  async function copyInvitation() {
    if (!invitation?.url) return;
    await navigator.clipboard.writeText(invitation.url);
    setNotice("Review link copied");
    window.setTimeout(() => setNotice(""), 2500);
  }

  function nextPending() {
    if (!openRedlines.length) return;
    const active = document.querySelector(".redline-target.is-current");
    active?.classList.remove("is-current");
    const index = active ? openRedlines.findIndex((item) => `redline-target-${item.id}` === active.id) : -1;
    const next = openRedlines[(index + 1) % openRedlines.length];
    const element = document.getElementById(`redline-target-${next.id}`);
    element?.classList.add("is-current");
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (loading || !accessReady) return <div className="loading-screen"><LoaderCircle className="spin" size={25} /> {agreementCopy.openingWorkspace}</div>;
  if (!agreement) return <div className="error-screen"><LockKeyhole size={27} /><h1>{agreementCopy.accessDeniedTitle}</h1><p>{error}</p><a href="/recover">Request a fresh secure link</a></div>;

  const meta = lifecycleMeta(agreement);
  const viewerParty = agreement[agreement.viewerRole];
  const rank = progressRank(agreement.status);
  const closed = agreement.status === "declined" || agreement.status === "voided";

  return (
    <main className="workspace">
      <header className="workspace-header">
        <Brand />
        <div className="document-identity"><span>{agreement.title}</span><small>Version {agreement.version} · {saveState === "saving" ? "Saving…" : "Saved"}</small></div>
        <div className="header-actions">
          <div className={`agent-state ${webMcpState.phase}`} title={webMcpState.lastInvocation ? `Last WebMCP invocation: ${webMcpState.lastInvocation.tool} at ${webMcpState.lastInvocation.at}` : "This reports browser registration, not a simulated connection."}><Bot size={15} /><span>{webMcpState.phase === "invoked" ? "Agent invocation detected" : webMcpState.phase === "registered" ? "Site tools registered" : webMcpState.phase === "registering" ? "Registering site tools" : webMcpState.phase === "error" ? "Site tool error" : "Site tools unavailable"}</span><i /></div>
          <DealAccountMenu agreement={agreement} profile={profile} />
        </div>
      </header>

      <div className="status-bar">
        <div className="status-copy"><span className={`status-icon ${agreement.status}`}>{agreement.status === "signed" ? <FileCheck2 size={17} /> : agreement.status === "ready" ? <CheckCircle2 size={17} /> : agreement.status === "review" ? <FilePenLine size={17} /> : <Clock3 size={17} />}</span><div><b>{meta.label}</b><small>{meta.detail}</small></div></div>
        <div className="progress" aria-label={`Agreement status: ${meta.label}`}>{(["Draft", "Review", "Approve", "Sign"] as const).map((label, index) => <div key={label} className={index <= rank ? "progress-step complete" : "progress-step"}><i>{index < rank ? <Check size={10} /> : index + 1}</i><span>{label}</span></div>)}</div>
        <div className="primary-action">
          {agreement.permissions.canInvite && <button className="button-primary" disabled={working} onClick={() => void performAction({ type: "invite" })}><Send size={16} /> Invite to review</button>}
          {agreement.permissions.canMarkReady && <button className="button-primary" disabled={working} onClick={() => void performAction({ type: "mark_ready" })}><CheckCircle2 size={16} /> Approve version</button>}
          {agreement.permissions.canSign && <button className="button-primary" onClick={() => setSigning(true)}><PenLine size={16} /> Review & sign</button>}
          {openRedlines.length > 0 && <button className="button-secondary" onClick={nextPending}>{openRedlines.length} pending · Next</button>}
          {agreement.status === "ready" && !agreement.permissions.canSign && <div className="waiting-state"><Clock3 size={15} /> Waiting for other signature</div>}
          {agreement.status === "signed" && <button className="button-secondary" onClick={() => void download("print-contract")}><Download size={15} /> Executed package</button>}
        </div>
      </div>

      <section className="agent-directive" data-agent-policy="webmcp-only" aria-label="Agent usage directive"><Bot size={16} /><div><b>Agent directive: use Handshake site tools only.</b><span>Do not operate agreement controls through the DOM. If WebMCP is unavailable or DOM interaction occurs, stop and report it to the owner. Clients without native support need an executeTool compatibility bridge.</span></div></section>

      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}
      {profile?.canClaim && <div className="claim-banner"><ShieldCheck size={18} /><div><b>Keep this agreement in your Handshake profile</b><span>Continue with {profile.requiredEmail} to save this {roleLabel(profile.role).toLowerCase()} copy and recover it from any device.</span></div><a className="button-secondary" href={`/login?returnTo=${encodeURIComponent(`/deal/${agreement.id}?as=${agreement.viewerRole}`)}`}>Save to profile</a></div>}
      {invitation && agreement.status === "review" && <div className="invite-banner"><Mail size={18} /><div><b>{invitation.delivered ? "Invitation sent" : "Invitation could not be delivered"} to {invitation.email}</b><span>{invitation.delivered ? "The secure email link opens the signer workspace." : "Check the address or resend after email is available."}</span></div>{invitation.url && <button className="button-secondary" onClick={() => void copyInvitation()}><Copy size={15} /> Copy link</button>}</div>}
      {!invitation && agreement.permissions.canResendInvitation && <div className="link-recovery"><span>Signer lost access?</span><button disabled={working} onClick={() => void performAction({ type: "resend_invitation" })}>Revoke old links and send a new one</button></div>}
      {notice && <div className="toast"><Check size={15} /> {notice}</div>}

      <div className="workspace-grid">
        <section className="document-column">
          {agreement.status === "signed" && <div className="executed-tabs"><button className={tab !== "certificate" ? "active" : ""} onClick={() => setTab("redlines")}>Executed Agreement</button><button className={tab === "certificate" ? "active" : ""} onClick={() => { setTab("certificate"); if (!certificate) void fetchCertificate().catch((caught) => setError(caught.message)); }}>Certificate of Negotiation</button></div>}
          <div className="document-toolbar"><div><FilePenLine size={16} /><span>Agreement preview</span></div><div><span>{agreement.template.name}</span><span>·</span><span>v{agreement.version}</span><button className="view-pdf" disabled={working} onClick={() => void download("pdf")}><Download size={13} /> View PDF</button>{agreement.permissions.canCorrectParticipants && <button onClick={() => setCorrecting("signer")}>Correct participants</button>}</div></div>

          {tab === "certificate" && agreement.status === "signed" ? (
            <CertificateView certificate={certificate} agreement={agreement} sealValid={sealValid} onVerify={fetchCertificate} onDownload={download} working={working} />
          ) : (
            <article className="document-paper">
              <div className="document-heading"><p>{agreement.template.name}</p><h1>{agreement.title}</h1><span>Effective {formatDate(agreement.fields.effectiveDate)}</span></div>
              {agreement.permissions.canEditDraft && draftFields ? (
                <div className="document-details editable-details">{agreementSummaryFieldIds.map((key) => <label className={`field-label ${key === "purpose" ? "wide" : ""}`} key={key}>{agreementFieldLabels[key]}{key === "purpose" ? <textarea className="field-textarea compact" value={draftFields[key]} onChange={(event) => setDraftFields({ ...draftFields, [key]: event.target.value })} /> : <input className="field-input" type={key === "effectiveDate" ? "date" : "text"} value={draftFields[key]} onChange={(event) => setDraftFields({ ...draftFields, [key]: event.target.value })} />}</label>)}<div className="autosave-note"><Check size={12} /> {saveState === "saving" ? "Saving changes…" : "Changes saved automatically"}</div></div>
              ) : (
                <dl className="document-details">{agreementSummaryFieldIds.map((key) => <TermDisplay key={key} agreement={agreement} target={{ kind: "field", id: key }} label={agreementFieldLabels[key]} value={agreement.fields[key] || "None listed"} openRedlines={openRedlines} freshRedlines={freshRedlines} onSuggest={suggest} />)}</dl>
              )}

              <div className="legal-preamble"><p>This {agreement.kind === "mutual" ? "Mutual " : ""}Non-Disclosure Agreement is entered into as of <b>{formatDate(agreement.fields.effectiveDate)}</b> by and between:</p><div className="parties">{(["author", "signer"] as PartyRole[]).map((role) => <div key={role}><p>{agreement.kind === "mutual" ? role === "author" ? "First Party" : "Second Party" : role === "author" ? "Disclosing Party" : "Receiving Party"}</p><b>{agreement[role].legalName}</b><span>{agreement[role].address}</span><small>Attention: {agreement[role].signatoryName}, {agreement[role].signatoryTitle} · {agreement[role].email}</small>{agreement.permissions.canCorrectParticipants && (agreement.viewerRole === "author" || agreement.viewerRole === role) && <button onClick={() => setCorrecting(role)}>Correct details</button>}</div>)}</div><p>{agreement.kind === "mutual" ? "Each may be a Disclosing Party or Receiving Party depending on the circumstances; together, they are the Parties." : "Together, they are the Parties."}</p></div>

              <div className="sections">{agreement.sections.map((section) => {
                const related = openRedlines.filter((redline) => redline.target.kind === "section" && redline.target.id === section.id);
                const acceptedChanged = agreement.reviewBaseline.sections.find((item) => item.id === section.id)?.body !== section.body;
                const isEditing = editingSection === section.id;
                return <section className={`agreement-section ${related.length ? `has-redline ${related[0].proposedBy}` : ""} ${acceptedChanged ? "accepted-change" : ""}`} key={section.id} id={related[0] ? `redline-target-${related[0].id}` : undefined}>
                  <div className="section-heading"><h2>{section.title}{acceptedChanged && <span className="changed-chip">Changed</span>}</h2>{agreement.permissions.canEditDraft && !isEditing && <button onClick={() => { setEditingSection(section.id); setSectionText(section.body); }}><PenLine size={12} /> Edit</button>}{agreement.permissions.canRedline && !related.length && <button onClick={() => suggest({ kind: "section", id: section.id })}><PenLine size={12} /> Suggest edit</button>}</div>
                  {isEditing ? <div className="section-editor"><textarea className="field-textarea" value={sectionText} onChange={(event) => setSectionText(event.target.value)} /><div><span className="autosave-inline">{saveState === "saving" ? "Saving…" : "Saved automatically"}</span><button className="button-primary" disabled={working} onClick={() => setEditingSection(null)}>Done</button></div></div> : related.length ? <RedlineMarkup redline={related[0]} fresh={freshRedlines.includes(related[0].id)} onOpen={() => setTab("redlines")} /> : <p>{section.body}</p>}
                </section>;
              })}</div>

              <div className="signature-block">{(["author", "signer"] as PartyRole[]).map((role) => { const signature = agreement.signatures[role]; const party = agreement[role]; return <div key={role}><p>{roleLabel(role)}</p><div className={signature ? "signature-line signed" : "signature-line"}>{signature ? signature.typedName : party.signatoryName}</div><b>{party.signatoryName}</b><span>{party.signatoryTitle}, {party.legalName}</span>{signature && <small>Signed {formatDate(signature.signedAt)} · Email verified · Version {signature.documentVersion}</small>}</div>; })}</div>
              <div className="appendices">{visibleKnownInformationRoles(agreement).map((role, index) => { const field = knownInformationField(role); const canEditAppendix = agreement.permissions.canEditDraft && agreement.kind === "mutual" && role === "author"; return <section className="agreement-appendix" key={role}><p className="appendix-label">Appendix {String.fromCharCode(65 + index)}</p><h2>Previously Known Information of {agreement[role].legalName}</h2><p className="appendix-help">Information this party knew lawfully and without restriction before disclosure under this agreement.</p>{canEditAppendix && draftFields ? <label className="field-label">Appendix entries<textarea className="field-textarea" value={draftFields[field]} onChange={(event) => setDraftFields({ ...draftFields, [field]: event.target.value })} /></label> : <dl><TermDisplay agreement={agreement} target={{ kind: "field", id: field }} label="Disclosed information" value={agreement.fields[field] || "None disclosed."} openRedlines={openRedlines} freshRedlines={freshRedlines} onSuggest={suggest} canSuggest={agreement.permissions.canRedline && agreement.viewerRole === role} /></dl>}</section>; })}</div>
              {agreement.status === "signed" && <div className="execution-seal"><ShieldCheck size={18} /><div><b>SHA-256 execution seal</b><code>{agreement.execution?.sealHash ?? agreement.execution?.sha256}</code></div><button onClick={() => void navigator.clipboard.writeText(agreement.execution?.sealHash ?? agreement.execution?.sha256 ?? "")}>Copy</button></div>}
            </article>
          )}
          {agreement.status === "signed" && <div className="download-row"><button onClick={() => void download("markdown")} disabled={working}><Download size={14} /> Contract (.md)</button><button onClick={() => void download("certificate")} disabled={working}><Download size={14} /> Certificate (.json)</button><button onClick={() => void download("print-contract")} disabled={working}>Print contract</button><button onClick={() => void download("print-certificate")} disabled={working}>Print certificate</button></div>}
        </section>

        <aside className="review-panel">
          <div className="panel-tabs"><button className={tab === "redlines" ? "active" : ""} onClick={() => setTab("redlines")}><MessageSquareText size={15} /> Redlines {openRedlines.length > 0 && <span>{openRedlines.length}</span>}</button><button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}><Activity size={15} /> Activity</button><button className={tab === "versions" ? "active" : ""} onClick={() => setTab("versions")}><History size={15} /> Versions</button></div>
          {tab === "redlines" || tab === "certificate" ? <div className="panel-content"><div className="panel-intro"><div><b>Proposed changes</b><span>Each proposal needs the other party’s response.</span></div>{agreement.permissions.canRedline && <button onClick={() => suggest({ kind: "field", id: "purpose" })}>+ New</button>}</div>{agreement.redlines.length === 0 ? <div className="empty-panel"><span><FileCheck2 size={22} /></span><b>No redlines yet</b><p>Proposed changes from either party will appear here.</p></div> : <div className="redline-list">{[...agreement.redlines].reverse().map((redline) => <RedlineCard key={redline.id} redline={redline} agreement={agreement} working={working} countering={countering === redline.id} counterText={counterText} setCounterText={setCounterText} onStartCounter={() => { setCountering(redline.id); setCounterText(redline.proposedValue); }} onCancelCounter={() => setCountering(null)} onRespond={(decision, counterValue, rationale) => void performAction({ type: "respond_redline", redlineId: redline.id, decision, counterValue, rationale }).then(() => setCountering(null))} />)}</div>}</div> : tab === "activity" ? <div className="panel-content activity-list">{[...agreement.audit].reverse().map((event) => <div className="activity-item" key={event.id}><span className={event.actorSource === "agent" ? "activity-avatar agent" : "activity-avatar"}>{event.actorSource === "agent" ? <Bot size={13} /> : <UserRound size={13} />}</span><div><p><b>{event.actorSource === "agent" ? `Agent for ${roleLabel(event.actorRole).toLowerCase()}` : roleLabel(event.actorRole)}</b> {event.summary.toLowerCase()}</p><small>Event {event.sequence} · {new Date(event.createdAt).toLocaleString()} · v{event.version}</small></div></div>)}</div> : <div className="panel-content version-list">{[...agreement.versions].reverse().map((version) => <div className="version-item" key={version.version}><span>v{version.version}</span><div><b>{version.version === agreement.version ? "Current version" : `Version ${version.version}`}</b><small>{new Date(version.createdAt).toLocaleString()} · {version.sections.length} sections</small></div>{agreement.execution?.documentVersion === version.version ? <i>Executed</i> : agreement.permissions.canRestoreVersion && version.version !== agreement.version ? <button disabled={working} onClick={() => setRestoringVersion(version.version)}>Restore</button> : null}</div>)}</div>}
          <div className="panel-footer"><ShieldCheck size={14} /><span>Actions are attributed and versioned</span></div>
        </aside>
      </div>

      {!closed && <div className="agreement-admin-actions">{agreement.permissions.canDecline && <button onClick={() => setEnding("decline")}>Decline agreement</button>}{agreement.permissions.canVoid && <button onClick={() => setEnding("void")}>Void agreement</button>}<a href="/recover">Recover access</a></div>}
      {proposedTarget && <RedlineDialog target={proposedTarget} working={working} onClose={() => setProposedTarget(null)} onSubmit={(proposedValue, rationale) => void performAction({ type: "propose_redline", target: proposedTarget.target, proposedValue, rationale }).then(() => { setProposedTarget(null); setTab("redlines"); })} />}
      {signing && <SignDialog id={id} email={viewerParty.email} partyName={viewerParty.signatoryName} version={agreement.version} working={working} authHeaders={authHeaders} onClose={() => setSigning(false)} onSign={(typedName, code) => void performAction({ type: "sign", typedName, code, consentVersion: signatureConsentVersion }).then(() => setSigning(false))} />}
      {correcting && <ParticipantDialog role={correcting} participant={agreement[correcting]} working={working} onClose={() => setCorrecting(null)} onSubmit={(participant) => void performAction({ type: "update_participant", role: correcting, participant }).then(() => setCorrecting(null))} />}
      {ending && <EndAgreementDialog kind={ending} working={working} onClose={() => setEnding(null)} onSubmit={(reason) => void performAction({ type: ending, reason }).then(() => setEnding(null))} />}
      {restoringVersion !== null && <RestoreVersionDialog version={restoringVersion} working={working} onClose={() => setRestoringVersion(null)} onRestore={() => void performAction({ type: "restore_version", version: restoringVersion }).then(() => setRestoringVersion(null))} />}
    </main>
  );
}

function DealAccountMenu({ agreement, profile }: { agreement: AgreementView; profile: ProfileState | null }) {
  const party = agreement[agreement.viewerRole];
  const returnTo = `/deal/${agreement.id}?as=${agreement.viewerRole}`;
  return <details className="deal-user-menu"><summary aria-label="Open agreement and account menu"><span>{party.signatoryName.slice(0, 1).toUpperCase()}</span><div><b>{roleLabel(agreement.viewerRole)}</b><small>{party.email}</small></div><ChevronDown size={14} /></summary><div className="deal-menu-popover"><p>Viewing as {roleLabel(agreement.viewerRole).toLowerCase()}</p>{profile?.signedIn ? <><Link href="/dashboard"><FilePenLine size={15} /> Agreements in progress</Link><Link href="/agreements/executed"><FileCheck2 size={15} /> Executed agreements</Link><Link href="/billing"><CreditCard size={15} /> Billing</Link><form action="/api/auth/logout" method="post"><button><LogOut size={15} /> Log out</button></form></> : <><Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}><ShieldCheck size={15} /> Save to profile</Link><Link href="/recover"><RefreshCw size={15} /> Recover access</Link></>}</div></details>;
}

function TermDisplay({ agreement, target, label, value, openRedlines, freshRedlines, onSuggest, canSuggest = agreement.permissions.canRedline }: { agreement: AgreementView; target: RedlineTarget; label: string; value: string; openRedlines: Redline[]; freshRedlines: string[]; onSuggest: (target: RedlineTarget) => void; canSuggest?: boolean }) {
  const redline = openRedlines.find((item) => targetKey(item.target) === targetKey(target));
  const baseline = target.kind === "field" ? agreement.reviewBaseline.fields[target.id] : "";
  const changed = agreement.status !== "draft" && !redline && baseline !== value;
  return <div className={`detail-row ${target.kind === "field" && target.id !== "effectiveDate" && target.id !== "governingLaw" ? "wide" : ""} ${redline ? `has-redline ${redline.proposedBy}` : ""}`} id={redline ? `redline-target-${redline.id}` : undefined}><dt>{label}{changed && <span className="changed-chip">Changed</span>}</dt>{redline ? <dd><RedlineMarkup redline={redline} fresh={freshRedlines.includes(redline.id)} /></dd> : <dd>{value}</dd>}{canSuggest && !redline && <button onClick={() => onSuggest(target)}><PenLine size={12} /> Suggest edit</button>}</div>;
}

function RedlineMarkup({ redline, fresh, onOpen }: { redline: Redline; fresh: boolean; onOpen?: () => void }) {
  return <div className={`document-redline ${redline.proposedBy} ${fresh ? "fresh" : ""}`}><span className="redline-attribution">Proposed by {roleLabel(redline.proposedBy)} {redline.proposedBySource === "agent" ? "agent" : ""}</span><del>{redline.currentValue}</del><ins>{redline.proposedValue}</ins>{onOpen && <button onClick={onOpen}><MessageSquareText size={12} /> Review proposal</button>}</div>;
}

function RedlineCard({ redline, agreement, working, countering, counterText, setCounterText, onStartCounter, onCancelCounter, onRespond }: { redline: Redline; agreement: AgreementView; working: boolean; countering: boolean; counterText: string; setCounterText: (value: string) => void; onStartCounter: () => void; onCancelCounter: () => void; onRespond: (decision: "accept" | "reject" | "counter", counterValue?: string, rationale?: string) => void }) {
  const canRespond = redline.status === "open" && redline.proposedBy !== agreement.viewerRole;
  return <article className={`redline-card ${redline.status} ${redline.proposedBy}`}><div className="redline-meta"><span className={`role-chip ${redline.proposedBy}`}>{redline.proposedBySource === "agent" ? <Bot size={12} /> : <UserRound size={12} />} {roleLabel(redline.proposedBy)} · {redline.proposedBySource}</span><span className="redline-status">{redline.status}</span></div><h3>{targetLabel(agreement, redline.target)}</h3><div className="change"><div><span>Current</span><p><del>{redline.currentValue}</del></p></div><div className="proposed"><span>Proposed</span><p><ins>{redline.proposedValue}</ins></p></div></div>{redline.rationale && <p className="rationale">“{redline.rationale}”</p>}{canRespond && !countering && <div className="redline-actions"><button disabled={working} onClick={() => onRespond("accept")}><Check size={14} /> Accept</button><button disabled={working} onClick={onStartCounter}><RotateCcw size={13} /> Counter</button><button disabled={working} onClick={() => onRespond("reject")}><X size={14} /> Reject</button></div>}{countering && <div className="counter-box"><label>Counterproposal<textarea className="field-textarea" value={counterText} onChange={(event) => setCounterText(event.target.value)} /></label><div><button className="button-quiet" onClick={onCancelCounter}>Cancel</button><button className="button-primary" disabled={working || !counterText.trim()} onClick={() => onRespond("counter", counterText, "Counterproposal")}>Send counter</button></div></div>}</article>;
}

function RedlineDialog({ target, working, onClose, onSubmit }: { target: ProposedTarget; working: boolean; onClose: () => void; onSubmit: (proposedValue: string, rationale: string) => void }) {
  const [value, setValue] = useState(target.currentValue);
  const [rationale, setRationale] = useState("");
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="redline-title"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Propose a change</p><h2 id="redline-title">{target.label}</h2><p className="dialog-help">The other party can accept, reject, or counter your proposed text.</p><label className="field-label">Proposed text<textarea className="field-textarea proposal-text" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></label><label className="field-label">Reason for change <span>(optional)</span><input className="field-input" placeholder="Give the other party useful context" value={rationale} onChange={(event) => setRationale(event.target.value)} /></label><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working || value === target.currentValue || !value.trim()} onClick={() => onSubmit(value, rationale)}><Send size={15} /> Send proposal</button></div></div></div>;
}

function SignDialog({ id, email, partyName, version, working, authHeaders, onClose, onSign }: { id: string; email: string; partyName: string; version: number; working: boolean; authHeaders: (headers?: HeadersInit) => Headers; onClose: () => void; onSign: (typedName: string, code: string) => void }) {
  const [name, setName] = useState(partyName);
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  async function requestCode() {
    const response = await fetch(`/api/agreements/${id}/signature-code`, { method: "POST", headers: authHeaders({ "content-type": "application/json" }), body: "{}" });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error?.message ?? "Could not send the code.");
    setCodeSent(true);
    setMessage(data.delivered ? `Code sent to ${email}` : "The code could not be delivered. Try again shortly.");
  }
  return <div className="dialog-backdrop" role="presentation"><div className="dialog sign-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-title"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><span className="sign-icon"><PenLine size={22} /></span><h2 id="sign-title">Sign version {version}</h2><p className="dialog-help">{agreementCopy.signatureCodeHelp}</p><label className="field-label">Full legal name<input className="field-input signature-input" value={name} onChange={(event) => setName(event.target.value)} /></label>{!codeSent ? <button className="button-secondary code-button" onClick={() => void requestCode()}><Mail size={15} /> Email my signing code</button> : <label className="field-label">Six-digit code<input className="field-input code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}{message && <p className="form-message">{message}</p>}<label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{agreementCopy.signingConsent}</span></label><div className="human-only"><UserRound size={15} /><span>Handshake does not expose signing as an agent tool.</span></div><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working || !confirmed || !name.trim() || code.length !== 6} onClick={() => onSign(name, code)}><PenLine size={15} /> Sign agreement</button></div></div></div>;
}

function ParticipantDialog({ role, participant, working, onClose, onSubmit }: { role: PartyRole; participant: AgreementView[PartyRole]; working: boolean; onClose: () => void; onSubmit: (participant: Partial<AgreementView[PartyRole]>) => void }) {
  const [values, setValues] = useState(participant);
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Participant details</p><h2>Correct {roleLabel(role).toLowerCase()}</h2><p className="dialog-help">Changing the invited signer’s email revokes their old links and sends a new invitation.</p>{(["legalName", "address", "signatoryName", "signatoryTitle", "email"] as const).map((key) => <label className="field-label" key={key}>{({ legalName: "Legal name", address: "Address", signatoryName: "Signatory name", signatoryTitle: "Signatory title", email: "Email" })[key]}<input className="field-input" type={key === "email" ? "email" : "text"} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}<div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working} onClick={() => onSubmit(values)}>Save corrections</button></div></div></div>;
}

function EndAgreementDialog({ kind, working, onClose, onSubmit }: { kind: "decline" | "void"; working: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Close agreement</p><h2>{kind === "decline" ? "Decline" : "Void"} this agreement?</h2><p className="dialog-help">This permanently closes the workspace for both parties. The reason is recorded and shared.</p><label className="field-label">Reason<textarea className="field-textarea" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus /></label><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-danger" disabled={working || !reason.trim()} onClick={() => onSubmit(reason)}>{kind === "decline" ? "Decline agreement" : "Void agreement"}</button></div></div></div>;
}

function RestoreVersionDialog({ version, working, onClose, onRestore }: { version: number; working: boolean; onClose: () => void; onRestore: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Version history</p><h2>Restore version {version}?</h2><p className="dialog-help">Handshake will copy that version’s document terms into a new version. Existing history remains intact, open redlines are superseded, and approvals must be collected again.</p><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working} onClick={onRestore}><RotateCcw size={15} /> Restore as new version</button></div></div></div>;
}

function CertificateView({ certificate, agreement, sealValid, onVerify, onDownload, working }: { certificate: NegotiationCertificate | null; agreement: AgreementView; sealValid: boolean | null; onVerify: () => Promise<void>; onDownload: (format: "pdf" | "markdown" | "certificate" | "print-contract" | "print-certificate") => void; working: boolean }) {
  if (!certificate) return <div className="document-paper certificate-paper loading-certificate"><LoaderCircle className="spin" size={22} /> Verifying execution seal…</div>;
  return <article className="document-paper certificate-paper"><div className="certificate-heading"><ShieldCheck size={30} /><p>Certificate of Negotiation</p><h1>{certificate.title}</h1><span>Agreement {certificate.agreementId}<br />Created {certificate.createdAt} · Signed {certificate.signedAt}</span></div><div className="certificate-seal"><span>SHA-256 execution seal</span><code>{certificate.sealHash}</code><small>Sealed {certificate.sealedAt}</small><b className={sealValid ? "seal-valid" : "seal-invalid"}>{sealValid ? <><Check size={13} /> Integrity verified</> : "Integrity check failed"}</b></div><h2>Party activity</h2><div className="certificate-parties">{certificate.partySummaries.map((party) => <div key={party.role}><b>{party.legalName}</b><span>{roleLabel(party.role)}</span><dl><dt>Agent proposals</dt><dd>{party.agentProposals}</dd><dt>Human negotiation actions</dt><dd>{party.humanNegotiationActions}</dd><dt>Signed (UTC)</dt><dd>{party.signedAt ?? "—"}</dd></dl></div>)}</div><h2>Negotiated terms</h2>{certificate.termHistory.length ? <div className="certificate-terms">{certificate.termHistory.map((term) => <section key={term.id}><b>{term.label}</b><span>{term.events.length} recorded negotiation event{term.events.length === 1 ? "" : "s"}</span>{term.changed && <><del>{term.openingValue}</del><ins>{term.finalValue}</ins></>}</section>)}</div> : <p>No terms changed during review.</p>}<p className="certificate-footer">{certificate.footer}</p><div className="download-row"><button disabled={working} onClick={() => onDownload("certificate")}><Download size={14} /> Download JSON</button><button disabled={working} onClick={() => onDownload("print-certificate")}>Print certificate</button><button onClick={() => void navigator.clipboard.writeText(agreement.execution?.sealHash ?? "")}><Copy size={14} /> Copy seal</button><button onClick={() => void onVerify()}><RefreshCw size={14} /> Verify integrity</button></div></article>;
}
