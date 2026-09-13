"use client";
import { useCallback, useState, type SetStateAction } from "react";
import {
  advanceHistory,
  travelHistory,
  type History,
} from "@/lib/editor-state";
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  });
  const update = useCallback(
    (value: SetStateAction<T>) =>
      setState((s) =>
        advanceHistory(
          s,
          typeof value === "function"
            ? (value as (v: T) => T)(s.present)
            : value,
        ),
      ),
    [],
  );
  const undo = useCallback(() => setState((s) => travelHistory(s, "undo")), []);
  const redo = useCallback(() => setState((s) => travelHistory(s, "redo")), []);
  return {
    value: state.present,
    update,
    undo,
    redo,
    canUndo: !!state.past.length,
    canRedo: !!state.future.length,
  };
}
