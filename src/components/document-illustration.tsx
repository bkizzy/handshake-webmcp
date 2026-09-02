import { Bot, Check, MessageSquareText, PenLine, UserRound } from "lucide-react";

export function DocumentIllustration() {
  return (
    <div className="scene" aria-label="An agreement being reviewed, redlined, and signed">
      <div className="glow" />
      <div className="agent agent-left">
        <Bot size={15} />
        <span>Author agent</span>
        <i />
      </div>
      <div className="agent agent-right">
        <Bot size={15} />
        <span>Signer agent</span>
        <i />
      </div>
      <div className="document-card">
        <div className="document-top">
          <span className="doc-icon"><span /></span>
          <div><b>Mutual NDA</b><small>Version 4 · In review</small></div>
          <span className="status-dot"><i /> Live</span>
        </div>
        <div className="paper">
          <div className="paper-kicker">Mutual non-disclosure agreement</div>
          <div className="paper-title-line" />
          <div className="paper-title-line short" />
          <div className="paper-rule" />
          <div className="clause">
            <b>4. Exclusions</b>
            <span className="line full" />
            <span className="line medium" />
            <span className="deleted">three years</span>
            <span className="inserted">two years</span>
          </div>
          <div className="clause second">
            <b>8. Pre-existing materials</b>
            <span className="line full" />
            <span className="line long" />
            <span className="line short" />
          </div>
          <div className="signature-row">
            <div><span>Avery Author</span><small>Signed</small></div>
            <div><span className="signature-pending">Sam Signer</span><small>Ready to sign</small></div>
          </div>
        </div>
      </div>
      <div className="comment comment-left">
        <span className="comment-icon"><MessageSquareText size={15} /></span>
        <div><b>Term updated</b><small>Accepted by author</small></div>
        <Check size={15} />
      </div>
      <div className="comment comment-right">
        <span className="comment-icon"><PenLine size={15} /></span>
        <div><b>Prior work added</b><small>Proposed by signer</small></div>
        <span className="open-pill">Open</span>
      </div>
      <div className="human human-left"><UserRound size={14} /><span>Human approved</span></div>
      <div className="human human-right"><UserRound size={14} /><span>Human signs</span></div>
      <style jsx>{`
        .scene {
          min-height: 540px;
          position: relative;
          isolation: isolate;
        }
        .glow {
          position: absolute;
          inset: 4% 4% 0;
          border-radius: 50%;
          background: radial-gradient(circle, #eaf0ff 0, rgba(241, 245, 255, 0.58) 45%, transparent 72%);
          z-index: -2;
        }
        .document-card {
          width: min(430px, 78%);
          position: absolute;
          left: 50%;
          top: 62px;
          transform: translateX(-50%) rotate(-1.25deg);
          padding: 12px;
          border: 1px solid #d8dee8;
          border-radius: 14px;
          background: #f6f8fb;
          box-shadow: 0 26px 70px rgba(33, 48, 80, 0.19), 0 4px 14px rgba(33, 48, 80, 0.09);
        }
        .document-top {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 3px 11px;
          font-size: 11px;
        }
        .document-top div { display: grid; line-height: 1.25; }
        .document-top b { color: #263148; font-size: 12px; }
        .document-top small { color: #7a8496; }
        .doc-icon {
          width: 29px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 6px;
          background: var(--blue);
        }
        .doc-icon span { width: 12px; height: 15px; border: 1px solid white; border-radius: 2px; }
        .status-dot {
          margin-left: auto;
          padding: 5px 7px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--green);
          background: var(--green-soft);
          border-radius: 999px;
          font-weight: 700;
        }
        .status-dot i { width: 6px; height: 6px; border-radius: 50%; background: #25a879; }
        .paper {
          min-height: 386px;
          padding: 34px 36px 28px;
          border: 1px solid #e4e8ef;
          border-radius: 7px;
          background: white;
          box-shadow: var(--shadow-sm);
        }
        .paper-kicker { color: #697387; font-size: 7px; text-align: center; text-transform: uppercase; letter-spacing: .14em; font-weight: 800; }
        .paper-title-line { width: 62%; height: 7px; margin: 10px auto 0; border-radius: 4px; background: #253149; }
        .paper-title-line.short { width: 43%; margin-top: 5px; }
        .paper-rule { height: 1px; margin: 20px 0; background: #e4e8ef; }
        .clause { position: relative; display: flex; flex-wrap: wrap; gap: 5px 6px; color: #697387; font-size: 7px; line-height: 1.45; }
        .clause b { width: 100%; color: #39445a; font-size: 8px; }
        .clause.second { margin-top: 20px; }
        .line { height: 4px; border-radius: 3px; background: #e2e6ed; }
        .line.full { width: 100%; }
        .line.medium { width: 46%; }
        .line.long { width: 72%; }
        .line.short { width: 29%; }
        .deleted { padding: 1px 3px; color: #b34545; background: #ffebeb; text-decoration: line-through; border-radius: 2px; }
        .inserted { padding: 1px 3px; color: #126a4c; background: #e5f7f0; border-radius: 2px; }
        .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
        .signature-row div { border-top: 1px solid #cfd5df; padding-top: 6px; display: grid; }
        .signature-row span { color: #264eaa; font-family: Georgia, serif; font-size: 11px; font-style: italic; }
        .signature-row .signature-pending { color: #adb4c0; font-family: inherit; font-style: normal; }
        .signature-row small { color: #8992a2; font-size: 6px; text-transform: uppercase; letter-spacing: .08em; }
        .agent, .human, .comment { position: absolute; background: white; border: 1px solid #dce2eb; box-shadow: var(--shadow-md); }
        .agent { top: 15px; min-height: 38px; padding: 8px 11px; display: flex; align-items: center; gap: 7px; border-radius: 9px; color: #3f4a60; font-size: 11px; font-weight: 700; }
        .agent :global(svg) { color: var(--blue); }
        .agent i { width: 7px; height: 7px; border-radius: 50%; background: #2ab27b; box-shadow: 0 0 0 3px #e4f7f0; }
        .agent-left { left: 2%; }
        .agent-right { right: 2%; }
        .comment { width: 188px; min-height: 55px; padding: 10px; display: flex; align-items: center; gap: 9px; border-radius: 10px; font-size: 10px; }
        .comment div { display: grid; flex: 1; }
        .comment b { color: #344057; }
        .comment small { color: #7a8496; }
        .comment-icon { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 8px; color: var(--blue); background: var(--blue-soft); }
        .comment-left { left: -1%; top: 222px; }
        .comment-left > :global(svg) { color: var(--green); }
        .comment-right { right: -1%; top: 320px; }
        .open-pill { padding: 3px 6px; border-radius: 999px; color: var(--amber); background: var(--amber-soft); font-weight: 700; }
        .human { bottom: 17px; padding: 7px 9px; display: flex; align-items: center; gap: 6px; border-radius: 999px; color: #566176; font-size: 9px; font-weight: 700; }
        .human-left { left: 16%; }
        .human-right { right: 16%; }
        .human :global(svg) { color: var(--green); }
        @media (max-width: 560px) {
          .scene { min-height: 470px; transform: scale(.93); transform-origin: top center; }
          .comment { width: 150px; }
          .comment-left { left: -5%; }
          .comment-right { right: -5%; }
          .agent span { display: none; }
          .document-card { width: 86%; }
          .paper { padding-left: 26px; padding-right: 26px; }
        }
      `}</style>
    </div>
  );
}

