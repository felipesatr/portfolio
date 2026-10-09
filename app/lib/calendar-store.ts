import { seedCalendarMonth, validCalendarState, validTasks, type CalendarState, type CalendarTask } from "./calendar";

type CalendarStorage = Pick<Storage, "getItem" | "setItem">;
const visitorKey = "portfolio:calendar:visitor:v1";
const legacyKey = "portfolio:calendar:tasks:v1";
function parseJSON(json: string): unknown {
  try { return JSON.parse(json); } catch { return null; }
}

export function createCalendarTaskStore(storage: CalendarStorage | null, options: { accountId?: string; createId?: () => string; random?: () => number } = {}) {
  let memoryOnly = !storage;
  let userId = options.accountId;
  if (!userId) {
    try { userId = storage?.getItem(visitorKey) || undefined; } catch { memoryOnly = true; }
    if (!userId) {
      userId = (options.createId ?? (() => crypto.randomUUID()))();
      try { storage?.setItem(visitorKey, userId); } catch { memoryOnly = true; }
    }
  }
  const storageKey = `portfolio:calendar:user:${encodeURIComponent(userId)}:v2`;
  let savedJSON: string | null | undefined;
  let state: CalendarState = { tasks: [], seededMonths: [] };

  const persist = (next: CalendarState) => {
    state = next;
    savedJSON = JSON.stringify(next);
    try { storage?.setItem(storageKey, savedJSON); memoryOnly = !storage; } catch { memoryOnly = true; }
  };
  const readState = () => {
    if (memoryOnly || !storage) return state;
    try {
      const json = storage.getItem(storageKey);
      if (json === savedJSON) return state;
      savedJSON = json;
      if (json) {
        state = validCalendarState(parseJSON(json));
      } else {
        // Keep existing handwritten tasks when upgrading the original store.
        const legacy = !options.accountId ? storage.getItem(legacyKey) : null;
        state = { tasks: legacy ? validTasks(parseJSON(legacy)) : [], seededMonths: [] };
        if (legacy) persist(state);
      }
    } catch {
      // Existing session data remains usable if browser storage is unavailable.
      memoryOnly = true;
    }
    return state;
  };
  return {
    readTasks: () => readState().tasks,
    writeTasks: (tasks: CalendarTask[]) => persist({ ...readState(), tasks }),
    ensureMonth: (year: number, month: number, today: Date) => {
      const current = readState();
      const next = seedCalendarMonth(current, year, month, today, options.random);
      if (next === current) return false;
      persist(next);
      return true;
    },
    isMemoryOnly: () => memoryOnly,
  };
}
