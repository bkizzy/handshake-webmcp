import {
  AgreementError,
  accessTokenMatches,
  createAccessGrant,
  createAgreement,
  normalizeAgreement,
} from "./domain";
import type { ActorSource, CreateAgreementInput, PartyRole, StoredAgreement } from "./types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/server";

type AgreementStore = Map<string, StoredAgreement>;

const globalForAgreements = globalThis as typeof globalThis & {
  handshakeAgreements?: AgreementStore;
};

const store = globalForAgreements.handshakeAgreements ?? new Map<string, StoredAgreement>();
globalForAgreements.handshakeAgreements = store;

export type AgreementAccess = {
  agreement: StoredAgreement;
  role: PartyRole;
};

export async function createStoredAgreement(input: CreateAgreementInput, ownerUserId?: string, source: ActorSource = "human") {
  const { token: authorToken, grant } = createAccessGrant();
  const agreement = createAgreement(input, grant, source);
  agreement.ownerUserId = ownerUserId;
  if (ownerUserId) agreement.profileAccess.author = ownerUserId;
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("agreements").insert({
      id: agreement.id,
      owner_user_id: ownerUserId,
      data: agreement,
      created_at: agreement.createdAt,
      updated_at: agreement.updatedAt,
    });
    if (error) throw new AgreementError("The agreement could not be saved.", "persistence_error", 500);
    return { agreement: structuredClone(agreement), authorToken };
  }
  store.set(agreement.id, agreement);
  return { agreement: structuredClone(agreement), authorToken };
}

export async function getAgreementById(id: string) {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase.from("agreements").select("data").eq("id", id).maybeSingle();
    if (error) throw new AgreementError("The agreement could not be loaded.", "persistence_error", 500);
    return data ? normalizeAgreement(data.data as StoredAgreement) : null;
  }
  const agreement = store.get(id);
  return agreement ? normalizeAgreement(agreement) : null;
}

export async function getAgreementByAccess(id: string, token: string): Promise<AgreementAccess> {
  const agreement = await getAgreementById(id);
  if (!agreement) throw new AgreementError("Agreement not found.", "not_found", 404);
  const role = (Object.keys(agreement.access) as PartyRole[]).find((candidate) =>
    accessTokenMatches(agreement.access[candidate], token),
  );
  if (!role) throw new AgreementError("This link is invalid or has expired.", "invalid_access", 403);
  return { agreement: structuredClone(agreement), role };
}

export async function listAgreementsByOwner(ownerUserId: string) {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const queries = await Promise.all([
      supabase.from("agreements").select("data").eq("owner_user_id", ownerUserId),
      supabase.from("agreements").select("data").contains("data", { profileAccess: { author: ownerUserId } }),
      supabase.from("agreements").select("data").contains("data", { profileAccess: { signer: ownerUserId } }),
    ]);
    if (queries.some(({ error }) => error)) {
      throw new AgreementError("Your agreements could not be loaded.", "persistence_error", 500);
    }
    const unique = new Map<string, StoredAgreement>();
    for (const { data } of queries) {
      for (const row of data ?? []) {
        const agreement = normalizeAgreement(row.data as StoredAgreement);
        unique.set(agreement.id, agreement);
      }
    }
    return [...unique.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  return [...store.values()]
    .map(normalizeAgreement)
    .filter((agreement) => agreement.ownerUserId === ownerUserId || Object.values(agreement.profileAccess).includes(ownerUserId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((agreement) => structuredClone(agreement));
}

export async function saveAgreementToProfile(
  current: StoredAgreement,
  user: { id: string; email?: string },
  role: PartyRole,
) {
  const normalized = normalizeAgreement(current);
  if (normalized.profileAccess[role]) return normalized;
  if (!user.email || user.email.toLowerCase() !== normalized[role].email.toLowerCase()) return normalized;
  const agreement = structuredClone(normalized);
  agreement.profileAccess[role] = user.id;
  if (role === "author") agreement.ownerUserId = user.id;
  agreement.updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
  return saveAgreement(agreement, { expectedUpdatedAt: current.updatedAt });
}

export async function saveAgreement(agreement: StoredAgreement, options: { expectedUpdatedAt?: string } = {}) {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    let query = supabase
      .from("agreements")
      .update({
        owner_user_id: agreement.ownerUserId ?? null,
        data: agreement,
        updated_at: agreement.updatedAt,
      })
      .eq("id", agreement.id);
    if (options.expectedUpdatedAt) query = query.eq("updated_at", options.expectedUpdatedAt);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw new AgreementError("The agreement could not be saved.", "persistence_error", 500);
    if (!data && options.expectedUpdatedAt) throw new AgreementError("The agreement changed before this action could be saved. Read the latest state and retry.", "state_changed", 409);
    if (!data) throw new AgreementError("Agreement not found.", "not_found", 404);
    return structuredClone(agreement);
  }
  const stored = store.get(agreement.id);
  if (!stored) throw new AgreementError("Agreement not found.", "not_found", 404);
  if (options.expectedUpdatedAt && stored.updatedAt !== options.expectedUpdatedAt) {
    throw new AgreementError("The agreement changed before this action could be saved. Read the latest state and retry.", "state_changed", 409);
  }
  store.set(agreement.id, structuredClone(agreement));
  return structuredClone(agreement);
}

export function resetAgreementStoreForTests() {
  store.clear();
}
