import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function FluidCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    let initialized = false;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let velocityX = 0;
    let velocityY = 0;

    const render = () => {
      velocityX = (velocityX + (targetX - x) * 0.12) * 0.7;
      velocityY = (velocityY + (targetY - y) * 0.12) * 0.7;
      x += velocityX;
      y += velocityY;

      const speed = Math.min(Math.hypot(velocityX, velocityY), 28);
      const stretch = Math.min(speed * 0.018, 0.42);
      const angle = Math.atan2(velocityY, velocityX);
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
      frame = window.requestAnimationFrame(render);
    };

    const showAndFollow = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!initialized) {
        initialized = true;
        x = targetX;
        y = targetY;
        cursor.classList.add("fluid-cursor--visible");
        frame = window.requestAnimationFrame(render);
      }
    };

    const hideOutsideWindow = (event: PointerEvent) => {
      if (event.relatedTarget === null) cursor.classList.remove("fluid-cursor--visible");
    };

    const showInsideWindow = () => {
      if (initialized) cursor.classList.add("fluid-cursor--visible");
    };

    const syncVisibility = () => {
      if (document.hidden) cursor.classList.remove("fluid-cursor--visible");
      else showInsideWindow();
    };

    window.addEventListener("pointermove", showAndFollow, { passive: true });
    document.documentElement.addEventListener("pointerleave", hideOutsideWindow);
    document.documentElement.addEventListener("pointerenter", showInsideWindow);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", showAndFollow);
      document.documentElement.removeEventListener("pointerleave", hideOutsideWindow);
      document.documentElement.removeEventListener("pointerenter", showInsideWindow);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(<div ref={cursorRef} className="fluid-cursor" aria-hidden="true" />, document.body);
}
