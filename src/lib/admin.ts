import type { User } from "@supabase/supabase-js";

import type { AgreementStatus, StoredAgreement } from "./agreements/types";
import { createSupabaseAdminClient } from "./supabase/server";

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const configured = process.env.ADMIN_EMAILS || process.env.CONTACT_EMAIL || "";
  return configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

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

  const [usersResult, agreementsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("agreements").select("id, data, created_at, updated_at").order("created_at", { ascending: false }),
  ]);
  if (usersResult.error) throw new Error("Account reporting could not be loaded.");
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
  const executedCount = agreements.filter((agreement) => agreement.status === "signed").length;

  return {
    accountCount: usersResult.data.total,
    agreementCount: agreements.length,
    executedCount,
    inProgressCount: agreements.filter((agreement) => !["signed", "declined", "voided"].includes(agreement.status)).length,
    invitedCount: agreements.filter((agreement) => agreement.invited).length,
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
