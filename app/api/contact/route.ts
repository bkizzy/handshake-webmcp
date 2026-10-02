import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendContactMessage } from "@/src/lib/email";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional().default(""),
});
const windowMs = 30 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(value: string) {
  const now = Date.now();
  const key = createHash("sha256").update(value).digest("hex");
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Send the contact form as JSON." }, { status: 415 });
  }
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the form fields and try again." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const address = request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  if (isRateLimited(address)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  if (!process.env.CONTACT_EMAIL || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Contact delivery is not configured yet." }, { status: 503 });
  }
  const sent = await sendContactMessage(parsed.data);
  if (!sent) return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
