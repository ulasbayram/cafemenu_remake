import assert from "node:assert/strict";
import {
  advanceHistory,
  travelHistory,
  reorderItems,
} from "../lib/editor-state.ts";
const items = [
  { id: "a", category: "Coffee" },
  { id: "b", category: "Coffee" },
  { id: "c", category: "Dessert" },
];
const original = { items, logoSize: "medium" };
let history = { past: [], present: original, future: [] };
history = advanceHistory(history, {
  ...original,
  items: reorderItems(items, "a", "c", "item"),
});
assert.deepEqual(
  history.present.items.map((i) => [i.id, i.category]),
  [
    ["b", "Coffee"],
    ["a", "Dessert"],
    ["c", "Dessert"],
  ],
);
history = advanceHistory(history, { ...history.present, logoSize: "large" });
history = advanceHistory(history, {
  ...history.present,
  items: history.present.items.filter((i) => i.id !== "c"),
});
history = travelHistory(history, "undo");
assert.equal(history.present.items.length, 3);
history = travelHistory(history, "undo");
assert.equal(history.present.logoSize, "medium");
history = travelHistory(history, "undo");
assert.deepEqual(history.present, original);
history = travelHistory(history, "redo");
assert.equal(history.present.items[1].category, "Dessert");
history = advanceHistory(history, { ...history.present, logoSize: "small" });
assert.equal(history.future.length, 0);
assert.deepEqual(
  reorderItems(items, "Dessert", "Coffee", "category").map((i) => i.id),
  ["c", "a", "b"],
);
assert.deepEqual(items, original.items);
for (let i = 0; i < 80; i++)
  history = advanceHistory(history, { ...history.present, n: i });
assert.equal(history.past.length, 60);
console.log(
  "PASS: reorder, cross-category move, undo/redo, deletion recovery, logo size, branch reset, history limit",
);
