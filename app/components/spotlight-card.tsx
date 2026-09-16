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
    const syncPointer = (event: PointerEvent) => {
      const grid = gridRef.current;
      if (!grid || event.pointerType === "touch") return;

      grid.style.setProperty("--x", event.clientX.toFixed(2));
      grid.style.setProperty("--y", event.clientY.toFixed(2));
    };

    document.addEventListener("pointermove", syncPointer, { passive: true });
    return () => document.removeEventListener("pointermove", syncPointer);
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
