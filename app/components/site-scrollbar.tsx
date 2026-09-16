import Lenis from "lenis";
import { useEffect, useRef } from "react";

type DragGeometry = {
  offset: number;
  travel: number;
  limit: number;
};

/**
 * Mirrors the reference architecture: Lenis remains the one scroll source,
 * while this fixed overlay only renders Lenis' real scroll progress.
 */
export function SiteScrollbar() {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const scrollbar = scrollbarRef.current;
    const thumb = thumbRef.current;
    if (!scrollbar || !thumb) return;

    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
    });
    let drag: DragGeometry | null = null;

    const paint = () => {
      const viewport = window.innerHeight;
      const limit = lenis.limit;
      const rootFontSize = Number.parseFloat(getComputedStyle(root).fontSize);
      const squareHeight = Number.parseFloat(getComputedStyle(root).getPropertyValue("--grid-row")) * rootFontSize;
      /* A deliberate portfolio-grid variation on the reference: keep the
         overlay thumb at one-and-a-half squares, while Lenis remains the
         single source of truth for its position. */
      const height = limit > 0 ? Math.min(squareHeight * 1.5, viewport) : viewport;
      const travel = Math.max(viewport - height, 0);
      const top = limit > 0 ? (lenis.scroll / limit) * travel : 0;

      thumb.style.setProperty("--scrollbar-height", `${height}px`);
      thumb.style.setProperty("--scrollbar-top", `${top}px`);
      scrollbar.classList.toggle("site-scrollbar--hidden", limit <= 0);
    };

    const releaseDrag = (event?: PointerEvent) => {
      if (!drag) return;
      if (event && thumb.hasPointerCapture(event.pointerId)) {
        thumb.releasePointerCapture(event.pointerId);
      }
      drag = null;
      scrollbar.classList.remove("site-scrollbar--dragging");
      lenis.start();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      paint();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;
      event.preventDefault();

      const top = Math.min(Math.max(event.clientY - drag.offset, 0), drag.travel);
      /* Paint immediately, then drive Lenis to the matching real scroll
         position. There is no React state or scroll-listener competition in
         this path. */
      thumb.style.setProperty("--scrollbar-top", `${top}px`);
      lenis.scrollTo(drag.travel ? (top / drag.travel) * drag.limit : 0, {
        force: true,
        immediate: true,
      });
    };

    const onPointerUp = (event: PointerEvent) => releaseDrag(event);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || lenis.limit <= 0) return;
      const rect = thumb.getBoundingClientRect();
      const travel = Math.max(window.innerHeight - rect.height, 0);

      drag = {
        offset: event.clientY - rect.top,
        travel,
        limit: lenis.limit,
      };
      thumb.setPointerCapture(event.pointerId);
      scrollbar.classList.add("site-scrollbar--dragging");
      lenis.stop();
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      event.preventDefault();
    };

    root.classList.add("has-scrollbar");
    thumb.addEventListener("pointerdown", onPointerDown);
    lenis.on("scroll", paint);
    window.addEventListener("resize", paint);
    paint();

    return () => {
      releaseDrag();
      root.classList.remove("has-scrollbar");
      thumb.removeEventListener("pointerdown", onPointerDown);
      lenis.off("scroll", paint);
      window.removeEventListener("resize", paint);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="site-scrollbar site-scrollbar--hidden" ref={scrollbarRef} aria-hidden="true">
      <div className="site-scrollbar__track" />
      <div className="site-scrollbar__thumb" ref={thumbRef} />
    </div>
  );
}
