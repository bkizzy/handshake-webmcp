"use client";

import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FilePenLine,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  History,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AgreementAction,
  AgreementFields,
  AgreementView,
  PartyRole,
  Redline,
  RedlineTarget,
} from "@/src/lib/agreements/types";

import { Brand } from "./brand";
import { useAgreementTools } from "./use-agreement-tools";

type ActionResult = {
  agreement: AgreementView;
  invitation?: { email: string; url: string; delivered: boolean };
};

type ProfileState = {
  signedIn: boolean;
  saved: boolean;
  canClaim: boolean;
};

type ProposedTarget = {
  target: RedlineTarget;
  label: string;
  currentValue: string;
};

const fieldLabels: Record<keyof AgreementFields, string> = {
  effectiveDate: "Effective date",
  purpose: "Purpose",
  governingLaw: "Governing law",
  preExistingMaterials: "Pre-existing materials",
};

function roleName(role: PartyRole) {
  return role === "author" ? "Author" : "Signer";
}

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function targetLabel(agreement: AgreementView, target: RedlineTarget) {
  if (target.kind === "field") return fieldLabels[target.id];
  return agreement.sections.find((section) => section.id === target.id)?.title ?? target.id;
}

function targetValue(agreement: AgreementView, target: RedlineTarget) {
  if (target.kind === "field") return agreement.fields[target.id];
  return agreement.sections.find((section) => section.id === target.id)?.body ?? "";
}

function lifecycleMeta(agreement: AgreementView) {
  if (agreement.status === "signed") return { label: "Executed", detail: "Final record is locked" };
  if (agreement.status === "ready") {
    const signatures = Object.keys(agreement.signatures).length;
    return signatures
      ? { label: "Awaiting signature", detail: "One signature remains" }
      : { label: "Ready to sign", detail: "Approved by both parties" };
  }
  if (agreement.status === "review") {
    if (agreement.redlines.some((redline) => redline.status === "open")) {
      return { label: "Redlining", detail: "Both parties can propose changes" };
    }
    if (agreement.readiness.author || agreement.readiness.signer) {
      return { label: "Awaiting approval", detail: "One party has approved this version" };
    }
    return { label: "Awaiting review", detail: "The agreement is with both parties" };
  }
  return { label: "Draft", detail: "Only the author can edit" };
}

export function DealWorkspace({ id }: { id: string }) {
  const [agreement, setAgreement] = useState<AgreementView | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitation, setInvitation] = useState<ActionResult["invitation"]>();
  const [tab, setTab] = useState<"redlines" | "activity" | "versions">("redlines");
  const [proposedTarget, setProposedTarget] = useState<ProposedTarget | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionText, setSectionText] = useState("");
  const [draftFields, setDraftFields] = useState<AgreementFields | null>(null);
  const [signing, setSigning] = useState(false);
  const [countering, setCountering] = useState<string | null>(null);
  const [counterText, setCounterText] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/agreements/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Could not open this agreement.");
      setAgreement(data.agreement);
      setProfile(data.profile);
      setDraftFields((current) => current ?? data.agreement.fields);
      setError("");
    } catch (caught) {
      if (!quiet) setError(caught instanceof Error ? caught.message : "Could not open this agreement.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 3000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const performAction = useCallback(async (
    action: AgreementAction,
    source: "human" | "agent" = "human",
    idempotencyKey?: string,
  ) => {
    setWorking(true);
    if (action.type === "update_document_fields" || action.type === "update_draft_section") setSaveState("saving");
    setError("");
    try {
      const response = await fetch(`/api/agreements/${id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, action, idempotencyKey }),
      });
      const data = (await response.json()) as ActionResult & { error?: { message: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "The action could not be completed.");
      setAgreement(data.agreement);
      setDraftFields(data.agreement.fields);
      if (data.invitation) setInvitation(data.invitation);
      setSaveState("saved");
      return data;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The action could not be completed.";
      setError(message);
      throw caught;
    } finally {
      setWorking(false);
    }
  }, [id]);

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

  const webMcpState = useAgreementTools({ agreement, performAction });

  const openRedlines = useMemo(
    () => agreement?.redlines.filter((redline) => redline.status === "open") ?? [],
    [agreement],
  );

  function suggest(target: RedlineTarget) {
    if (!agreement) return;
    setProposedTarget({ target, label: targetLabel(agreement, target), currentValue: targetValue(agreement, target) });
  }

  async function copyInvitation() {
    if (!invitation) return;
    await navigator.clipboard.writeText(invitation.url);
    setNotice("Review link copied");
    window.setTimeout(() => setNotice(""), 2500);
  }

  if (loading) {
    return <div className="loading-screen"><LoaderCircle className="spin" size={25} /> Opening secure workspace…</div>;
  }

  if (!agreement) {
    return <div className="error-screen"><LockKeyhole size={27} /><h1>We couldn’t open this agreement</h1><p>{error}</p></div>;
  }

  const meta = lifecycleMeta(agreement);
  const viewerParty = agreement[agreement.viewerRole];

  return (
    <main className="workspace">
      <header className="workspace-header">
        <Brand />
        <div className="document-identity">
          <span>{agreement.title}</span>
          <small>Version {agreement.version} · {saveState === "saving" ? "Saving…" : "Saved"}</small>
        </div>
        <div className="header-actions">
          <div className={webMcpState === "connected" ? "agent-state connected" : "agent-state"} title="Available to compatible browser agents">
            <Bot size={15} /><span>{webMcpState === "connected" ? "Agent tools active" : "Agent-ready"}</span><i />
          </div>
          <div className="viewer"><span>{viewerParty.signatoryName.slice(0, 1).toUpperCase()}</span><div><b>{roleName(agreement.viewerRole)}</b><small>{viewerParty.email}</small></div><ChevronDown size={14} /></div>
        </div>
      </header>

      <div className="status-bar">
        <div className="status-copy"><span className={`status-icon ${agreement.status}`}>
          {agreement.status === "signed" ? <FileCheck2 size={17} /> : agreement.status === "ready" ? <CheckCircle2 size={17} /> : agreement.status === "review" ? <FilePenLine size={17} /> : <Clock3 size={17} />}
        </span><div><b>{meta.label}</b><small>{meta.detail}</small></div></div>
        <div className="progress" aria-label={`Agreement status: ${meta.label}`}>
          {(["Draft", "Review", "Approve", "Sign"] as const).map((label, index) => {
            const rank = { draft: 0, review: 1, ready: 2, signed: 3 }[agreement.status];
            return <div key={label} className={index <= rank ? "progress-step complete" : "progress-step"}><i>{index < rank ? <Check size={10} /> : index + 1}</i><span>{label}</span></div>;
          })}
        </div>
        <div className="primary-action">
          {agreement.permissions.canInvite && <button className="button-primary" disabled={working} onClick={() => void performAction({ type: "invite" })}><Send size={16} /> Invite to review</button>}
          {agreement.permissions.canMarkReady && <button className="button-primary" disabled={working} onClick={() => void performAction({ type: "mark_ready" })}><CheckCircle2 size={16} /> Approve version</button>}
          {agreement.permissions.canSign && <button className="button-primary" onClick={() => setSigning(true)}><PenLine size={16} /> Review & sign</button>}
          {agreement.status === "ready" && !agreement.permissions.canSign && <div className="waiting-state"><Clock3 size={15} /> Waiting for other signature</div>}
          {agreement.status === "review" && !agreement.permissions.canMarkReady && !agreement.permissions.canInvite && (
            <div className="waiting-state"><Clock3 size={15} />{openRedlines.length ? `${openRedlines.length} open change${openRedlines.length === 1 ? "" : "s"}` : agreement.readiness[agreement.viewerRole] ? "Waiting for other party" : "Review in progress"}</div>
          )}
          {agreement.status === "signed" && <a className="button-secondary download-link" href={`/api/agreements/${agreement.id}/download`}><Download size={15} /> Download final</a>}
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}
      {profile?.canClaim && <div className="claim-banner"><ShieldCheck size={18} /><div><b>Keep this agreement in your Handshake profile</b><span>Sign in with the author email to claim it and recover it from any device.</span></div><a className="button-secondary" href={`/login?returnTo=${encodeURIComponent(`/deal/${agreement.id}`)}`}>Save to profile</a></div>}
      {invitation && agreement.status === "review" && <div className="invite-banner"><Mail size={18} /><div><b>{invitation.delivered ? "Invitation sent" : "Invitation ready"} for {invitation.email}</b><span>{invitation.delivered ? "They can use the secure email link to review and redline." : "Email delivery will be connected at deployment. Copy this secure link for now."}</span></div><button className="button-secondary" onClick={() => void copyInvitation()}><Copy size={15} /> Copy link</button></div>}
      {!invitation && agreement.permissions.canResendInvitation && <div className="link-recovery"><span>Signer lost their review link?</span><button disabled={working} onClick={() => void performAction({ type: "resend_invitation" })}>Send a new secure link</button></div>}
      {notice && <div className="toast"><Check size={15} /> {notice}</div>}

      <div className="workspace-grid">
        <section className="document-column">
          <div className="document-toolbar">
            <div><FilePenLine size={16} /><span>Agreement</span></div>
            <div><span>{agreement.kind === "mutual" ? "Mutual NDA" : "One-way NDA"}</span><span>·</span><span>v{agreement.version}</span></div>
          </div>
          <article className="document-paper">
            <div className="document-heading">
              <p>{agreement.kind === "mutual" ? "Mutual" : "One-way"} non-disclosure agreement</p>
              <h1>{agreement.title}</h1>
              <span>Effective {formatDate(agreement.fields.effectiveDate)}</span>
            </div>

            {agreement.permissions.canEditDraft && draftFields ? (
              <div className="document-details editable-details">
                {(Object.keys(fieldLabels) as (keyof AgreementFields)[]).map((key) => (
                  <label className={`field-label ${key === "purpose" || key === "preExistingMaterials" ? "wide" : ""}`} key={key}>{fieldLabels[key]}
                    {key === "preExistingMaterials" || key === "purpose" ? (
                      <textarea className="field-textarea compact" value={draftFields[key]} onChange={(event) => setDraftFields({ ...draftFields, [key]: event.target.value })} />
                    ) : (
                      <input className="field-input" type={key === "effectiveDate" ? "date" : "text"} value={draftFields[key]} onChange={(event) => setDraftFields({ ...draftFields, [key]: event.target.value })} />
                    )}
                  </label>
                ))}
                <div className="autosave-note"><Check size={12} /> {saveState === "saving" ? "Saving changes…" : "Changes saved automatically"}</div>
              </div>
            ) : (
              <dl className="document-details">
                {(Object.keys(fieldLabels) as (keyof AgreementFields)[]).map((key) => (
                  <div className={key === "purpose" || key === "preExistingMaterials" ? "wide detail-row" : "detail-row"} key={key}>
                    <dt>{fieldLabels[key]}</dt><dd>{agreement.fields[key] || "None listed"}</dd>
                    {agreement.permissions.canRedline && <button onClick={() => suggest({ kind: "field", id: key })}><PenLine size={12} /> Suggest edit</button>}
                  </div>
                ))}
              </dl>
            )}

            <div className="parties">
              <div><p>Author</p><b>{agreement.author.legalName}</b><span>{agreement.author.address}</span></div>
              <div><p>Signer</p><b>{agreement.signer.legalName}</b><span>{agreement.signer.address}</span></div>
            </div>

            <div className="sections">
              {agreement.sections.map((section) => {
                const related = openRedlines.filter((redline) => redline.target.kind === "section" && redline.target.id === section.id);
                const isEditing = editingSection === section.id;
                return (
                  <section className={related.length ? "agreement-section has-redline" : "agreement-section"} key={section.id}>
                    <div className="section-heading"><h2>{section.title}</h2>
                      {agreement.permissions.canEditDraft && !isEditing && <button onClick={() => { setEditingSection(section.id); setSectionText(section.body); }}><PenLine size={12} /> Edit</button>}
                      {agreement.permissions.canRedline && <button onClick={() => suggest({ kind: "section", id: section.id })}><PenLine size={12} /> Suggest edit</button>}
                    </div>
                    {isEditing ? (
                      <div className="section-editor"><textarea className="field-textarea" value={sectionText} onChange={(event) => setSectionText(event.target.value)} /><div><span className="autosave-inline">{saveState === "saving" ? "Saving…" : "Saved automatically"}</span><button className="button-primary" disabled={working} onClick={() => {
                        if (section.body === sectionText) return setEditingSection(null);
                        void performAction({ type: "update_draft_section", sectionId: section.id, body: sectionText }).then(() => setEditingSection(null));
                      }}>Done</button></div></div>
                    ) : <p>{section.body}</p>}
                    {related.map((redline) => <button className="inline-redline" key={redline.id} onClick={() => setTab("redlines")}><MessageSquareText size={12} /> Open proposal from {roleName(redline.proposedBy).toLowerCase()}</button>)}
                  </section>
                );
              })}
            </div>

            <div className="signature-block">
              {(["author", "signer"] as PartyRole[]).map((role) => {
                const signature = agreement.signatures[role];
                const party = agreement[role];
                return <div key={role}><p>{roleName(role)}</p><div className={signature ? "signature-line signed" : "signature-line"}>{signature ? signature.typedName : party.signatoryName}</div><b>{party.signatoryName}</b><span>{party.signatoryTitle}, {party.legalName}</span>{signature && <small>Signed {formatDate(signature.signedAt)} · Version {signature.documentVersion}</small>}</div>;
              })}
            </div>
          </article>
        </section>

        <aside className="review-panel">
          <div className="panel-tabs">
            <button className={tab === "redlines" ? "active" : ""} onClick={() => setTab("redlines")}><MessageSquareText size={15} /> Redlines {openRedlines.length > 0 && <span>{openRedlines.length}</span>}</button>
            <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}><Activity size={15} /> Activity</button>
            <button className={tab === "versions" ? "active" : ""} onClick={() => setTab("versions")}><History size={15} /> Versions</button>
          </div>
          {tab === "redlines" ? (
            <div className="panel-content">
              <div className="panel-intro"><div><b>Proposed changes</b><span>Every change needs a response from the other side.</span></div>{agreement.permissions.canRedline && <button onClick={() => suggest({ kind: "field", id: "purpose" })}>+ New</button>}</div>
              {agreement.redlines.length === 0 ? (
                <div className="empty-panel"><span><FileCheck2 size={22} /></span><b>No redlines yet</b><p>Proposed changes from either party will appear here with a full history.</p></div>
              ) : (
                <div className="redline-list">{[...agreement.redlines].reverse().map((redline) => (
                  <RedlineCard key={redline.id} redline={redline} agreement={agreement} working={working} countering={countering === redline.id} counterText={counterText} setCounterText={setCounterText} onStartCounter={() => { setCountering(redline.id); setCounterText(redline.proposedValue); }} onCancelCounter={() => setCountering(null)} onRespond={(decision, counterValue, rationale) => void performAction({ type: "respond_redline", redlineId: redline.id, decision, counterValue, rationale }).then(() => setCountering(null))} />
                ))}</div>
              )}
            </div>
          ) : tab === "activity" ? (
            <div className="panel-content activity-list">
              {[...agreement.audit].reverse().map((event) => <div className="activity-item" key={event.id}><span className={event.actorSource === "agent" ? "activity-avatar agent" : "activity-avatar"}>{event.actorSource === "agent" ? <Bot size={13} /> : <UserRound size={13} />}</span><div><p><b>{event.actorSource === "agent" ? `Agent for ${roleName(event.actorRole).toLowerCase()}` : roleName(event.actorRole)}</b> {event.summary.toLowerCase()}</p><small>{new Date(event.createdAt).toLocaleString()} · v{event.version}</small></div></div>)}
            </div>
          ) : (
            <div className="panel-content version-list">
              {[...agreement.versions].reverse().map((version, index) => <div className="version-item" key={version.version}><span>v{version.version}</span><div><b>{index === 0 ? "Current version" : `Version ${version.version}`}</b><small>{new Date(version.createdAt).toLocaleString()} · {version.sections.length} sections</small></div>{agreement.execution?.documentVersion === version.version && <i>Executed</i>}</div>)}
            </div>
          )}
          <div className="panel-footer"><ShieldCheck size={14} /><span>Actions are attributed and versioned</span></div>
        </aside>
      </div>

      {proposedTarget && <RedlineDialog target={proposedTarget} working={working} onClose={() => setProposedTarget(null)} onSubmit={(proposedValue, rationale) => void performAction({ type: "propose_redline", target: proposedTarget.target, proposedValue, rationale }).then(() => { setProposedTarget(null); setTab("redlines"); })} />}
      {signing && <SignDialog partyName={viewerParty.signatoryName} version={agreement.version} working={working} onClose={() => setSigning(false)} onSign={(typedName) => void performAction({ type: "sign", typedName }).then(() => setSigning(false))} />}

      <style jsx>{workspaceStyles}</style>
    </main>
  );
}

function RedlineCard({ redline, agreement, working, countering, counterText, setCounterText, onStartCounter, onCancelCounter, onRespond }: {
  redline: Redline;
  agreement: AgreementView;
  working: boolean;
  countering: boolean;
  counterText: string;
  setCounterText: (value: string) => void;
  onStartCounter: () => void;
  onCancelCounter: () => void;
  onRespond: (decision: "accept" | "reject" | "counter", counterValue?: string, rationale?: string) => void;
}) {
  const canRespond = redline.status === "open" && redline.proposedBy !== agreement.viewerRole;
  return (
    <article className={`redline-card ${redline.status}`}>
      <div className="redline-meta"><span className={`role-chip ${redline.proposedBy}`}><Bot size={12} /> {roleName(redline.proposedBy)}</span><span className="redline-status">{redline.status}</span></div>
      <h3>{targetLabel(agreement, redline.target)}</h3>
      <div className="change"><div><span>Current</span><p>{redline.currentValue}</p></div><div className="proposed"><span>Proposed</span><p>{redline.proposedValue}</p></div></div>
      {redline.rationale && <p className="rationale">“{redline.rationale}”</p>}
      {canRespond && !countering && <div className="redline-actions"><button disabled={working} onClick={() => onRespond("accept")}><Check size={14} /> Accept</button><button disabled={working} onClick={onStartCounter}><RotateCcw size={13} /> Counter</button><button disabled={working} onClick={() => onRespond("reject")}><X size={14} /> Reject</button></div>}
      {countering && <div className="counter-box"><label>Counterproposal<textarea className="field-textarea" value={counterText} onChange={(event) => setCounterText(event.target.value)} /></label><div><button className="button-quiet" onClick={onCancelCounter}>Cancel</button><button className="button-primary" disabled={working || !counterText.trim()} onClick={() => onRespond("counter", counterText, "Counterproposal")}>Send counter</button></div></div>}
    </article>
  );
}

function RedlineDialog({ target, working, onClose, onSubmit }: { target: ProposedTarget; working: boolean; onClose: () => void; onSubmit: (proposedValue: string, rationale: string) => void }) {
  const [value, setValue] = useState(target.currentValue);
  const [rationale, setRationale] = useState("");
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="redline-title"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Propose a change</p><h2 id="redline-title">{target.label}</h2><p className="dialog-help">The other party can accept, reject, or counter your proposed text.</p><label className="field-label">Proposed text<textarea className="field-textarea proposal-text" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></label><label className="field-label">Reason for change <span>(optional)</span><input className="field-input" placeholder="Give the other party useful context" value={rationale} onChange={(event) => setRationale(event.target.value)} /></label><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working || value === target.currentValue || !value.trim()} onClick={() => onSubmit(value, rationale)}><Send size={15} /> Send proposal</button></div></div></div>;
}

function SignDialog({ partyName, version, working, onClose, onSign }: { partyName: string; version: number; working: boolean; onClose: () => void; onSign: (typedName: string) => void }) {
  const [name, setName] = useState(partyName);
  const [confirmed, setConfirmed] = useState(false);
  return <div className="dialog-backdrop" role="presentation"><div className="dialog sign-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-title"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><span className="sign-icon"><PenLine size={22} /></span><h2 id="sign-title">Sign version {version}</h2><p className="dialog-help">Your signature applies only to this exact version. Any later change will require both parties to approve and sign again.</p><label className="field-label">Full legal name<input className="field-input signature-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I have reviewed the agreement and intend to sign it electronically.</span></label><div className="human-only"><UserRound size={15} /><span>Signatures are a human action. Handshake does not expose signing to agents.</span></div><div className="dialog-actions"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={working || !confirmed || !name.trim()} onClick={() => onSign(name)}><PenLine size={15} /> Sign agreement</button></div></div></div>;
}

const workspaceStyles = `
  .workspace { min-height: 100vh; background: #f3f5f8; }
  .workspace-header { height: 65px; display: grid; grid-template-columns: 240px 1fr auto; align-items: center; padding: 0 24px; border-bottom: 1px solid var(--line); background: white; }
  .document-identity { justify-self: center; display: flex; align-items: center; gap: 8px; }
  .document-identity span { color: #384359; font-size: 13px; font-weight: 680; }
  .document-identity small { padding-left: 8px; border-left: 1px solid #dce1e8; color: #8891a2; font-size: 11px; }
  .header-actions { display: flex; align-items: center; gap: 14px; }
  .agent-state { min-height: 32px; padding: 6px 8px; display: flex; align-items: center; gap: 6px; color: #5e697c; background: #f7f9fc; border: 1px solid #e0e5ed; border-radius: 7px; font-size: 10px; font-weight: 700; }
  .agent-state svg { color: var(--blue); }
  .agent-state i { width: 6px; height: 6px; border-radius: 50%; background: #aab2c1; }
  .agent-state.connected i { background: #27a677; box-shadow: 0 0 0 3px #e4f6ef; }
  .viewer { display: flex; align-items: center; gap: 8px; }
  .viewer > span { width: 30px; height: 30px; display: grid; place-items: center; color: white; background: #53627d; border-radius: 50%; font-size: 11px; font-weight: 750; }
  .viewer div { display: grid; line-height: 1.25; }
  .viewer b { color: #3b465b; font-size: 10px; }
  .viewer small { max-width: 140px; overflow: hidden; color: #818a9a; font-size: 9px; text-overflow: ellipsis; }
  .viewer > svg { color: #969dab; }
  .status-bar { min-height: 74px; display: grid; grid-template-columns: 250px 1fr 250px; align-items: center; padding: 0 24px; border-bottom: 1px solid #d9dfe8; background: white; box-shadow: 0 2px 6px rgba(28, 38, 60, .04); }
  .status-copy { display: flex; align-items: center; gap: 10px; }
  .status-copy > div { display: grid; }
  .status-copy b { color: #344057; font-size: 12px; }
  .status-copy small { color: #818b9c; font-size: 9px; }
  .status-icon { width: 35px; height: 35px; display: grid; place-items: center; color: #637086; background: #f0f2f6; border-radius: 9px; }
  .status-icon.review { color: var(--blue); background: var(--blue-soft); }
  .status-icon.ready, .status-icon.signed { color: var(--green); background: var(--green-soft); }
  .progress { justify-self: center; display: flex; align-items: center; }
  .progress-step { min-width: 82px; position: relative; display: flex; align-items: center; gap: 6px; color: #9aa2b0; font-size: 9px; font-weight: 700; }
  .progress-step:not(:last-child)::after { content: ''; width: 26px; height: 1px; margin-left: 4px; background: #dce1e8; }
  .progress-step i { width: 18px; height: 18px; display: grid; place-items: center; border: 1px solid #ccd3dd; border-radius: 50%; font-style: normal; font-size: 8px; }
  .progress-step.complete { color: var(--blue); }
  .progress-step.complete i { color: white; border-color: var(--blue); background: var(--blue); }
  .primary-action { justify-self: end; }
  .primary-action .button-primary { min-height: 40px; padding: 8px 14px; font-size: 11px; }
  .primary-action .download-link { min-height: 40px; padding: 8px 12px; font-size: 10px; }
  .waiting-state, .signed-state { display: flex; align-items: center; gap: 6px; color: #7d8697; font-size: 10px; font-weight: 650; }
  .signed-state { color: var(--green); }
  .error-banner, .invite-banner, .claim-banner { margin: 14px 24px 0; border-radius: 9px; }
  .error-banner { min-height: 42px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; color: var(--red); border: 1px solid #efcaca; background: var(--red-soft); font-size: 12px; }
  .error-banner button { min-width: 35px; min-height: 35px; display: grid; place-items: center; border: 0; color: var(--red); background: transparent; cursor: pointer; }
  .invite-banner { min-height: 64px; padding: 10px 12px; display: flex; align-items: center; gap: 11px; color: #21469d; border: 1px solid #cfddff; background: #edf3ff; }
  .invite-banner > svg { flex: 0 0 auto; }
  .invite-banner div { flex: 1; display: grid; }
  .invite-banner b { font-size: 11px; }
  .invite-banner span { color: #657492; font-size: 9px; }
  .invite-banner .button-secondary { min-height: 36px; padding: 6px 10px; font-size: 10px; }
  .claim-banner { min-height: 64px; padding: 10px 12px; display: flex; align-items: center; gap: 11px; color: #176248; border: 1px solid #bfe2d5; background: #edf9f4; }
  .claim-banner > svg { flex: 0 0 auto; }
  .claim-banner div { flex: 1; display: grid; }
  .claim-banner b { font-size: 11px; }
  .claim-banner span { color: #5f7b70; font-size: 9px; }
  .claim-banner .button-secondary { min-height: 36px; padding: 6px 10px; font-size: 10px; }
  .link-recovery { margin: 10px 24px 0; display: flex; justify-content: flex-end; align-items: center; gap: 8px; color: #7b8596; font-size: 9px; }
  .link-recovery button { padding: 0; border: 0; color: var(--blue); background: transparent; font-size: 9px; font-weight: 700; cursor: pointer; }
  .toast { position: fixed; top: 86px; left: 50%; z-index: 50; transform: translateX(-50%); padding: 9px 13px; display: flex; align-items: center; gap: 7px; color: white; background: #253148; border-radius: 8px; box-shadow: var(--shadow-md); font-size: 11px; font-weight: 650; }
  .workspace-grid { max-width: 1460px; margin: 0 auto; display: grid; grid-template-columns: minmax(660px, 1fr) 390px; align-items: start; }
  .document-column { min-width: 0; padding: 22px 30px 70px; }
  .document-toolbar { max-width: 790px; height: 38px; margin: 0 auto 9px; display: flex; align-items: center; justify-content: space-between; color: #737d8f; font-size: 9px; font-weight: 650; }
  .document-toolbar div { display: flex; align-items: center; gap: 7px; }
  .document-paper { max-width: 790px; min-height: 1000px; margin: 0 auto; padding: 66px 74px 62px; border: 1px solid #d7dde6; background: white; box-shadow: 0 7px 22px rgba(28, 40, 64, .08); }
  .document-heading { padding-bottom: 35px; text-align: center; border-bottom: 1px solid #dde2e9; }
  .document-heading p { margin: 0; color: #697487; font-family: Arial, sans-serif; font-size: 8px; letter-spacing: .14em; text-transform: uppercase; font-weight: 750; }
  .document-heading h1 { margin: 12px 0 8px; color: #222b3c; font-family: Georgia, serif; font-size: 25px; line-height: 1.2; letter-spacing: -.02em; }
  .document-heading span { color: #7b8493; font-family: Georgia, serif; font-size: 10px; }
  .document-details { margin: 32px 0 0; padding: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 17px 28px; border: 1px solid #e0e4ea; background: #fafbfc; }
  .detail-row { position: relative; padding-right: 64px; }
  .detail-row.wide { grid-column: 1 / -1; }
  .detail-row dt { color: #808999; font-family: Arial, sans-serif; font-size: 7px; letter-spacing: .08em; text-transform: uppercase; font-weight: 750; }
  .detail-row dd { margin: 3px 0 0; color: #343d4f; font-family: Georgia, serif; font-size: 10px; line-height: 1.45; }
  .detail-row button, .section-heading button { min-height: 27px; padding: 4px 6px; display: flex; align-items: center; gap: 4px; border: 0; color: var(--blue); background: transparent; font-family: Arial, sans-serif; font-size: 8px; font-weight: 700; cursor: pointer; }
  .detail-row button { position: absolute; top: 0; right: 0; }
  .editable-details { align-items: end; }
  .editable-details .field-label { color: #5a6578; font-family: Arial, sans-serif; font-size: 9px; }
  .editable-details .wide { grid-column: 1 / -1; }
  .editable-details .field-input { min-height: 38px; padding: 8px 9px; font-size: 10px; }
  .editable-details .field-textarea.compact { min-height: 68px; padding: 8px 9px; font-size: 10px; }
  .autosave-note { justify-self: end; grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; color: var(--green); font-size: 8px; font-weight: 700; }
  .parties { margin: 28px 0 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .parties div { display: grid; }
  .parties p { margin: 0 0 4px; color: #8991a0; font-family: Arial, sans-serif; font-size: 7px; letter-spacing: .08em; text-transform: uppercase; font-weight: 750; }
  .parties b { color: #313a4b; font-family: Georgia, serif; font-size: 11px; }
  .parties span { margin-top: 3px; color: #717a8a; font-family: Georgia, serif; font-size: 8px; line-height: 1.45; }
  .sections { counter-reset: section; }
  .agreement-section { position: relative; margin-top: 23px; padding: 0; }
  .agreement-section.has-redline { margin-left: -15px; padding-left: 12px; border-left: 3px solid #e1a23d; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .section-heading h2 { margin: 0; color: #30394a; font-family: Georgia, serif; font-size: 12px; line-height: 1.35; }
  .section-heading button { opacity: 0; transition: opacity 120ms; }
  .agreement-section:hover .section-heading button, .section-heading button:focus-visible { opacity: 1; }
  .agreement-section > p { margin: 7px 0 0; color: #4a5362; font-family: Georgia, serif; font-size: 10.5px; line-height: 1.72; }
  .section-editor { margin-top: 8px; }
  .section-editor .field-textarea { min-height: 150px; font-family: Georgia, serif; font-size: 11px; }
  .section-editor > div { margin-top: 8px; display: flex; justify-content: flex-end; gap: 6px; }
  .autosave-inline { margin-right: auto; align-self: center; color: var(--green); font-size: 8px; font-weight: 700; }
  .section-editor .button-primary, .section-editor .button-quiet { min-height: 34px; padding: 6px 10px; font-size: 9px; }
  .inline-redline { margin-top: 8px; padding: 5px 7px; display: flex; align-items: center; gap: 5px; border: 1px solid #eed29f; border-radius: 5px; color: #8e5a08; background: var(--amber-soft); font-family: Arial, sans-serif; font-size: 8px; font-weight: 700; cursor: pointer; }
  .signature-block { margin-top: 58px; padding-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 44px; border-top: 1px solid #dfe3e9; }
  .signature-block > div { display: grid; }
  .signature-block p { margin: 0 0 24px; color: #858e9d; font-family: Arial, sans-serif; font-size: 7px; letter-spacing: .08em; text-transform: uppercase; font-weight: 750; }
  .signature-line { height: 30px; padding: 3px 4px; color: #b1b7c0; border-bottom: 1px solid #aeb6c2; font-family: Arial, sans-serif; font-size: 10px; }
  .signature-line.signed { color: #2450b5; font-family: 'Brush Script MT', cursive; font-size: 20px; }
  .signature-block b { margin-top: 7px; color: #394254; font-family: Georgia, serif; font-size: 9px; }
  .signature-block span, .signature-block small { color: #7d8593; font-family: Georgia, serif; font-size: 7px; }
  .signature-block small { margin-top: 5px; color: var(--green); }
  .review-panel { min-height: calc(100vh - 139px); position: sticky; top: 0; display: grid; grid-template-rows: 52px 1fr 38px; align-self: stretch; border-left: 1px solid #d7dde6; background: white; }
  .panel-tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid var(--line); }
  .panel-tabs button { position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; color: #7a8496; background: white; font-size: 10px; font-weight: 700; cursor: pointer; }
  .panel-tabs button.active { color: var(--blue); }
  .panel-tabs button.active::after { content: ''; position: absolute; left: 20%; right: 20%; bottom: -1px; height: 2px; background: var(--blue); }
  .panel-tabs button span { min-width: 17px; height: 17px; padding: 0 4px; display: grid; place-items: center; color: white; background: var(--blue); border-radius: 999px; font-size: 8px; }
  .panel-content { min-height: 0; overflow: auto; padding: 17px; }
  .panel-intro { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 15px; }
  .panel-intro div { display: grid; }
  .panel-intro b { color: #394459; font-size: 11px; }
  .panel-intro span { color: #8891a1; font-size: 8px; }
  .panel-intro button { min-height: 30px; border: 0; color: var(--blue); background: transparent; font-size: 9px; font-weight: 750; cursor: pointer; }
  .empty-panel { margin-top: 60px; padding: 20px; display: grid; justify-items: center; text-align: center; }
  .empty-panel > span { width: 48px; height: 48px; display: grid; place-items: center; color: #71809a; background: #f0f3f7; border-radius: 14px; }
  .empty-panel b { margin-top: 14px; color: #445066; font-size: 11px; }
  .empty-panel p { max-width: 230px; margin: 5px 0 0; color: #8b94a4; font-size: 9px; line-height: 1.5; }
  .redline-list { display: grid; gap: 11px; }
  .redline-card { padding: 13px; border: 1px solid #dbe1e9; border-radius: 9px; background: white; box-shadow: var(--shadow-sm); }
  .redline-card.open { border-left: 3px solid #e5a83f; }
  .redline-card.accepted { border-left: 3px solid #36a47c; }
  .redline-card.rejected, .redline-card.superseded { opacity: .68; }
  .redline-meta { display: flex; align-items: center; justify-content: space-between; }
  .role-chip { padding: 4px 6px; display: flex; align-items: center; gap: 4px; color: #3159b2; background: #edf3ff; border-radius: 5px; font-size: 8px; font-weight: 750; }
  .role-chip.signer { color: #6950a5; background: #f2effb; }
  .redline-status { color: #8a93a2; font-size: 7px; letter-spacing: .05em; text-transform: uppercase; font-weight: 750; }
  .redline-card h3 { margin: 10px 0 8px; color: #374258; font-size: 11px; }
  .change { display: grid; gap: 5px; }
  .change > div { padding: 7px; border-radius: 5px; background: #f7f8fa; }
  .change > div.proposed { background: #eef4ff; }
  .change span { color: #8b94a3; font-size: 7px; text-transform: uppercase; font-weight: 750; }
  .change p { max-height: 84px; margin: 3px 0 0; overflow: auto; color: #566176; font-size: 9px; line-height: 1.45; }
  .proposed p { color: #254a9d; }
  .rationale { margin: 8px 0 0; color: #788295; font-size: 8px; font-style: italic; }
  .redline-actions { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .redline-actions button { min-height: 31px; padding: 4px; display: flex; align-items: center; justify-content: center; gap: 3px; border: 1px solid #d7dde6; border-radius: 6px; color: #566176; background: white; font-size: 8px; font-weight: 700; cursor: pointer; }
  .redline-actions button:first-child { color: var(--green); border-color: #bfe2d5; background: #f4fbf8; }
  .counter-box { margin-top: 10px; }
  .counter-box label { display: grid; gap: 5px; color: #586378; font-size: 8px; font-weight: 700; }
  .counter-box textarea { min-height: 90px; padding: 7px; font-size: 9px; }
  .counter-box > div { margin-top: 6px; display: flex; justify-content: flex-end; gap: 4px; }
  .counter-box .button-primary, .counter-box .button-quiet { min-height: 31px; padding: 5px 7px; font-size: 8px; }
  .panel-footer { padding: 0 17px; display: flex; align-items: center; gap: 6px; color: #8992a1; border-top: 1px solid var(--line); font-size: 8px; }
  .panel-footer svg { color: var(--green); }
  .activity-list { padding-top: 24px; }
  .activity-item { position: relative; display: grid; grid-template-columns: 29px 1fr; gap: 9px; padding-bottom: 22px; }
  .activity-item:not(:last-child)::before { content: ''; position: absolute; left: 13px; top: 27px; bottom: 0; width: 1px; background: #e1e5eb; }
  .activity-avatar { width: 27px; height: 27px; z-index: 1; display: grid; place-items: center; color: #657086; background: #f0f2f6; border-radius: 50%; }
  .activity-avatar.agent { color: var(--blue); background: var(--blue-soft); }
  .activity-item p { margin: 1px 0 2px; color: #697386; font-size: 9px; line-height: 1.4; }
  .activity-item p b { color: #3c475b; }
  .activity-item small { color: #9aa1ad; font-size: 7px; }
  .version-list { display: grid; align-content: start; gap: 9px; padding-top: 22px; }
  .version-item { padding: 11px; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 9px; border: 1px solid #dfe4ec; border-radius: 8px; }
  .version-item > span { width: 32px; height: 32px; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 7px; font-size: 9px; font-weight: 750; }
  .version-item div { display: grid; }
  .version-item b { color: #424d61; font-size: 9px; }
  .version-item small { color: #8a93a2; font-size: 7px; }
  .version-item i { color: var(--green); font-size: 7px; font-style: normal; font-weight: 750; text-transform: uppercase; }
  .loading-screen, .error-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; gap: 10px; color: #697488; background: var(--canvas); font-size: 13px; }
  .error-screen { flex-direction: column; text-align: center; }
  .error-screen h1 { margin: 12px 0 0; color: #303b50; font-size: 23px; }
  .error-screen p { margin: 0; }
  .spin { animation: spin 900ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dialog-backdrop { position: fixed; inset: 0; z-index: 100; padding: 24px; display: grid; place-items: center; background: rgba(21, 29, 47, .48); backdrop-filter: blur(3px); }
  .dialog { width: min(560px, 100%); max-height: calc(100vh - 48px); position: relative; overflow: auto; padding: 30px; border: 1px solid #d7dde6; border-radius: 13px; background: white; box-shadow: 0 24px 70px rgba(19, 28, 48, .24); }
  .dialog-close { width: 38px; height: 38px; position: absolute; top: 17px; right: 17px; display: grid; place-items: center; border: 0; color: #717b8e; background: transparent; border-radius: 7px; cursor: pointer; }
  .dialog h2 { margin: 9px 42px 0 0; color: #273248; font-size: 23px; letter-spacing: -.025em; }
  .dialog-help { margin: 8px 38px 23px 0; color: #707b8e; font-size: 12px; line-height: 1.55; }
  .dialog .field-label { margin-top: 15px; }
  .dialog .field-label span { color: #929aa8; font-weight: 500; }
  .dialog .proposal-text { min-height: 180px; }
  .dialog-actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px; }
  .sign-dialog { width: min(500px, 100%); }
  .sign-icon { width: 46px; height: 46px; display: grid; place-items: center; color: var(--blue); background: var(--blue-soft); border-radius: 11px; }
  .signature-input { color: #2450b5; font-family: 'Brush Script MT', cursive; font-size: 23px; }
  .confirm-row { margin-top: 18px; display: flex; align-items: flex-start; gap: 9px; color: #515d72; font-size: 11px; line-height: 1.45; cursor: pointer; }
  .confirm-row input { margin-top: 2px; accent-color: var(--blue); }
  .human-only { margin-top: 18px; padding: 10px; display: flex; align-items: center; gap: 8px; color: #647086; background: #f5f7fa; border-radius: 7px; font-size: 9px; }
  .human-only svg { flex: 0 0 auto; color: var(--green); }
  @media (max-width: 980px) {
    .workspace-header { grid-template-columns: auto 1fr; }
    .document-identity { display: none; }
    .status-bar { grid-template-columns: 1fr auto; }
    .progress { display: none; }
    .workspace-grid { grid-template-columns: 1fr; }
    .review-panel { min-height: 560px; position: static; border-top: 1px solid #d7dde6; border-left: 0; }
  }
  @media (max-width: 680px) {
    .workspace-header { height: 58px; padding: 0 12px; }
    .agent-state span, .viewer div, .viewer > svg { display: none; }
    .header-actions { gap: 7px; }
    .status-bar { min-height: 66px; padding: 0 12px; }
    .status-copy small { display: none; }
    .primary-action .button-primary { padding: 7px 9px; }
    .document-column { padding: 12px 0 35px; overflow: hidden; }
    .document-toolbar { padding: 0 12px; }
    .document-paper { width: 100%; min-height: auto; padding: 42px 24px; border-left: 0; border-right: 0; }
    .document-details, .parties, .signature-block { grid-template-columns: 1fr; }
    .detail-row.wide, .editable-details .wide, .autosave-note { grid-column: auto; }
    .section-heading button { opacity: 1; }
    .invite-banner { margin-left: 10px; margin-right: 10px; align-items: flex-start; flex-wrap: wrap; }
    .invite-banner .button-secondary { width: 100%; }
    .claim-banner { margin-left: 10px; margin-right: 10px; align-items: flex-start; flex-wrap: wrap; }
    .claim-banner .button-secondary { width: 100%; }
  }
`;
