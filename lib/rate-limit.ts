import { svc } from "@/db";

/** Rate limit constants — tunable knobs. POST /api/orders only. */
export const RATE = {
  /** Orders per (cafe, table, visitor) per 30 min window. */
  perTableMax: 15,
  perTableWindowMin: 30,
  /** Orders per cafe per minute, scaled to venue size (10×tables). */
  cafePerMinutePerTable: 10,
};

/**
 * Umbrella per-cafe-per-minute counter (durable, Postgres RPC; per-table and
 * per-visitor scopes ride on the Cloudflare rate_limit binding instead).
 * Atomic increment; returns false when the window budget is exhausted.
 */
export async function checkUmbrella(
  cafeId: string,
  tableCount: number,
): Promise<boolean> {
  const max = Math.max(
    RATE.cafePerMinutePerTable * Math.max(tableCount, 1),
    RATE.cafePerMinutePerTable,
  );
  const key = `cafe:${cafeId}:${new Date().toISOString().slice(0, 16)}`;
  const { data, error } = await svc().rpc("rate_hit", { p_key: key });
  if (error || data == null) {
    // Fail-open on counter errors: ordering must not die from a metrics bug.
    console.warn("rate_hit failed", error?.message);
    return true;
  }
  return Number(data) <= max;
}