import { svc } from "@/db";
import {
  moduleCatalog,
  grantActive,
  missingAccessTable,
  type ModuleKey,
} from "./access-catalog";
/** Reserved grants do not activate unimplemented modules. */
export async function hasAccountModule(userId: string, module: ModuleKey) {
  if (!moduleCatalog[module].available) return false;
  const { data, error } = await svc()
    .from("account_module_grants")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("module_key", module)
    .maybeSingle();
  if (missingAccessTable(error)) return false;
  if (error) throw error;
  return !!data && grantActive(data);
}
