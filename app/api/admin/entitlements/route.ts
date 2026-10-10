import { z } from "zod";
import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { sameOrigin, fail } from "@/lib/server";
import { enterpriseExtensions } from "@/enterprise/registry";
import {
  moduleCatalog,
  packageCatalog,
  missingAccessTable,
} from "@/lib/access-catalog";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    kind: z.enum(["enterprise", "module"]),
    key: z.string().min(1).max(80),
    cafeId: z.string().uuid(),
    expiresAt: z.string().datetime({ offset: true }).nullable(),
  }),
  z.object({
    action: z.literal("revoke"),
    kind: z.enum(["enterprise", "module"]),
    id: z.string().uuid(),
  }),
]);
const table = (kind: "enterprise" | "module") =>
  kind === "enterprise" ? "enterprise_assignments" : "account_module_grants";
const map = (row: Record<string, unknown>, kind: "enterprise" | "module") => ({
  id: row.id,
  key: kind === "enterprise" ? row.package_key : row.module_key,
  userId: row.user_id,
  cafeId: kind === "enterprise" ? row.cafe_id : null,
  status: row.status,
  expiresAt: row.expires_at,
  updatedAt: row.updated_at,
});

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    async function read(kind: "enterprise" | "module") {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await svc()
          .from(table(kind))
          .select("*")
          .order("updated_at", { ascending: false })
          .order("id")
          .range(offset, offset + 999);
        if (missingAccessTable(error)) return { configured: false, rows: [] };
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return { configured: true, rows };
    }
    const [packages, modules] = await Promise.all([
      read("enterprise"),
      read("module"),
    ]);
    return Response.json({
      configured: packages.configured && modules.configured,
      packages: packageCatalog,
      modules: Object.values(moduleCatalog),
      enterprise: packages.rows.map((row) => map(row, "enterprise")),
      modulesAssigned: modules.rows.map((row) => map(row, "module")),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin)
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Atama bilgilerini kontrol edin." },
        { status: 400 },
      );
    const input = parsed.data,
      client = svc();
    if (input.action === "revoke") {
      const { data, error } = await client
        .from(table(input.kind))
        .update({ status: "revoked", updated_by: admin.id })
        .eq("id", input.id)
        .select("id")
        .maybeSingle();
      if (missingAccessTable(error))
        return Response.json(
          { error: "Atama tabloları henüz kurulmadı." },
          { status: 503 },
        );
      if (error) throw error;
      if (!data)
        return Response.json({ error: "Atama bulunamadı." }, { status: 404 });
      return Response.json({ ok: true });
    }
    const catalog =
      input.kind === "enterprise" ? enterpriseExtensions : moduleCatalog;
    if (!Object.hasOwn(catalog, input.key))
      return Response.json(
        { error: "Paket veya modül tanınmıyor." },
        { status: 400 },
      );
    if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now())
      return Response.json(
        { error: "Geçerlilik tarihi gelecekte olmalı." },
        { status: 400 },
      );
    // Recipient is resolved from the cafe, never accepted from the browser.
    const { data: cafe, error: readError } = await client
      .from("cafes")
      .select("id, owner")
      .eq("id", input.cafeId)
      .maybeSingle();
    if (readError) throw readError;
    if (!cafe)
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    const { error } = await client
      .from(table(input.kind))
      .upsert(
        {
          user_id: cafe.owner,
          ...(input.kind === "enterprise"
            ? { cafe_id: cafe.id, package_key: input.key }
            : { module_key: input.key }),
          status: "active",
          expires_at: input.expiresAt,
          updated_by: admin.id,
        },
        {
          onConflict:
            input.kind === "enterprise"
              ? "cafe_id,package_key"
              : "user_id,module_key",
        },
      );
    if (missingAccessTable(error))
      return Response.json(
        { error: "Atama tabloları henüz kurulmadı." },
        { status: 503 },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
