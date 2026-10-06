import { createHmac } from "node:crypto";

import { createSupabaseAdminClient } from "@/src/lib/supabase/server";

type LocalLimit = { count: number; expiresAt: number };
const localLimits = new Map<string, LocalLimit>();

export function requestIp(request: Request) {
  return request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function securityHash(scope: string, value: string) {
  const secret = process.env.SUPABASE_SECRET_KEY || "mutual-assent-local-security";
  return createHmac("sha256", secret).update(`${scope}:${value.trim().toLowerCase()}`).digest("hex");
}

function localRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = localLimits.get(key);
  if (!current || current.expiresAt <= now) {
    localLimits.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: windowSeconds, available: true };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    available: true,
  };
}

export async function consumeRateLimit(scope: string, value: string, limit: number, windowSeconds: number) {
  const keyHash = securityHash(scope, value);
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    if (process.env.NODE_ENV === "production") {
      console.error("Security rate limiter unavailable", "missing_server_config");
      return { allowed: false, retryAfterSeconds: windowSeconds, available: false };
    }
    return localRateLimit(keyHash, limit, windowSeconds);
  }

  const { data, error } = await supabase.rpc("consume_security_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    console.error("Security rate limiter unavailable", error?.code ?? "missing_result");
    return { allowed: false, retryAfterSeconds: windowSeconds, available: false };
  }
  return {
    allowed: Boolean(data[0].allowed),
    retryAfterSeconds: Number(data[0].retry_after_seconds) || windowSeconds,
    available: true,
  };
}

export async function recordSecurityEvent(input: {
  eventType: string;
  agreementId?: string;
  actorRole?: "author" | "signer";
  actorSource?: "human" | "agent";
  userId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;
  const { error } = await supabase.from("security_events").insert({
    event_type: input.eventType,
    agreement_id: input.agreementId,
    actor_role: input.actorRole,
    actor_source: input.actorSource,
    user_id: input.userId,
    ip_hash: input.ipAddress ? securityHash("security-event-ip", input.ipAddress) : null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("Security event could not be recorded", error.code);
}
