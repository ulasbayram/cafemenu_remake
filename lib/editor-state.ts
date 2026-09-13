import type { Item } from "./menu";
export function reorderItems(
  items: Item[],
  source: string,
  target: string,
  kind: "item" | "category",
  position: "before" | "after" = "before",
): Item[] {
  if (kind === "category") {
    const categories = [...new Set(items.map((i) => i.category))];
    if (
      source === target ||
      !categories.includes(source) ||
      !categories.includes(target)
    )
      return items;
    categories.splice(categories.indexOf(source), 1);
    categories.splice(categories.indexOf(target), 0, source);
    return categories.flatMap((c) => items.filter((i) => i.category === c));
  }
  const from = items.find((i) => i.id === source),
    to = items.find((i) => i.id === target);
  if (!from || !to || from.id === to.id) return items;
  const next = items.filter((i) => i.id !== source);
  next.splice(
    next.findIndex((i) => i.id === target) + (position === "after" ? 1 : 0),
    0,
    { ...from, category: to.category },
  );
  return next;
}
export type History<T> = { past: T[]; present: T; future: T[] };
export function advanceHistory<T>(state: History<T>, next: T): History<T> {
  return JSON.stringify(next) === JSON.stringify(state.present)
    ? state
    : {
        past: [...state.past.slice(-59), state.present],
        present: next,
        future: [],
      };
}
export function travelHistory<T>(
  state: History<T>,
  direction: "undo" | "redo",
): History<T> {
  if (direction === "undo")
    return state.past.length
      ? {
          past: state.past.slice(0, -1),
          present: state.past[state.past.length - 1],
          future: [state.present, ...state.future],
        }
      : state;
  return state.future.length
    ? {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      }
    : state;
}
