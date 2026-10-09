import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
import { Plus, Trash, NavArrowLeft, Check, Xmark, Clock } from "iconoir-react";
import { dateKey, fromDateKey, monthNames, monthWeeks, timeParts, timeFromParts, displayTime, canAddTask, type CalendarTask } from "~/lib/calendar";
import { createCalendarTaskStore } from "~/lib/calendar-store";

const emptyTasks: CalendarTask[] = [];
let taskStore: ReturnType<typeof createCalendarTaskStore> | undefined;
function getTaskStore() {
  if (!taskStore) {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Session-only storage fallback. */ }
    taskStore = createCalendarTaskStore(storage);
  }
  return taskStore;
}
const readTasks = () => getTaskStore().readTasks();
function subscribeTasks(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("portfolio-calendar-tasks", update);
  return () => { window.removeEventListener("storage", update); window.removeEventListener("portfolio-calendar-tasks", update); };
}
function writeTasks(tasks: CalendarTask[]) {
  getTaskStore().writeTasks(tasks);
  window.dispatchEvent(new Event("portfolio-calendar-tasks"));
}
function subscribeDay(update: () => void) {
  const timer = window.setInterval(update, 60_000);
  return () => window.clearInterval(timer);
}
const todaySnapshot = () => dateKey(new Date());
const serverDay = () => "";
const serverTasks = () => emptyTasks;
type Phase = "month" | "collapsing" | "week" | "returning" | "picking" | "picker-closing" | "month-revealing";

const hourValues = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteValues = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const periods = ["AM", "PM"];
function cursorTool(element: HTMLElement, entering: boolean) {
  window.dispatchEvent(new CustomEvent(entering ? "portfolio-stack-tool-enter" : "portfolio-stack-tool-leave", { detail: element }));
}
function Wheel({ label, values, value, onChange, compact = false }: { label: string; values: string[]; value: number; onChange: (value: number) => void; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const destination = useRef<number | null>(null);
  const initial = useRef(value);
  const scrollToValue = (index: number) => {
    destination.current = index;
    ref.current?.scrollTo({ top: index * 36, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initial.current * 36;
  }, []);
  return <div className={`calendar-wheel${compact ? " is-compact" : ""}`} role="listbox" aria-label={label} aria-activedescendant={`calendar-${label}-${value}`} tabIndex={0} data-lenis-prevent ref={ref}
    onWheel={() => { destination.current = null; }} onTouchStart={() => { destination.current = null; }} onScroll={(event) => {
      const index = Math.max(0, Math.min(values.length - 1, Math.round(event.currentTarget.scrollTop / 36)));
      if (destination.current !== null && Math.abs(event.currentTarget.scrollTop - destination.current * 36) > 1) return;
      destination.current = null;
      onChange(index);
    }}
    onKeyDown={(event) => {
      const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(values.length - 1, value + delta));
      onChange(next);
      scrollToValue(next);
    }}>
    {values.map((text, index) => <button key={text} id={`calendar-${label}-${index}`} type="button" role="option" aria-selected={index === value} tabIndex={-1}
      onClick={() => { onChange(index); scrollToValue(index); }}>{text}</button>)}
  </div>;
}

export function LabCalendar() {
  const todayKey = useSyncExternalStore(subscribeDay, todaySnapshot, serverDay);
  const today = fromDateKey(todayKey || "2000-01-01");
  const tasks = useSyncExternalStore(subscribeTasks, readTasks, serverTasks);
  const [month, setMonth] = useState<{ year: number; month: number } | null>(null);
  const year = month?.year ?? today.getFullYear();
  const monthIndex = month?.month ?? today.getMonth();
  const [phase, setPhase] = useState<Phase>("month");
  const [selected, setSelected] = useState<string | null>(null);
  const [draftMonth, setDraftMonth] = useState(0);
  const [draftYear, setDraftYear] = useState(2000);
  const [editor, setEditor] = useState<{ date: string; time: string } | null>(null);
  const [editorClosing, setEditorClosing] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [text, setText] = useState("");
  const [leavingTasks, setLeavingTasks] = useState<Set<string>>(() => new Set());
  const [pickerChanged, setPickerChanged] = useState(false);
  const [pillReveal, setPillReveal] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const root = useRef<HTMLElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const plus = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const agenda = useRef<HTMLDivElement>(null);
  const scrollTrack = useRef<HTMLDivElement>(null);
  const scrollThumb = useRef<HTMLSpanElement>(null);
  const taskRects = useRef(new Map<string, DOMRect>());
  const taskAnimations = useRef(new Map<string, Animation>());
  const removeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const labelAnimations = useRef<Animation[]>([]);
  const labelClones = useRef<HTMLElement[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  const pickerReturn = useRef<Phase>("month");
  const previousOverlay = useRef({ editor: false, phase: "month" as Phase });
  const weeks = monthWeeks(year, monthIndex);
  const selectedRow = Math.max(0, weeks.findIndex((week) => week.some((day) => dateKey(day) === selected)));
  const weekMode = phase === "week";
  const weekToolbar = phase === "collapsing" || phase === "week";
  const pickerVisible = phase === "picking" || phase === "picker-closing";
  const editorOpen = Boolean(editor);
  const overlayOpen = editorOpen || pickerVisible;
  const dayTasks = tasks.filter((task) => task.date === selected);
  const taskDate = weekToolbar ? selected ?? todayKey : todayKey;
  const slotAvailable = !editor || canAddTask(tasks, editor.date, editor.time);
  const years = Array.from({ length: 201 }, (_, index) => String(today.getFullYear() - 100 + index));
  const transition = (next: Phase, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase(next), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : delay);
  };
  useEffect(() => {
    if (todayKey && getTaskStore().ensureMonth(year, monthIndex, fromDateKey(todayKey))) {
      window.dispatchEvent(new Event("portfolio-calendar-tasks"));
    }
  }, [todayKey, year, monthIndex]);
  useEffect(() => () => { clearTimeout(timer.current); removeTimers.current.forEach(clearTimeout); labelAnimations.current.forEach((animation) => animation.cancel()); labelClones.current.forEach((node) => node.remove()); taskAnimations.current.forEach((animation) => animation.cancel()); }, []);
  const syncAgendaScroll = () => {
    const node = agenda.current, track = scrollTrack.current, thumb = scrollThumb.current;
    if (node && track && thumb) {
      const height = track.clientHeight;
      const size = Math.min(height, Math.max(20, height * node.clientHeight / Math.max(1, node.scrollHeight)));
      const offset = node.scrollTop / Math.max(1, node.scrollHeight - node.clientHeight) * (height - size);
      thumb.style.height = `${size}px`;
      thumb.style.transform = `translateY(${offset}px)`;
      thumb.querySelector('svg')?.setAttribute('viewBox', `0 0 6 ${size}`);
      thumb.querySelector('rect')?.setAttribute('height', String(size));
    }
    window.dispatchEvent(new Event("portfolio-calendar-geometry"));
  };
  const flyLabels = useCallback((reverse: boolean, nextYear: number, nextMonth: number) => {
    labelAnimations.current.forEach((animation) => animation.cancel());
    labelClones.current.forEach((node) => node.remove());
    labelAnimations.current = []; labelClones.current = [];
    root.current?.removeAttribute("data-labels-flying");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!reverse) root.current?.setAttribute("data-labels-flying", "");
    const sources = [pill.current?.querySelector<HTMLElement>('[data-calendar-year]'), pill.current?.querySelector<HTMLElement>('[data-calendar-month]')];
    const destinations = [dialog.current?.querySelector<HTMLElement>('[aria-label="year"] [aria-selected="true"]'), dialog.current?.querySelector<HTMLElement>('[aria-label="month"] [aria-selected="true"]')];
    const boxes = sources.map((source) => source?.getBoundingClientRect());
    // New text uses the same pill baseline; measure its actual advance without
    // changing the month grid hidden behind the selector.
    const probe = document.createElement("span");
    probe.style.cssText = "position:fixed;visibility:hidden;white-space:pre";
    probe.style.font = sources[0] ? getComputedStyle(sources[0]).font : "700 1.2rem Figtree";
    probe.textContent = String(nextYear); document.body.append(probe);
    const nextYearWidth = probe.getBoundingClientRect().width;
    probe.textContent = monthNames[nextMonth];
    const nextMonthWidth = probe.getBoundingClientRect().width;
    probe.textContent = " ";
    const spaceWidth = probe.getBoundingClientRect().width; probe.remove();
    if (reverse && pill.current) {
      const style = getComputedStyle(pill.current);
      root.current?.style.setProperty("--calendar-pill-width", `${nextYearWidth + spaceWidth + nextMonthWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)}px`);
    }
    sources.forEach((source, index) => {
      const destination = destinations[index], box = boxes[index];
      if (!source || !destination || !box) return;
      const wheelBox = destination.getBoundingClientRect(), style = getComputedStyle(source);
      const clone = document.createElement("span");
      clone.className = "calendar-flying-label";
      clone.textContent = reverse ? (index ? monthNames[nextMonth] : String(nextYear)) : source.textContent;
      clone.style.font = style.font; clone.style.color = style.color;
      document.body.append(clone);
      const cloneWidth = clone.getBoundingClientRect().width;
      const pillX = index && boxes[0] ? boxes[0].left + nextYearWidth + spaceWidth : box.left;
      const wheelStyle = getComputedStyle(destination);
      const scale = parseFloat(wheelStyle.fontSize) / parseFloat(style.fontSize);
      clone.style.transformOrigin = "top left";
      const wheelX = wheelBox.left + (wheelBox.width - cloneWidth * scale) / 2;
      const frames = [{ transform: `translate(${pillX}px,${box.top}px) scale(1)`, fontWeight: style.fontWeight, opacity: 1 }, { transform: `translate(${wheelX}px,${wheelBox.top + (wheelBox.height - box.height * scale) / 2}px) scale(${scale})`, fontWeight: wheelStyle.fontWeight, opacity: 1 }];
      if (reverse) frames.reverse();
      const animation = clone.animate(frames, { duration: 260, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
      animation.onfinish = () => { clone.remove(); root.current?.removeAttribute("data-labels-flying"); };
      labelAnimations.current.push(animation); labelClones.current.push(clone);
    });
  }, []);
  useLayoutEffect(() => {
    if (phase === "picking") flyLabels(false, year, monthIndex);
  }, [phase, flyLabels, year, monthIndex]);
  useLayoutEffect(() => {
    if (!weekMode || !root.current) {
      taskAnimations.current.forEach((animation) => animation.cancel());
      taskAnimations.current.clear(); taskRects.current.clear(); return;
    }
    const nodes = Array.from(root.current.querySelectorAll<HTMLElement>('[data-calendar-task-id]'));
    const measurements = nodes.map((node) => ({ node, rect: node.getBoundingClientRect(), id: node.dataset.calendarTaskId! }));
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) measurements.forEach(({ node, rect, id }) => {
      const previous = taskRects.current.get(id);
      const animate = (frames: Keyframe[], delay = 0) => {
        taskAnimations.current.get(id)?.cancel();
        const animation = node.animate(frames, { duration: 260, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
        taskAnimations.current.set(id, animation);
        animation.onfinish = () => {
          if (taskAnimations.current.get(id) !== animation) return;
          taskAnimations.current.delete(id); animation.cancel();
          window.dispatchEvent(new Event("portfolio-calendar-geometry"));
        };
      };
      if (previous && Math.abs(previous.width - rect.width) + Math.abs(previous.left - rect.left) > 0.1) {
        animate([{ transform: `translateX(${previous.left - rect.left}px) scaleX(${previous.width / rect.width})` }, { transform: "none" }]);
      } else if (!previous) {
        const sharesExistingHour = measurements.some((item) => item.id !== id && taskRects.current.has(item.id) && Math.abs(item.rect.top - rect.top) < 1);
        // First make room, then reveal the newcomer. Backwards fill hides it
        // during that resize so the two bodies can never overlap.
        animate([{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "none" }], sharesExistingHour ? 260 : 0);
      }
    });
    taskRects.current = new Map(measurements.map(({ id, rect }) => [id, rect]));
  }, [tasks, selected, weekMode]);
  useLayoutEffect(() => {
    if (!overlayOpen) return;
    document.documentElement.classList.add("calendar-overlay-open");
    window.dispatchEvent(new CustomEvent("portfolio-calendar-cursor", { detail: { open: true } }));
    return () => {
      document.documentElement.classList.remove("calendar-overlay-open");
      window.dispatchEvent(new CustomEvent("portfolio-calendar-cursor", { detail: { open: false } }));
    };
  }, [overlayOpen]);
  useLayoutEffect(() => {
    // Translated week rows and internally scrolled hours are not document scrolls.
    const node = root.current;
    const resync = () => window.dispatchEvent(new Event("portfolio-calendar-geometry"));
    node?.addEventListener("transitionend", resync);
    resync();
    return () => node?.removeEventListener("transitionend", resync);
  }, [phase, selected, month]);
  useEffect(() => {
    if (editorOpen) input.current?.focus();
    else if (phase === "picking") dialog.current?.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
    else if (previousOverlay.current.editor) plus.current?.focus({ preventScroll: true });
    else if (previousOverlay.current.phase === "picker-closing") pill.current?.focus({ preventScroll: true });
    previousOverlay.current = { editor: editorOpen, phase };
  }, [editorOpen, phase]);
  useLayoutEffect(() => {
    if (phase === "week" && agenda.current) { agenda.current.scrollTop = Math.max(0, new Date().getHours() - 1) * 44; syncAgendaScroll(); }
  }, [phase]);
  const closeEditor = () => {
    if (editorClosing) return;
    const node = dialog.current;
    const icon = node?.querySelector<SVGElement>(".calendar-editor-close svg");
    // Capture the painted state before changing animation names. A close
    // during expansion must continue from here, not jump to the full popup.
    const clip = node ? getComputedStyle(node, "::before").clipPath : undefined;
    const rotation = icon ? getComputedStyle(icon).transform : undefined;
    if (clip && node) node.style.setProperty("--calendar-editor-close-from", clip);
    if (rotation && node) node.style.setProperty("--calendar-editor-close-rotation", rotation);
    setEditorClosing(true);
  };
  const closePicker = () => {
    const changed = draftYear !== year || draftMonth !== monthIndex;
    setPickerChanged(false);
    if (!changed) flyLabels(true, year, monthIndex);
    setPhase("picker-closing"); clearTimeout(timer.current);
    timer.current = setTimeout(() => { setPillReveal(changed); setPhase(pickerReturn.current); pill.current?.focus({ preventScroll: true }); }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260);
  };
  const openPicker = () => {
    clearTimeout(timer.current);
    const bounds = pill.current?.getBoundingClientRect();
    if (bounds) {
      root.current?.style.setProperty("--calendar-pill-width", `${bounds.width}px`);
      root.current?.style.setProperty("--calendar-pill-height", `${bounds.height}px`);
    }
    pickerReturn.current = phase === "week" ? "week" : "month";
    setPillReveal(false); setPickerChanged(false); setDraftMonth(monthIndex); setDraftYear(year); setPhase("picking");
  };
  const commitMonth = () => {
    const changed = draftYear !== year || draftMonth !== monthIndex;
    setPickerChanged(changed); flyLabels(true, draftYear, draftMonth);
    setPhase("picker-closing");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (changed) setMonth({ year: draftYear, month: draftMonth });
      setSelected(null); setPhase(changed ? "month-revealing" : "month");
      if (changed) transition("month", 360);
      pill.current?.focus({ preventScroll: true });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260);
  };
  const selectDay = (day: Date) => {
    clearTimeout(timer.current);
    const key = dateKey(day);
    if (day.getMonth() !== monthIndex || day.getFullYear() !== year) setMonth({ year: day.getFullYear(), month: day.getMonth() });
    setSelected(key);
    if (phase !== "week") { setPhase("collapsing"); transition("week", 360); }
  };
  const backToMonth = () => { setPhase("returning"); transition("month", 300); pill.current?.focus({ preventScroll: true }); };
  const openEditor = () => {
    const now = new Date();
    if (root.current && plus.current) {
      const buttonBounds = plus.current.getBoundingClientRect();
      const rootBounds = root.current.getBoundingClientRect();
      const paddingTop = parseFloat(getComputedStyle(root.current).paddingTop);
      const offset = buttonBounds.top - rootBounds.top - paddingTop;
      root.current.style.setProperty("--calendar-editor-shift", `${offset}px`);
      root.current.style.setProperty("--calendar-editor-origin-size", `${buttonBounds.height}px`);
    }
    setText(""); setStorageNotice(""); setTimeOpen(false); setEditorClosing(false);
    setEditor({ date: taskDate, time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` });
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !text.trim() || !canAddTask(readTasks(), editor.date, editor.time)) return;
    if (editorClosing) return;
    writeTasks([...readTasks(), { id: crypto.randomUUID(), date: editor.date, text: text.trim(), time: editor.time, done: false }]);
    if (getTaskStore().isMemoryOnly()) setStorageNotice("Saved for this session only.");
    closeEditor();
  };
  const removeTask = (id: string) => {
    if (leavingTasks.has(id)) return;
    // A pending entrance/resize must not compete with the exit animation.
    taskAnimations.current.get(id)?.cancel(); taskAnimations.current.delete(id);
    setLeavingTasks((current) => new Set(current).add(id));
    const remove = () => { writeTasks(readTasks().filter((task) => task.id !== id)); setLeavingTasks((current) => { const next = new Set(current); next.delete(id); return next; }); };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) remove();
    else removeTimers.current.push(setTimeout(remove, 220));
  };
  return <article ref={root} className="lab-preview__placeholder lab-preview__placeholder--5 lab-calendar" aria-label="Interactive calendar"
    data-calendar-phase={phase} data-picker-changed={pickerChanged || undefined} data-pill-reveal={pillReveal || undefined} data-calendar-overlay={editor ? "editor" : pickerVisible ? "picker" : undefined}
    onPointerDown={() => root.current?.removeAttribute("data-calendar-keyboard")} onKeyDown={(event) => {
      if (event.key === "Tab") root.current?.setAttribute("data-calendar-keyboard", "");
      if (event.key === "Escape") { event.stopPropagation(); if (editor) closeEditor(); else if (phase === "picking") closePicker(); else if (phase === "week") backToMonth(); }
      if (event.key === "Tab" && (editor || phase === "picking")) {
        const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), input, [tabindex="0"]') ?? []).filter((node) => !node.closest("[inert]"));
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <div className="calendar-toolbar" inert={editorOpen || pickerVisible}>
      <button ref={pill} type="button" className={`calendar-month-pill${weekToolbar ? " is-week" : ""}`} onClick={weekToolbar ? backToMonth : openPicker} aria-expanded={phase === "picking"} aria-label={weekToolbar ? "Back to month view" : `Choose month and year, ${monthNames[monthIndex]} ${year}`}
        data-fluid-cursor-surface data-fluid-cursor-tight data-fluid-cursor-calendar-fill>
        <NavArrowLeft className="calendar-back-icon" strokeWidth={2.5} aria-hidden="true" /><span className="calendar-pill-copy" onAnimationEnd={() => setPillReveal(false)}><span data-calendar-year>{year}</span>{" "}<span data-calendar-month>{monthNames[monthIndex]}</span></span>
      </button>
      <button ref={plus} className="calendar-add" type="button" aria-label={`Add task for ${taskDate}`} onClick={openEditor} data-fluid-cursor-surface data-fluid-cursor-tight data-fluid-cursor-calendar-fill><Plus strokeWidth={2.5} /></button>
    </div>
    <div className="calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className={index === 0 || index === 6 ? "is-weekend" : undefined} key={index} data-fluid-cursor-negative-mask>{day}</span>)}</div>
    <div className="calendar-body" style={{ "--week-count": weeks.length } as CSSProperties} inert={Boolean(editor || pickerVisible || !["month", "week"].includes(phase))}>
      <div className="calendar-weeks" role="group" aria-label={`${monthNames[monthIndex]} ${year}`}>
        {weeks.map((week, row) => <div key={dateKey(week[0])} className={`calendar-week${row === selectedRow ? " is-selected-week" : ""}${row < selectedRow ? " is-above" : " is-below"}`} style={{ "--week": row } as CSSProperties}
          inert={(phase === "collapsing" || weekMode) && row !== selectedRow}>
          <span className="calendar-week-divider" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask aria-hidden="true"><svg viewBox="0 0 100 1" preserveAspectRatio="none"><path d="M0 .5H100" /></svg></span>
          {week.map((day, column) => {
            const key = dateKey(day), isToday = key === todayKey;
            const daySelected = weekToolbar ? selected === key : isToday;
            return <div className="calendar-day-slot" key={key}><button type="button" className={`calendar-day${isToday ? " is-today" : ""}${day.getMonth() !== monthIndex ? " is-outside" : ""}${weekToolbar && selected === key ? " is-selected" : ""}${column === 0 || column === 6 ? " is-weekend" : ""}`}
              aria-label={day.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} aria-current={isToday ? "date" : undefined} aria-pressed={daySelected}
              data-fluid-cursor-surface={isToday ? "" : undefined} data-fluid-cursor-tight={isToday ? "" : undefined} data-fluid-cursor-theme-fill={isToday ? "" : undefined}
              data-cursor-date={!isToday ? "" : undefined} onClick={() => selectDay(day)}><span>{day.getDate()}</span></button>{tasks.some((task) => task.date === key) ? <span className="calendar-task-dot" aria-label="Has tasks" /> : null}</div>;
          })}
        </div>)}
      </div>
      {weekMode ? <div className="calendar-agenda-frame"><div className="calendar-agenda" ref={agenda} data-lenis-prevent tabIndex={0} aria-label={`Tasks for ${selected}`} onScroll={syncAgendaScroll}>
        <div className="calendar-hours">{Array.from({ length: 24 }, (_, hour) => <div className="calendar-hour" key={hour}><span data-fluid-cursor-negative-mask>{String(hour).padStart(2, "0")}:00</span><span className="calendar-hour-divider" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask aria-hidden="true"><svg viewBox="0 0 100 1" preserveAspectRatio="none"><path d="M0 .5H100" /></svg></span></div>)}
          <div className="calendar-task-layer">{dayTasks.map((task) => {
            const hour = Number(task.time.slice(0, 2));
            const sameSlot = dayTasks.filter((item) => item.time.slice(0, 2) === task.time.slice(0, 2));
            const slot = sameSlot.findIndex((item) => item.id === task.id);
            return <div className={`calendar-task${task.done ? " is-done" : ""}${leavingTasks.has(task.id) ? " is-leaving" : ""}`} key={task.id} data-calendar-task-id={task.id} data-slot-last={slot === sameSlot.length - 1 ? "" : undefined} style={{ top: hour * 44 + 10, left: `${slot * 100 / sameSlot.length}%`, width: `${100 / sameSlot.length}%` }}
              data-cursor-tool data-cursor-compact data-cursor-title="" data-cursor-description={displayTime(task.time)}
              onPointerEnter={(event) => { if (event.pointerType !== "touch") cursorTool(event.currentTarget, true); }} onPointerLeave={(event) => cursorTool(event.currentTarget, false)}>
              <label><span className="calendar-task-check"><input type="checkbox" aria-label={`Complete ${task.text}`} checked={task.done} onChange={() => writeTasks(readTasks().map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /><Check strokeWidth={1.5} aria-hidden="true" /></span><span>{task.text}</span></label>
              <button type="button" className="calendar-task-delete" aria-label={`Delete ${task.text}`} onClick={() => removeTask(task.id)}><Trash /></button>
            </div>;
          })}</div>
        </div>
      </div><div className="calendar-scrollbar" data-lenis-prevent aria-label="Calendar hours scrollbar">
        <button type="button" aria-label="Scroll hours up" onClick={() => agenda.current?.scrollBy({ top: -44, behavior: "smooth" })}><span data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask><svg viewBox="0 0 10 8" aria-hidden="true"><path d="M5 1 9 6.5H1Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></span></button>
        <div ref={scrollTrack} className="calendar-scroll-track" onPointerDown={(event) => {
          const node = agenda.current, track = scrollTrack.current;
          if (!node || !track) return;
          const rect = track.getBoundingClientRect(), ratio = Math.max(1, node.scrollHeight - node.clientHeight) / Math.max(1, rect.height - (scrollThumb.current?.clientHeight ?? 20));
          const startY = event.clientY;
          if (!(event.target instanceof Element) || !event.target.closest('.calendar-scroll-thumb')) node.scrollTop = (startY - rect.top - 10) * ratio;
          const startScroll = node.scrollTop;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.dragY = String(startY); event.currentTarget.dataset.dragScroll = String(startScroll); event.currentTarget.dataset.dragRatio = String(ratio);
        }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId) && agenda.current) agenda.current.scrollTop = Number(event.currentTarget.dataset.dragScroll) + (event.clientY - Number(event.currentTarget.dataset.dragY)) * Number(event.currentTarget.dataset.dragRatio); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          <span ref={scrollThumb} className="calendar-scroll-thumb" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask><svg viewBox="0 0 6 100" preserveAspectRatio="none"><rect width="6" height="100" rx="3" fill="currentColor" /></svg></span>
        </div>
        <button type="button" aria-label="Scroll hours down" onClick={() => agenda.current?.scrollBy({ top: 44, behavior: "smooth" })}><span data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask><svg viewBox="0 0 10 8" aria-hidden="true"><path d="M1 1.5H9L5 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></span></button>
      </div></div> : null}
    </div>
    <span className="visually-hidden" role="status">{storageNotice || (weekMode ? `Week of ${weeks[selectedRow][0].toLocaleDateString()}. Selected ${selected}.` : `${monthNames[monthIndex]} ${year}`)}</span>
    {pickerVisible || editor ? <div className={`calendar-popover-backdrop${!editor ? " is-picker" : ""}`}>
      <div ref={dialog} className={`calendar-popover${editor ? ` calendar-editor${editorClosing ? " is-closing" : ""}${timeOpen ? " is-time-open" : ""}` : " calendar-picker"}`} role="dialog" aria-modal="true" aria-label={editor ? "New task" : "Choose month and year"} data-lenis-prevent
        onAnimationEnd={(event) => {
          // Only the background's completed collapse owns the handoff back
          // to the native button and liquid renderer (not child animations).
          if (editorClosing && event.target === event.currentTarget && event.animationName === "calendar-editor-collapse") {
            setEditor(null); setEditorClosing(false); setTimeOpen(false);
          }
        }}>
        {editor ? <form onSubmit={save}>
          <div className="calendar-editor-header"><label className="calendar-editor-label" htmlFor="calendar-task-text">Task <span>{fromDateKey(editor.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></label><button type="button" className="calendar-editor-close" aria-label="Cancel task" onClick={closeEditor}><Plus strokeWidth={2.5} /></button></div>
          <input id="calendar-task-text" ref={input} placeholder="What would you like to do?" value={text} maxLength={180} required onChange={(event) => setText(event.target.value)} />
          <div className="calendar-editor-footer"><button type="button" className="calendar-time-pill" aria-label={`Task time ${displayTime(editor.time)}`} aria-expanded={timeOpen} onClick={() => setTimeOpen(!timeOpen)}><Clock strokeWidth={1.5} /><span>{displayTime(editor.time)}</span></button><button type="submit" className="calendar-confirm" disabled={!text.trim() || editorClosing || !slotAvailable}><Check strokeWidth={1.5} /> Done</button></div>
          {!slotAvailable ? <span className="visually-hidden" role="status">This hour already has four tasks. Choose another hour.</span> : null}
          <div className="calendar-time-expansion" inert={!timeOpen}><div><div className="calendar-time-wheels">
            <Wheel compact label="hour" values={hourValues} value={timeParts(editor.time).hour} onChange={(hour) => setEditor((value) => value && ({ ...value, time: timeFromParts(hour, timeParts(value.time).minute, timeParts(value.time).period) }))} />
            <Wheel compact label="minute" values={minuteValues} value={timeParts(editor.time).minute} onChange={(minute) => setEditor((value) => value && ({ ...value, time: timeFromParts(timeParts(value.time).hour, minute, timeParts(value.time).period) }))} />
            <Wheel compact label="period" values={periods} value={timeParts(editor.time).period} onChange={(period) => setEditor((value) => value && ({ ...value, time: timeFromParts(timeParts(value.time).hour, timeParts(value.time).minute, period) }))} />
          </div></div></div>
        </form> : <><div className="calendar-picker-wheels"><Wheel label="year" values={years} value={draftYear - today.getFullYear() + 100} onChange={(index) => setDraftYear(today.getFullYear() - 100 + index)} /><Wheel label="month" values={monthNames} value={draftMonth} onChange={setDraftMonth} /></div>
          <div className="calendar-picker-actions"><button type="button" onClick={closePicker} aria-label="Cancel month selection"><Xmark strokeWidth={1.5} /></button><button type="button" disabled={phase === "picker-closing"} onClick={commitMonth} aria-label="Use selected month and year"><Check strokeWidth={1.5} /> Done</button></div></>}
      </div>
    </div> : null}
  </article>;
}
