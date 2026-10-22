import { useCallback, useSyncExternalStore } from "react";

const scoreEvent = "portfolio-score-change";
const memoryScores = new Map<string, number>();
const serverScore = () => null;

function readScore(key: string): number | null {
  if (memoryScores.has(key)) return memoryScores.get(key) ?? null;
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return memoryScores.get(key) ?? null;
  }
}

// Primitive snapshots keep SSR stable and refresh scores after hydration,
// across tabs, and between multiple instances of the same game.
export function useStoredScore(key: string, preference: "min" | "max") {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        memoryScores.delete(key);
        notify();
      }
    };
    const onScore = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(scoreEvent, onScore);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(scoreEvent, onScore);
    };
  }, [key]);
  const snapshot = useCallback(() => readScore(key), [key]);
  const score = useSyncExternalStore(subscribe, snapshot, serverScore);
  const record = useCallback((value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const current = readScore(key);
    const next = current === null ? value : preference === "min" ? Math.min(current, value) : Math.max(current, value);
    if (current === next) return;
    try {
      window.localStorage.setItem(key, String(next));
      memoryScores.delete(key);
    } catch {
      memoryScores.set(key, next);
    }
    window.dispatchEvent(new CustomEvent(scoreEvent, { detail: key }));
  }, [key, preference]);
  return [score, record] as const;
}
