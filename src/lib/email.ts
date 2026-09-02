import type { StoredAgreement } from "@/src/lib/agreements/types";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function sendReviewInvitation(agreement: StoredAgreement, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [agreement.signer.email],
        subject: `${agreement.author.legalName} invited you to review ${agreement.title}`,
        html: `
          <div style="margin:0;padding:40px 20px;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033">
            <div style="max-width:560px;margin:0 auto;padding:36px;background:white;border:1px solid #dfe4ec;border-radius:12px">
              <div style="font-size:18px;font-weight:700;color:#172033">Handshake</div>
              <p style="margin:32px 0 0;font-size:13px;color:#2457d6;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Agreement review</p>
              <h1 style="margin:10px 0 0;font-size:27px;line-height:1.2">${escapeHtml(agreement.author.legalName)} invited you to review an agreement.</h1>
              <p style="margin:18px 0 0;color:#687287;line-height:1.6">Review and redline <strong>${escapeHtml(agreement.title)}</strong>. You can work directly or use a compatible browser agent. No account is required.</p>
              <a href="${escapeHtml(url)}" style="margin-top:27px;padding:13px 18px;display:inline-block;color:white;background:#2457d6;border-radius:8px;text-decoration:none;font-weight:700">Review agreement</a>
              <p style="margin:30px 0 0;color:#8a93a2;font-size:11px;line-height:1.5">This secure link is intended for ${escapeHtml(agreement.signer.email)}. Signing remains a human action.</p>
            </div>
          </div>`,
      }),
    });
    if (!response.ok) console.error("Invitation email failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("Invitation email failed", error);
    return false;
  }
}

export async function sendLoginCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} is your Handshake sign-in code`,
        html: `
          <div style="margin:0;padding:40px 20px;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033">
            <div style="max-width:520px;margin:0 auto;padding:36px;background:white;border:1px solid #dfe4ec;border-radius:12px;text-align:center">
              <div style="font-size:18px;font-weight:700;color:#172033">Handshake</div>
              <p style="margin:30px 0 0;font-size:13px;color:#2457d6;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Author sign in</p>
              <h1 style="margin:12px 0 0;font-size:27px;line-height:1.2">Your one-time sign-in code</h1>
              <div style="margin:26px 0;padding:18px;color:#172033;background:#f5f7fa;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:.22em">${escapeHtml(code)}</div>
              <p style="margin:0;color:#687287;line-height:1.6">Enter this code in Handshake. It expires shortly and can only be used once.</p>
              <p style="margin:24px 0 0;color:#8a93a2;font-size:11px;line-height:1.5">If you did not request this code, you can ignore this email.</p>
            </div>
          </div>`,
      }),
    });
    if (!response.ok) console.error("Login code email failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("Login code email failed", error);
    return false;
  }
}
