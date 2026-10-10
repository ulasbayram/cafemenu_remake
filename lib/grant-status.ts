export function grantActive(
  grant: { status: string; expires_at: string | null },
  now = Date.now(),
) {
  return (
    grant.status === "active" &&
    (!grant.expires_at || Date.parse(grant.expires_at) > now)
  );
}
export function missingAccessTable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}
