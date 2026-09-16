import { svc } from "@/db";

/** Rate limit constants — tunable knobs. POST /api/orders only.
 * Fast scopes (per-visitor 5/min) ride on the CF rate_limit binding;
 * durable windows live in Postgres via rate_hit RPC. */
export const RATE = {
  /** Orders per (cafe, table, visitor) per 30 min window. */
  perTableMax: 15,
  perTableWindowMin: 30,
  /** Orders per cafe per minute, scaled to venue size (10×tables). */
  cafePerMinutePerTable: 10,
};

/**
 * Atomic durable counter. Scopes:
 *  - umbrella: key cafe:{id}:{minute} — 10×table_count per minute
 *  - table:    key table:{id}:{table}:{visitor}:{30min-bucket} — 15 per 30min
 * Returns false when the window budget is exhausted. Fail-open on errors.
 */
export async function rateCheck(
  cafeId: string,
  table: number,
  tableCount: number,
  visitorId: string,
): Promise<boolean> {
  const now = new Date();
  const minuteKey = `cafe:${cafeId}:${now.toISOString().slice(0, 16)}`;
  const bucketStart = new Date(
    Math.floor(now.getTime() / (RATE.perTableWindowMin * 60000)) *
      RATE.perTableWindowMin *
      60000,
  ).toISOString();
  const tableKey = `tbl:${cafeId}:${table}:${visitorId}:${bucketStart}`;

  const [umbrella, perTable] = await Promise.all([
    svc().rpc("rate_hit", { p_key: minuteKey }),
    svc().rpc("rate_hit", { p_key: tableKey }),
  ]);
  if (umbrella.error || perTable.error) {
    console.warn("rate_hit failed", umbrella.error?.message, perTable.error?.message);
    return true;
  }
  const umbrellaMax = Math.max(
    RATE.cafePerMinutePerTable * Math.max(tableCount, 1),
    RATE.cafePerMinutePerTable,
  );
  return Number(umbrella.data) <= umbrellaMax && Number(perTable.data) <= RATE.perTableMax;
}