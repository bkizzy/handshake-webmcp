import { NextResponse } from "next/server";
import { z } from "zod";

import { sendLoginCode } from "@/src/lib/email";
import { createSupabaseAdminClient } from "@/src/lib/supabase/server";
import { consumeRateLimit, recordSecurityEvent, requestIp } from "@/src/lib/security";

const requestSchema = z.object({ email: z.string().email().max(320) });
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const address = requestIp(request);
  const [emailLimit, ipLimit] = await Promise.all([
    consumeRateLimit("auth-code-email", parsed.data.email, 5, 15 * 60),
    consumeRateLimit("auth-code-ip", address, 20, 15 * 60),
  ]);
  if (!emailLimit.available || !ipLimit.available) {
    return NextResponse.json({ error: "Email sign-in is temporarily unavailable." }, { status: 503 });
  }
  if (!emailLimit.allowed || !ipLimit.allowed) {
    await recordSecurityEvent({ eventType: "auth.code_rate_limited", ipAddress: address });
    return NextResponse.json(
      { error: "Too many sign-in codes requested. Try again later." },
      { status: 429, headers: { "retry-after": String(Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds)) } },
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

  await recordSecurityEvent({ eventType: "auth.code_requested", ipAddress: address });
  return NextResponse.json({ ok: true });
}
