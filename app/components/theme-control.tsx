import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  const controlRef = useRef<HTMLFieldSetElement>(null);
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
  const selectedLabel = themes[selectedIndex]?.label ?? themes[0].label;
  const progress = `${(selectedIndex / (themes.length - 1)) * 100}%`;

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
      ArrowLeft: Math.max(0, selectedIndex - 1),
      ArrowDown: Math.max(0, selectedIndex - 1),
      ArrowRight: Math.min(themes.length - 1, selectedIndex + 1),
      ArrowUp: Math.min(themes.length - 1, selectedIndex + 1),
    };
    const targetIndex = keyTargets[event.key];
    if (targetIndex === undefined) return;

    event.preventDefault();
    selectTheme(themes[targetIndex].id);
  };

  return (
    <fieldset ref={controlRef} className={`theme-control${isExpanded ? " theme-control--expanded" : ""}`}>
      <legend className="visually-hidden">Theme</legend>
      <button
        className="theme-control__toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-controls="theme-slider-panel"
        aria-label={`${isExpanded ? "Close" : "Open"} theme selector. Current theme: ${selectedLabel}`}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        style={{ "--theme-progress": progress } as CSSProperties}
      >
        <span aria-hidden="true" />
      </button>
      <div className="theme-slider-panel" id="theme-slider-panel">
        <span className="theme-slider-panel__ticks" aria-hidden="true">
          {themes.map((theme, index) => <i className={index === selectedIndex ? "is-active" : undefined} key={theme.id} />)}
        </span>
        <label title={`${selectedLabel} theme`}>
          <span className="visually-hidden">Select color theme</span>
          <span className="theme-slider-panel__range">
        <input
          type="range"
          min="0"
          max={themes.length - 1}
          step="1"
          value={selectedIndex}
          aria-valuetext={selectedLabel}
          onChange={(event) => selectTheme(themes[Number(event.currentTarget.value)].id)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          style={{ "--theme-progress": progress } as CSSProperties}
        />
          </span>
        </label>
      </div>
    </fieldset>
  );
}
