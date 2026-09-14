import { configuredAdminIds, verifyAdmin, verifyRequest } from "@/lib/jwt";
import { fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const user = await verifyRequest(request);
    if (!user)
      return Response.json(
        { error: "Devam etmek için giriş yapın." },
        { status: 401 },
      );
    if (!configuredAdminIds())
      return Response.json(
        { error: "Admin erişim listesi henüz iki hesapla yapılandırılmamış." },
        { status: 503 },
      );
    const admin = await verifyAdmin(request);
    if (!admin)
      return Response.json(
        { error: "Bu hesabın admin paneline erişim yetkisi yok." },
        { status: 403 },
      );
    return Response.json({ id: admin.id, email: admin.email });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
