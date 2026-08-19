import type { CSSProperties } from "react";
import { GridIcon } from "./icons";

const verticalLines = Array.from({ length: 13 }, (_, index) => index);
const horizontalLines = Array.from({ length: 120 }, (_, index) => index);

interface LayoutGridProps {
  isVisible: boolean;
}

export function LayoutGridToggle({ isVisible, onToggle }: LayoutGridProps & { onToggle: () => void }) {
  return (
    <button
      className="rail-circle-control layout-grid-toggle"
      type="button"
      aria-pressed={isVisible}
      onClick={onToggle}
      title={`${isVisible ? "Hide" : "Show"} the responsive layout grid`}
      aria-label={`${isVisible ? "Hide" : "Show"} layout grid`}
    >
      <GridIcon size={18} />
    </button>
  );
}

export function LayoutGridOverlay({ isVisible }: LayoutGridProps) {
  return (
    <div
      className={`layout-grid-overlay${isVisible ? " layout-grid-overlay--visible" : ""}`}
      aria-hidden="true"
    >
        <div className="layout-grid__verticals">
          {verticalLines.map((line) => (
            <i
              className="layout-grid__vertical-line"
              key={`vertical-${line}`}
              style={{ "--grid-line": line } as CSSProperties}
            >
              <span>V{line}</span>
            </i>
          ))}
        </div>

        <i className="layout-grid__rail-boundary"><span>Rail</span></i>
        <i className="layout-grid__content-boundary" />

        <div className="layout-grid__horizontals">
          {horizontalLines.map((line) => (
            <i
              className="layout-grid__horizontal-line"
              key={`horizontal-${line}`}
              style={{ "--grid-line": line } as CSSProperties}
            >
              <span>H{String(line).padStart(2, "0")}</span>
            </i>
          ))}
        </div>
    </div>
  );
}
