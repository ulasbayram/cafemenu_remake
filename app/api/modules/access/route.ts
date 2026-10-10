import { owner, fail } from "@/lib/server";
import { hasAccountModule } from "@/lib/module-access";
export async function GET(request: Request) {
  try {
    const uid = await owner(request);
    return Response.json({ erp: await hasAccountModule(uid, "erp") });
  } catch (error) {
    return fail(error);
  }
}
