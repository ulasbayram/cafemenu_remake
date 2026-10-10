import { exampleCafe } from "@/lib/menu";
import { istanbulDay } from "@/lib/visit-stats";
import type { PackageAData } from "./types";
export function previewData(scenario: "ortak" | "nova"): PackageAData {
  const now = new Date();
  const nova = scenario === "nova";
  const cafe = {
    ...exampleCafe,
    id: `preview-${scenario}`,
    name: nova ? "Nova Kafe" : "Ortak Kafe",
    slug: `${scenario}-kafe-ornek`,
    location: nova ? "Beşiktaş, İstanbul" : "Kadıköy, İstanbul",
    published: true,
    tableCount: nova ? 8 : 12,
  };
  const visits = Array.from({ length: 7 }, (_, dayIndex) =>
    [9, 12, 15, 18].map((hour, index) => ({
      cafe: cafe.id,
      day: istanbulDay(new Date(now.getTime() - (6 - dayIndex) * 86400000)),
      hour,
      count: 4 + ((dayIndex * 3 + index * 5 + (nova ? 7 : 0)) % 19),
    })),
  ).flat();
  const orders = Array.from({ length: nova ? 6 : 8 }, (_, index) => ({
    id: `preview-${scenario}-${index}`,
    cafe: cafe.id,
    table: (index % cafe.tableCount) + 1,
    total: cafe.items[index % cafe.items.length].price * ((index % 2) + 1),
    items: [
      {
        id: cafe.items[index % cafe.items.length].id,
        name: cafe.items[index % cafe.items.length].name,
        quantity: (index % 2) + 1,
        unitPrice: cafe.items[index % cafe.items.length].price,
      },
    ],
    status:
      index < 2
        ? ("waiting" as const)
        : index === 2
          ? ("delivered" as const)
          : ("completed" as const),
    createdAt: new Date(now.getTime() - index * 35 * 60000).toISOString(),
    updatedAt: new Date(now.getTime() - index * 35 * 60000).toISOString(),
  }));
  return { cafe, visits, orders, today: istanbulDay(now) };
}
