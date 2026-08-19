import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SunIcon } from "./icons";

const themes = [
  { id: "light", label: "Neutral light" },
  { id: "dark", label: "Neutral dark" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Muted cool" },
  { id: "contrast", label: "Higher-contrast accent" },
] as const;

type ThemeId = (typeof themes)[number]["id"];

function isTheme(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function selectTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("portfolio-theme", theme);
  window.dispatchEvent(new CustomEvent("portfolio-theme-change", { detail: theme }));
}

export function ThemeControl() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasPositionedTheme, setHasPositionedTheme] = useState(false);
  const controlRef = useRef<HTMLFieldSetElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);
  const panelId = useId();
  const selectedTheme = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("portfolio-theme-change", onStoreChange);
      return () => window.removeEventListener("portfolio-theme-change", onStoreChange);
    },
    () => {
      const documentTheme = document.documentElement.dataset.theme;
      return isTheme(documentTheme ?? null) ? documentTheme : "light";
    },
    () => "light",
  );
  const selectedIndex = themes.findIndex((theme) => theme.id === selectedTheme);
  const visualIndex = hasPositionedTheme ? selectedIndex : 0;
  const selectedLabel = themes[selectedIndex]?.label ?? themes[0].label;
  const visualLabel = themes[visualIndex]?.label ?? themes[0].label;
  const progress = `${(visualIndex / (themes.length - 1)) * 100}%`;
  const thumbOffset = `${visualIndex * 1.875}rem`;
  const themeStyles = {
    "--theme-progress": progress,
    "--theme-thumb-offset": thumbOffset,
  } as CSSProperties;

  useEffect(() => {
    if (!isExpanded) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) setIsExpanded(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const keyTargets: Partial<Record<string, number>> = {
      Home: 0,
      End: themes.length - 1,
      ArrowLeft: Math.max(0, visualIndex - 1),
      ArrowDown: Math.max(0, visualIndex - 1),
      ArrowRight: Math.min(themes.length - 1, visualIndex + 1),
      ArrowUp: Math.min(themes.length - 1, visualIndex + 1),
    };
    const targetIndex = keyTargets[event.key];
    if (targetIndex === undefined) return;

    event.preventDefault();
    setHasPositionedTheme(true);
    selectTheme(themes[targetIndex].id);
  };

  const handleBlur = (event: FocusEvent<HTMLFieldSetElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsExpanded(false);
  };

  const selectThemeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const thumbRadius = 20;
    const travel = Math.max(1, rect.height - (thumbRadius * 2));
    const bottomCenter = rect.bottom - thumbRadius;
    const progressFromBottom = Math.min(1, Math.max(0, (bottomCenter - event.clientY) / travel));
    const nextIndex = Math.round(progressFromBottom * (themes.length - 1));
    setHasPositionedTheme(true);
    selectTheme(themes[nextIndex].id);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    inputRef.current?.focus({ preventScroll: true });
    selectThemeFromPointer(event);
  };

  const continueDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) selectThemeFromPointer(event);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    selectThemeFromPointer(event);
    isDraggingRef.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <fieldset
      ref={controlRef}
      className={`theme-control${isExpanded ? " theme-control--expanded" : ""}${isDragging ? " theme-control--dragging" : ""}`}
      onPointerEnter={() => setIsExpanded(true)}
      onPointerLeave={() => {
        if (!isDraggingRef.current) setIsExpanded(false);
      }}
      onFocusCapture={() => setIsExpanded(true)}
      onBlurCapture={handleBlur}
      style={themeStyles}
    >
      <legend className="visually-hidden">Theme</legend>
      <button
        className="theme-control__toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        aria-label={`Open theme selector. Current theme: ${selectedLabel}`}
        onClick={() => setIsExpanded(true)}
      >
        <SunIcon />
      </button>
      <div
        className="theme-slider-panel"
        id={panelId}
        onPointerDown={beginDrag}
        onPointerMove={continueDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span className="theme-slider-panel__ticks" aria-hidden="true">
          {themes.map((theme, index) => <i className={index === visualIndex ? "is-active" : undefined} key={theme.id} />)}
        </span>
        <span className="theme-slider-panel__thumb-icon" aria-hidden="true">
          <SunIcon />
        </span>
        <label title={`${visualLabel} theme`}>
          <span className="visually-hidden">Select color theme</span>
          <input
            ref={inputRef}
            type="range"
            min="0"
            max={themes.length - 1}
            step="1"
            value={visualIndex}
            aria-valuetext={visualLabel}
            onChange={(event) => {
              setHasPositionedTheme(true);
              selectTheme(themes[Number(event.currentTarget.value)].id);
            }}
            onKeyDown={handleKeyDown}
          />
        </label>
      </div>
    </fieldset>
  );
}
