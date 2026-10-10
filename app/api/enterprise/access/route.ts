import { owner, userJwt, fail } from "@/lib/server";
import { visibleEnterpriseExtensions } from "@/enterprise/server";

export async function GET(request: Request) {
  try {
    const uid = await owner(request);
    return Response.json(
      await visibleEnterpriseExtensions(uid, userJwt(request)),
    );
  } catch (error) {
    return fail(error);
  }
}
