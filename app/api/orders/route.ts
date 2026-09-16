import { z } from "zod";
import { svc } from "@/db";
import { asUser, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import { verifyTableOrder, dailyCodeFor } from "@/lib/table-order-token";
import { rateCheck } from "@/lib/rate-limit";
import type { Item, OrderPolicy } from "@/lib/menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orderInput = z.object({
  cafe: z.string().regex(UUID),
  table: z.number().int().min(1).max(200),
  token: z.string().min(1).max(100),
  visitor: z.string().min(8).max(64),
  dailyCode: z.string().trim().min(3).max(8).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

function mapOrder(row: Record<string, unknown> & { cafes?: unknown }) {
  const cafe = Array.isArray(row.cafes) ? row.cafes[0] : row.cafes;
  return {
    id: row.id,
    cafeId: row.cafe,
    cafeName:
      cafe && typeof cafe === "object" && "name" in cafe
        ? String(cafe.name)
        : "Kafe",
    tableNo: Number(row.table_no),
    status: row.status,
    items: row.items,
    total: Number(row.total),
    distanceKm: row.distance_km == null ? null : Number(row.distance_km),
    distanceSource: row.distance_source ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    await owner(request);
    const cafe = new URL(request.url).searchParams.get("cafe");
    let query = asUser(userJwt(request))
      .from("orders")
      .select(
        "id, cafe, table_no, status, items, total, distance_km, distance_source, created_at, updated_at, cafes(name)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (cafe && UUID.test(cafe)) query = query.eq("cafe", cafe);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json((data ?? []).map((row) => mapOrder(row)));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const parsed = orderInput.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Sipariş bilgileri geçersiz." },
        { status: 400 },
      );
    const input = parsed.data;
    const client = svc();
    const { data, error } = await client
      .from("cafes")
      .select("id, published, table_count, data")
      .eq("id", input.cafe)
      .limit(1);
    if (error) throw error;
    const cafe = data?.[0];
    if (!cafe || !cafe.published || input.table > Number(cafe.table_count ?? 0))
      return Response.json(
        { error: "Masa siparişe açık değil." },
        { status: 404 },
      );
    const policy: OrderPolicy = {
      enabled: true,
      mode: "token",
      ...(cafe.data as { orderPolicy?: Partial<OrderPolicy> })?.orderPolicy,
    };
    if (!policy.enabled)
      return Response.json(
        { error: "Sipariş şu anda kapalı." },
        { status: 403 },
      );

    // Mode auth: token (default), token+daily, open.
    if (policy.mode !== "open") {
      const tokenOk = await verifyTableOrder(
        input.cafe,
        input.table,
        input.token,
      );
      if (!tokenOk)
        return Response.json(
          { error: "Sipariş yalnızca masa QR kodundan verilebilir." },
          { status: 403 },
        );
    }
    if (policy.mode === "token+daily") {
      const todayCode = await dailyCodeFor(input.cafe);
      const provided = (input.dailyCode ?? "").trim().toUpperCase();
      if (!provided || provided !== todayCode)
        return Response.json(
          { error: "Bugünün sipariş kodu hatalı." },
          { status: 403 },
        );
    }

    // Rate limits: durable Postgres (umbrella cafe-wide + per-table-visitor)
    // plus CF binding for the fast per-visitor scope.
    const workerEnv = (globalThis as unknown as {
      FINCAN_WORKER_ENV?: {
        ORDER_PER_VISITOR?: {
          limit(options: { key: string }): Promise<{ success: boolean }>;
        };
      };
    }).FINCAN_WORKER_ENV;
    const limitsOk = await rateCheck(
      input.cafe,
      input.table,
      Number(cafe.table_count ?? 0),
      input.visitor,
    );
    const visitorOk = workerEnv?.ORDER_PER_VISITOR
      ? (await workerEnv.ORDER_PER_VISITOR.limit({ key: input.visitor }))
          .success
      : true;
    if (!limitsOk || !visitorOk)
      return Response.json(
        { error: "Şu an çok yoğun. Lütfen birazdan tekrar deneyin." },
        { status: 429 },
      );

    // Distance signal: server-computed from device coords (best) or the
    // request's IP (request.cf, Workers only). Only the km number is stored —
    // never coordinates.
    const distance = distanceTo(cafe.data, input.lat, input.lng, request);

    const products = Array.isArray(cafe.data?.items)
      ? (cafe.data.items as Item[])
      : [];
    const requested = new Map(
      input.items.map((item) => [item.id, item.quantity]),
    );
    const lines = products
      .filter((item) => item.available && requested.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: requested.get(item.id)!,
        unitPrice: item.price,
      }));
    if (lines.length !== requested.size)
      return Response.json(
        { error: "Sepette artık satışta olmayan bir ürün var." },
        { status: 409 },
      );
    const total = lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    );
    const { data: created, error: insertError } = await client
      .from("orders")
      .insert({
        cafe: input.cafe,
        table_no: input.table,
        status: "waiting",
        items: lines,
        total,
        ...(distance ? distance : {}),
      })
      .select("id, status, created_at")
      .single();
    if (insertError) throw insertError;
    return Response.json(
      {
        id: created.id,
        status: created.status,
        createdAt: created.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";

/** Haversine km between the cafe's saved coords and the given point. */
function haversineKm(
  cafeLat: number,
  cafeLng: number,
  lat: number,
  lng: number,
): number {
  const R = 6371;
  const dLat = ((lat - cafeLat) * Math.PI) / 180;
  const dLng = ((lng - cafeLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((cafeLat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves the distance signal. Precedence: device GPS (precise) → IP
 * (request.cf, coarse). Returns only { distance_km, distance_source } or
 * null — coordinates are never stored or returned.
 */
function distanceTo(
  cafeData: Record<string, unknown> | null,
  lat?: number,
  lng?: number,
  request?: Request,
): { distance_km: number; distance_source: "gps" | "ip" } | null {
  const cafeLat = (cafeData as { lat?: number })?.lat;
  const cafeLng = (cafeData as { lng?: number })?.lng;
  if (typeof cafeLat !== "number" || typeof cafeLng !== "number") return null;
  if (typeof lat === "number" && typeof lng === "number") {
    return {
      distance_km: Math.round(haversineKm(cafeLat, cafeLng, lat, lng)),
      distance_source: "gps",
    };
  }
  const cf = (request as Request & { cf?: { latitude?: string; longitude?: string } })
    ?.cf;
  if (cf?.latitude && cf?.longitude) {
    const d = haversineKm(
      cafeLat,
      cafeLng,
      Number(cf.latitude),
      Number(cf.longitude),
    );
    if (Number.isFinite(d))
      return { distance_km: Math.round(d), distance_source: "ip" };
  }
  return null;
}
