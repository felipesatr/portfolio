import { useCallback, useEffect, useRef, useState } from "react";

interface BodyFontOption {
  id: string;
  label: string;
  family: string;
  weight: number;
  letterSpacing: string;
  wordSpacing: string;
  source?: { type: "font-face"; url: string; weightRange: string };
  sourceFamily?: string;
  loadFamily?: string;
  opticalSizing?: "auto" | "none";
}

const calSansTextSource = {
  type: "font-face" as const,
  url: "https://cdn.jsdelivr.net/npm/@calcom/cal-sans-ui@1.3.0/dist/fonts/CalSansUI%5Bwght%2CGEOM%5D.woff2",
  weightRange: "300 700",
};

const bodyFontOptions: BodyFontOption[] = [
  {
    id: "default-text",
    label: "Default text (Inter)",
    family: "var(--font-sans)",
    weight: 400,
    letterSpacing: "normal",
    wordSpacing: "normal",
  },
  {
    id: "cal-sans-text",
    label: "Cal Sans Text",
    family: '"Cal Sans Text", var(--font-sans)',
    weight: 400,
    letterSpacing: "normal",
    wordSpacing: "normal",
    source: calSansTextSource,
    sourceFamily: "Cal Sans Text",
    loadFamily: "Cal Sans Text",
    opticalSizing: "auto",
  },
];

const defaultBodyFontId = bodyFontOptions[0].id;
const previewAssetSelector = "style[data-body-font-preview]";
const fontChangeEvent = "portfolio-body-font-change";

function removePreviewAssets(except?: Element) {
  document.querySelectorAll(previewAssetSelector).forEach((asset) => {
    if (asset !== except) asset.remove();
  });
}

function resetBodyFont() {
  const root = document.documentElement;
  if (!root) return;
  root.style.removeProperty("--font-body-preview");
  root.style.removeProperty("--font-body-weight");
  root.style.removeProperty("--font-body-letter-spacing");
  root.style.removeProperty("--font-body-word-spacing");
  root.style.removeProperty("--font-body-optical-sizing");
  delete root.dataset.bodyFontPreview;
  removePreviewAssets();
  window.dispatchEvent(new Event(fontChangeEvent));
}

export function TypographyPreviewControl() {
  const [selectedId, setSelectedId] = useState(defaultBodyFontId);
  const [status, setStatus] = useState("Using default text (Inter)");
  const requestIdRef = useRef(0);

  const selectFont = useCallback(async (id: string) => {
    setSelectedId(id);
    const requestId = ++requestIdRef.current;
    const option = bodyFontOptions.find((font) => font.id === id);
    if (!option) return;

    setStatus(option.source ? `Loading ${option.label}` : `Using ${option.label}`);
    let asset: HTMLStyleElement | undefined;

    if (option.source?.type === "font-face") {
      const style = document.createElement("style");
      style.textContent = `@font-face {
        font-family: "${option.sourceFamily}";
        src: url("${option.source.url}") format("woff2");
        font-style: normal;
        font-weight: ${option.source.weightRange};
        font-display: swap;
      }`;
      asset = style;
      asset.dataset.bodyFontPreview = id;
      document.head.append(asset);
    }

    try {
      if (option.loadFamily) {
        await document.fonts.load(`${option.weight} 1rem "${option.loadFamily}"`);
      }

      if (requestId !== requestIdRef.current) {
        asset?.remove();
        return;
      }

      const root = document.documentElement;
      root.style.setProperty("--font-body-preview", option.family);
      root.style.setProperty("--font-body-weight", String(option.weight));
      root.style.setProperty("--font-body-letter-spacing", option.letterSpacing);
      root.style.setProperty("--font-body-word-spacing", option.wordSpacing);
      root.style.setProperty("--font-body-optical-sizing", option.opticalSizing ?? "auto");
      root.dataset.bodyFontPreview = id;
      removePreviewAssets(asset);
      window.dispatchEvent(new Event(fontChangeEvent));
      setStatus(`${option.label}, weight ${option.weight}`);
    } catch {
      asset?.remove();
      if (requestId !== requestIdRef.current) return;
      setStatus(`${option.label} could not be loaded.`);
    }
  }, []);

  useEffect(() => {
    void selectFont(defaultBodyFontId);
    return () => resetBodyFont();
  }, [selectFont]);

  return (
    <div className="typography-preview-control" data-temporary-control="true">
      <label htmlFor="body-font-preview">Body text test</label>
      <select
        id="body-font-preview"
        value={selectedId}
        onChange={(event) => void selectFont(event.target.value)}
      >
        {bodyFontOptions.map((font) => (
          <option key={font.id} value={font.id}>
            {font.label} · {font.weight}
          </option>
        ))}
      </select>
      <span aria-live="polite">{status}</span>
    </div>
  );
}
