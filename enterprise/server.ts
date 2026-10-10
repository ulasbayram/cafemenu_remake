import { asUser, svc } from "@/db";
import { missingAccessTable } from "@/lib/grant-status";
import type { EnterpriseGrantRow } from "./registry";
import {
  enterpriseExtensions,
  extensionAssignments,
  extensionAssignment,
  type EnterpriseExtensionKey,
} from "./registry";

async function userAssignments(uid: string): Promise<EnterpriseGrantRow[]> {
  const rows: EnterpriseGrantRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await svc()
      .from("enterprise_assignments")
      .select("user_id, cafe_id, package_key, status, expires_at")
      .eq("user_id", uid)
      .eq("status", "active")
      .order("id")
      .range(offset, offset + 999);
    if (missingAccessTable(error)) return [];
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
export async function enterpriseAssignment(
  key: EnterpriseExtensionKey,
  uid: string,
  jwt: string,
  cafeId?: string,
) {
  const assignment = extensionAssignment(
    key,
    uid,
    cafeId,
    await userAssignments(uid),
  );
  if (!assignment) return null;
  const { data, error } = await asUser(jwt)
    .from("cafes")
    .select("id, name")
    .eq("owner", uid)
    .eq("id", assignment.cafeId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...assignment, cafeName: data.name } : null;
}
export async function visibleEnterpriseExtensions(uid: string, jwt: string) {
  const grants = await userAssignments(uid);
  const entries = (
    Object.keys(enterpriseExtensions) as EnterpriseExtensionKey[]
  ).flatMap((key) => extensionAssignments(key, uid, grants));
  const list = await Promise.all(
    entries.map(async (entry) => {
      const permitted = await enterpriseAssignment(
        entry.extension.key,
        uid,
        jwt,
        entry.cafeId,
      );
      return permitted
        ? {
            key: `${entry.extension.key}:${entry.cafeId}`,
            title: `Paket A · ${permitted.cafeName}`,
            href: `${entry.extension.href}?cafe=${encodeURIComponent(entry.cafeId)}`,
          }
        : null;
    }),
  );
  return list.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
}
