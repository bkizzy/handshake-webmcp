export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const configured = process.env.ADMIN_EMAILS || "";
  return configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}
