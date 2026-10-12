import { owner, userJwt, fail } from "@/lib/server";
import { visibleEnterpriseExtensions } from "@/enterprise/server";
import { hasAccountModule } from "@/lib/module-access";

export async function GET(request: Request) {
  try {
    const uid = await owner(request);
    const jwt = userJwt(request);
    const [packages, erp] = await Promise.all([
      visibleEnterpriseExtensions(uid, jwt),
      hasAccountModule(uid, "erp"),
    ]);
    return Response.json({ packages, modules: { erp } });
  } catch (error) {
    return fail(error);
  }
}
