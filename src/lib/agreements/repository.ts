import {
  AgreementError,
  accessTokenMatches,
  createAccessGrant,
  createAgreement,
} from "./domain";
import type { CreateAgreementInput, PartyRole, StoredAgreement } from "./types";
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

export async function createStoredAgreement(input: CreateAgreementInput, ownerUserId?: string) {
  const { token: authorToken, grant } = createAccessGrant();
  const agreement = createAgreement(input, grant);
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
    return data ? (data.data as StoredAgreement) : null;
  }
  const agreement = store.get(id);
  return agreement ? structuredClone(agreement) : null;
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
    return (data ?? []).map((row) => row.data as StoredAgreement);
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

export async function saveAgreement(agreement: StoredAgreement) {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("agreements")
      .update({
        owner_user_id: agreement.ownerUserId ?? null,
        data: agreement,
        updated_at: agreement.updatedAt,
      })
      .eq("id", agreement.id)
      .select("id")
      .maybeSingle();
    if (error) throw new AgreementError("The agreement could not be saved.", "persistence_error", 500);
    if (!data) throw new AgreementError("Agreement not found.", "not_found", 404);
    return structuredClone(agreement);
  }
  if (!store.has(agreement.id)) throw new AgreementError("Agreement not found.", "not_found", 404);
  store.set(agreement.id, structuredClone(agreement));
  return structuredClone(agreement);
}

export function resetAgreementStoreForTests() {
  store.clear();
}
