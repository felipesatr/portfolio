import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

type SpotlightCardProps = ComponentPropsWithoutRef<"article">;
type SpotlightGridProps = ComponentPropsWithoutRef<"div">;

/* This uses the same fixed viewport variables as the reference component. The
   pointer listener writes CSS properties only, so no React render is needed
   for pointer motion. */
export function SpotlightGrid({
  children,
  className,
  ...props
}: SpotlightGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const updateSpotlight = () => {
      frame = 0;
      grid.style.setProperty("--x", x.toFixed(2));
      grid.style.setProperty("--y", y.toFixed(2));
    };
    const syncPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updateSpotlight);
    };
    const clearSpotlight = () => {
      x = -1000;
      y = -1000;
      if (!frame) frame = window.requestAnimationFrame(updateSpotlight);
    };
    const clearWhenLeavingDocument = (event: PointerEvent) => {
      if (!event.relatedTarget) clearSpotlight();
    };

    // Track the fixed viewport point globally so the border keeps moving away
    // from a card. Reset only when the pointer truly leaves the document.
    window.addEventListener("pointermove", syncPointer, { passive: true });
    document.addEventListener("pointerout", clearWhenLeavingDocument, { passive: true });
    window.addEventListener("blur", clearSpotlight);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", syncPointer);
      document.removeEventListener("pointerout", clearWhenLeavingDocument);
      window.removeEventListener("blur", clearSpotlight);
    };
  }, []);

  return (
    <div
      {...props}
      ref={gridRef}
      className={`spotlight-grid ${className ?? ""}`.trim()}
    >
      {children}
    </div>
  );
}

export function SpotlightCard({
  children,
  className,
  ...props
}: SpotlightCardProps) {
  return (
    <article
      {...props}
      className={`spotlight-card ${className ?? ""}`.trim()}
    >
      <span className="spotlight-card__glow" aria-hidden="true" />
      <span className="spotlight-card__face" aria-hidden="true" />
      {children}
    </article>
  );
}
