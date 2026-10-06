import { NextResponse } from "next/server";
import { z } from "zod";

import { sendContactMessage } from "@/src/lib/email";
import { consumeRateLimit, recordSecurityEvent, requestIp } from "@/src/lib/security";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional().default(""),
});
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Send the contact form as JSON." }, { status: 415 });
  }
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the form fields and try again." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const address = requestIp(request);
  const limit = await consumeRateLimit("contact-ip", address, 5, 30 * 60);
  if (!limit.available) return NextResponse.json({ error: "Contact delivery is temporarily unavailable." }, { status: 503 });
  if (!limit.allowed) {
    await recordSecurityEvent({ eventType: "contact.rate_limited", ipAddress: address });
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  if (!process.env.CONTACT_EMAIL || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Contact delivery is not configured yet." }, { status: 503 });
  }
  const sent = await sendContactMessage(parsed.data);
  if (!sent) return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
  await recordSecurityEvent({ eventType: "contact.sent", ipAddress: address });
  return NextResponse.json({ ok: true });
}
