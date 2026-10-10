import { grantActive } from "@/lib/grant-status";
/** Enterprise packages select custom screens, never a shared data scope.
 * Purchased modules such as ERP are managed independently. */
export const enterpriseExtensions = {
  "package-a": {
    key: "package-a",
    title: "Paket A Enterprise Dashboard",
    href: "/enterprise/package-a",
  },
} as const;
export type EnterpriseExtensionKey = keyof typeof enterpriseExtensions;
export type EnterpriseAssignment = {
  extension: (typeof enterpriseExtensions)[EnterpriseExtensionKey];
  userId: string;
  cafeId: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EnterpriseGrantRow = {
  user_id: string;
  cafe_id: string;
  package_key: string;
  status: string;
  expires_at: string | null;
};
export function extensionAssignments(
  key: EnterpriseExtensionKey,
  uid: string,
  entries: EnterpriseGrantRow[],
): EnterpriseAssignment[] {
  const extension = enterpriseExtensions[key],
    seen = new Set<string>();
  return entries
    .filter(
      (entry) =>
        entry.package_key === key &&
        uuid.test(entry.user_id) &&
        uuid.test(entry.cafe_id) &&
        entry.user_id.toLowerCase() === uid.toLowerCase() &&
        grantActive(entry),
    )
    .flatMap((entry) => {
      const cafeId = entry.cafe_id.toLowerCase();
      if (seen.has(cafeId)) return [];
      seen.add(cafeId);
      return [{ extension, userId: uid.toLowerCase(), cafeId }];
    });
}
export function extensionAssignment(
  key: EnterpriseExtensionKey,
  uid: string,
  cafeId: string | undefined,
  entries: EnterpriseGrantRow[],
) {
  const assignments = extensionAssignments(key, uid, entries);
  return cafeId
    ? (assignments.find((entry) => entry.cafeId === cafeId.toLowerCase()) ??
        null)
    : assignments.length === 1
      ? assignments[0]
      : null;
}
