import { useSyncExternalStore } from "react";

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

  return (
    <fieldset className="theme-control">
      <legend>Theme</legend>
      <span className="theme-control__count" aria-hidden="true">
        {themes.findIndex((theme) => theme.id === selectedTheme) + 1} / {themes.length}
      </span>
      <div className="theme-control__options">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-swatch theme-swatch--${theme.id}`}
            aria-label={`Use ${theme.label} theme`}
            aria-pressed={selectedTheme === theme.id}
            title={theme.label}
            onClick={() => selectTheme(theme.id)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
