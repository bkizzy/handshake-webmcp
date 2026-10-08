import type { User } from "@supabase/supabase-js";

import type { AgreementStatus, StoredAgreement } from "./agreements/types";
import { createSupabaseAdminClient } from "./supabase/server";

export type AdminDashboardData = {
  accountCount: number;
  agreementCount: number;
  executedCount: number;
  inProgressCount: number;
  invitedCount: number;
  recentAccounts: Array<Pick<User, "id" | "email" | "created_at" | "last_sign_in_at">>;
  recentAgreements: Array<{
    id: string;
    title: string;
    status: AgreementStatus;
    createdAt: string;
    updatedAt: string;
  }>;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Admin reporting is not configured.");

  const [usersResult, agreementCountResult, executedCountResult, inProgressCountResult, invitedCountResult, agreementsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("agreements").select("id", { count: "exact", head: true }),
    supabase.from("agreements").select("id", { count: "exact", head: true }).eq("data->>status", "signed"),
    supabase.from("agreements").select("id", { count: "exact", head: true }).not("data->>status", "in", "(signed,declined,voided)"),
    supabase.from("agreements").select("id", { count: "exact", head: true }).not("data->>invitedAt", "is", null),
    supabase.from("agreements").select("id, data, created_at, updated_at").order("created_at", { ascending: false }).limit(10),
  ]);
  if (usersResult.error) throw new Error("Account reporting could not be loaded.");
  if (agreementCountResult.error || executedCountResult.error || inProgressCountResult.error || invitedCountResult.error) {
    throw new Error("Agreement metrics could not be loaded.");
  }
  if (agreementsResult.error) throw new Error("Agreement reporting could not be loaded.");

  const agreements = (agreementsResult.data ?? []).map((row) => {
    const agreement = row.data as StoredAgreement;
    return {
      id: String(row.id),
      title: agreement.title,
      status: agreement.status,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      invited: Boolean(agreement.invitedAt),
    };
  });
  return {
    accountCount: usersResult.data.total,
    agreementCount: agreementCountResult.count ?? 0,
    executedCount: executedCountResult.count ?? 0,
    inProgressCount: inProgressCountResult.count ?? 0,
    invitedCount: invitedCountResult.count ?? 0,
    recentAccounts: [...usersResult.data.users]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 10)
      .map(({ id, email, created_at, last_sign_in_at }) => ({ id, email, created_at, last_sign_in_at })),
    recentAgreements: agreements.slice(0, 10).map((agreement) => ({
      id: agreement.id,
      title: agreement.title,
      status: agreement.status,
      createdAt: agreement.createdAt,
      updatedAt: agreement.updatedAt,
    })),
  };
}
