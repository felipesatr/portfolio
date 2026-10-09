export type CalendarTask = { id: string; date: string; text: string; time: string; done: boolean };
export const monthNames = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2000, month, 1)));
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function monthWeeks(year: number, month: number) {
  const first = new Date(year, month, 1, 12);
  const offset = first.getDay();
  const count = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7);
  return Array.from({ length: count }, (_, week) => Array.from({ length: 7 }, (_, day) => new Date(year, month, 1 - offset + week * 7 + day, 12)));
}
export function timeParts(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: (hour + 11) % 12, minute, period: hour >= 12 ? 1 : 0 };
}
export function timeFromParts(hour: number, minute: number, period: number) {
  return `${String((hour + 1) % 12 + period * 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export function displayTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function canAddTask(tasks: CalendarTask[], date: string, time: string) {
  return tasks.filter((task) => task.date === date && task.time.slice(0, 2) === time.slice(0, 2)).length < 4;
}
export function validTasks(value: unknown): CalendarTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter((task): task is CalendarTask => Boolean(task && typeof task.id === "string" &&
    typeof task.text === "string" && task.text.trim() && task.text.length <= 180 &&
    typeof task.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.date) && dateKey(fromDateKey(task.date)) === task.date &&
    typeof task.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(task.time) && typeof task.done === "boolean"));
}

export type CalendarState = { tasks: CalendarTask[]; seededMonths: string[] };
export function calendarMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
const presetTimes: Record<string, string> = {
  "call-mom": "12:00", "buy-groceries": "12:00", birthday: "18:00",
  appointment: "10:00", meeting: "11:00",
};

// Seed only once. A stored month marker survives task deletion and prevents
// refreshing the page from adding a deleted preset again.
export function seedCalendarMonth(state: CalendarState, year: number, month: number, today: Date, random = Math.random): CalendarState {
  const key = calendarMonthKey(year, month);
  const todayKey = dateKey(today);
  if (state.seededMonths.includes(key)) {
    let changed = false;
    const tasks = state.tasks.map((task) => {
      const prefix = `preset:${key}:`;
      if (!task.id.startsWith(prefix)) return task;
      const presetId = task.id.slice(prefix.length);
      const time = Object.hasOwn(presetTimes, presetId) ? presetTimes[presetId] : undefined;
      const moveCall = presetId === "call-mom" && key === todayKey.slice(0, 7) && task.date !== todayKey;
      if ((!time || time === task.time) && !moveCall) return task;
      changed = true;
      // Update previously saved presets without reseeding dates, restoring
      // deleted tasks, or changing a same-day checkbox edit.
      return { ...task, time: time ?? task.time, ...(moveCall ? { date: todayKey, done: false } : {}) };
    });
    return changed ? { ...state, tasks } : state;
  }
  const days = new Date(year, month + 1, 0, 12).getDate();
  // Other browsed months use the equivalent day of the month, clamped for
  // February. In the current month this is the actual local date of first visit.
  const anchor = Math.min(today.getDate(), days);
  const anchorDate = new Date(year, month, anchor, 12);
  const weekStart = anchor - anchorDate.getDay();
  const allDays = Array.from({ length: days }, (_, index) => index + 1);
  const inMeetingWeeks = allDays.filter((day) => day !== anchor && day >= weekStart && day < weekStart + 14);
  let meetingDays = inMeetingWeeks.filter((day) => Math.abs(day - anchor) >= 3);
  if (!meetingDays.length) meetingDays = inMeetingWeeks;
  // A month ending on Sunday has no other in-month date in this/next week.
  // Keep four dates in this month and use the nearest eligible earlier week.
  if (!meetingDays.length) meetingDays = allDays.filter((day) => Math.abs(day - anchor) >= 3);
  const pick = <T,>(items: T[]) => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
  const meeting = pick(meetingDays);

  // Randomize among well-spread arrangements, rather than assigning fixed
  // dates or letting two events accidentally land beside each other.
  const remaining = allDays.filter((day) => day !== anchor && day !== meeting);
  const arrangements: Array<{ days: [number, number]; penalty: number }> = [];
  for (let i = 0; i < remaining.length; i++) for (let j = i + 1; j < remaining.length; j++) {
    const ordered = [anchor, meeting, remaining[i], remaining[j]].sort((a, b) => a - b);
    if ([remaining[i], remaining[j]].some((day) => Math.abs(day - anchor) < 3 || Math.abs(day - meeting) < 3) || remaining[j] - remaining[i] < 3) continue;
    const gaps = [2 * (ordered[0] - 0.5), ...ordered.slice(1).map((day, index) => day - ordered[index]), 2 * (days + 0.5 - ordered[3])];
    const penalty = gaps.reduce((sum, gap) => sum + (gap - days / 4) ** 2, 0);
    arrangements.push({ days: [remaining[i], remaining[j]], penalty });
  }
  const bestPenalty = Math.min(...arrangements.map((item) => item.penalty));
  const pair = pick(arrangements.filter((item) => item.penalty <= bestPenalty + days)).days;
  const [birthday, appointment] = random() < 0.5 ? pair : [pair[1], pair[0]];
  const preset = (id: string, day: number, text: string, time: string): CalendarTask => {
    const date = dateKey(new Date(year, month, day, 12));
    return { id: `preset:${key}:${id}`, date, text, time, done: date < todayKey };
  };
  return {
    tasks: [...state.tasks,
      preset("call-mom", anchor, "Call mom", presetTimes["call-mom"]),
      preset("buy-groceries", anchor, "Buy groceries", presetTimes["buy-groceries"]),
      preset("birthday", birthday, "Friend's birthday", presetTimes.birthday),
      preset("appointment", appointment, "Doc appointment", presetTimes.appointment),
      preset("meeting", meeting, "Team meeting", presetTimes.meeting),
    ],
    seededMonths: [...state.seededMonths, key],
  };
}

export function validCalendarState(value: unknown): CalendarState {
  if (!value || typeof value !== "object") return { tasks: [], seededMonths: [] };
  const record = value as Partial<CalendarState>;
  return {
    tasks: validTasks(record.tasks),
    seededMonths: Array.isArray(record.seededMonths)
      ? [...new Set(record.seededMonths.filter((key): key is string => typeof key === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(key)))] : [],
  };
}
