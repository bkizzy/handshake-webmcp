import { cookies } from "next/headers";

import { AgreementError, accessTokenMatches, normalizeAgreement } from "./domain";
import {
  saveAgreementToProfile,
  getAgreementById,
} from "./repository";
import type { PartyRole } from "./types";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export function agreementAccessCookieName(id: string) {
  return `handshake_access_${id}`;
}

export async function resolveAgreementAccess(id: string, request: Request) {
  let agreement = await getAgreementById(id);
  if (!agreement) throw new AgreementError("Agreement not found.", "not_found", 404);
  agreement = normalizeAgreement(agreement);
  const storedAgreement = agreement;

  const cookieStore = await cookies();
  const requestToken = new URL(request.url).searchParams.get("token") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const token = bearerToken || requestToken || cookieStore.get(agreementAccessCookieName(id))?.value || "";
  const tokenRole = (Object.keys(storedAgreement.access) as PartyRole[]).find((candidate) =>
    accessTokenMatches(storedAgreement.access[candidate], token),
  );
  const user = await getAuthenticatedUser();
  const profileRole = user
    ? (["author", "signer"] as PartyRole[]).find((candidate) => storedAgreement.profileAccess[candidate] === user.id)
      ?? (storedAgreement.ownerUserId === user.id ? "author" : undefined)
    : undefined;
  const role = tokenRole ?? profileRole;
  if (!role) throw new AgreementError("This link is invalid or has expired.", "invalid_access", 403);

  const partyEmailMatches = user?.email?.toLowerCase() === agreement[role].email.toLowerCase();
  const isAssociated = Boolean(user && (profileRole === role || (role === "author" && agreement.ownerUserId === user.id) || partyEmailMatches));
  if (user && !agreement.profileAccess[role] && isAssociated) {
    agreement = await saveAgreementToProfile(agreement, { id: user.id, email: user.email }, role);
  }

  return {
    agreement,
    role,
    profile: {
      signedIn: isAssociated,
      saved: Boolean(agreement.profileAccess[role]),
      canClaim: !agreement.profileAccess[role],
      role,
      requiredEmail: agreement[role].email,
    },
  };
}
