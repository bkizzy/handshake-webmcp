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
    const { data, error } = await supabase
      .from("agreements")
      .select("data")
      .eq("owner_user_id", ownerUserId)
      .order("updated_at", { ascending: false });
    if (error) throw new AgreementError("Your agreements could not be loaded.", "persistence_error", 500);
    return (data ?? []).map((row) => normalizeAgreement(row.data as StoredAgreement));
  }
  return [...store.values()]
    .filter((agreement) => agreement.ownerUserId === ownerUserId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((agreement) => structuredClone(agreement));
}

export async function claimAgreementForUser(
  current: StoredAgreement,
  user: { id: string; email?: string },
) {
  if (current.ownerUserId) return current;
  if (!user.email || user.email.toLowerCase() !== current.author.email.toLowerCase()) return current;
  const agreement = structuredClone(current);
  agreement.ownerUserId = user.id;
  agreement.updatedAt = new Date().toISOString();
  return saveAgreement(agreement);
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
