import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { sendLoginCode } from "@/src/lib/email";
import { createSupabaseAdminClient } from "@/src/lib/supabase/server";

const requestSchema = z.object({ email: z.string().email().max(320) });
const windowMs = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, limit: number) {
  const now = Date.now();
  if (attempts.size > 10_000) {
    for (const [candidate, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(candidate);
    }
    if (attempts.size > 10_000) attempts.clear();
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function fingerprint(value: string) {
  return createHash("sha256").update(value.toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const address = request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const emailLimited = rateLimited(`email:${fingerprint(parsed.data.email)}`, 5);
  const ipLimited = rateLimited(`ip:${fingerprint(address)}`, 20);
  if (emailLimited || ipLimited) {
    return NextResponse.json(
      { error: "Too many sign-in codes requested. Try again later." },
      { status: 429, headers: { "retry-after": String(windowMs / 1000) } },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email sign-in is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.email,
  });
  if (error || !data.properties?.email_otp) {
    console.error("Login code generation failed", error?.name ?? "missing_otp");
    return NextResponse.json({ error: "We could not create a sign-in code. Try again." }, { status: 502 });
  }

  const delivered = await sendLoginCode(parsed.data.email, data.properties.email_otp);
  if (!delivered) return NextResponse.json({ error: "We could not send the sign-in code. Try again." }, { status: 502 });

  return NextResponse.json({ ok: true });
}
