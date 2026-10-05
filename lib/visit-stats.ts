export type VisitBucket = {
  cafe: string;
  day: string;
  hour: number;
  count: number;
};

export function aggregateVisits(
  rows: { cafe: string; day: string; hour: number }[],
): VisitBucket[] {
  const buckets = new Map<string, VisitBucket>();
  for (const row of rows) {
    const key = `${row.cafe}:${row.day}:${row.hour}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
    else
      buckets.set(key, {
        cafe: row.cafe,
        day: row.day,
        hour: row.hour,
        count: 1,
      });
  }
  return [...buckets.values()];
}

export function istanbulDay(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}
