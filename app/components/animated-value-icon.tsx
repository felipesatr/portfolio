import { useLayoutEffect, useRef, type ElementType } from "react";

// One geometric playhead runs forward and backward: reverse retraces the
// actual strokes and part movements instead of fading or resetting the SVG.
const MOTION = { travel: 860, holdMin: 2600, holdMax: 4400, emptyHold: 140 };
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);

function partWindow(icon: number, part: number): [number, number] {
  const windows: [number, number][][] = [
    [[0, .72], [.22, .9], [.66, .93], [.74, 1]],
    [[.34, 1], [0, .74], [.37, .7], [.43, .76], [.49, .82], [.55, .88]],
    [[.35, .76], [.51, 1], [0, .49], [.08, .57], [.04, .53], [.12, .61]],
    [[0, .57], [.17, .79], [.43, .85], [.58, 1]],
    [[0, .78], [.3, 1], [.5, .8]],
    // Brain: upper lobes first, middle folds next, lower lobes last.
    [[.48, 1], [.4, .92], [.25, .75], [.08, .62], [.18, .68], [0, .56]],
  ];
  return windows[icon]?.[part] ?? [0, 1];
}

export function AnimatedValueIcon({ icon: Icon, index }: { icon: ElementType; index: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const parts = [...element.querySelectorAll<SVGPathElement>("path")]
      .filter((path) => path.getAttribute("stroke") !== "none")
      .map((path, part) => {
        path.removeAttribute("pathLength");
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length} ${length}`;
        path.style.transformOrigin = "12px 12px";
        return { path, length, window: partWindow(index, part), part, fill: path.getAttribute("fill") };
      });
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, disposed = false;
    let timer = 0, frame = 0;

    const paint = (progress: number) => {
      parts.forEach(({ path, length, window: [start, end], part, fill }) => {
        const local = ease(clamp((progress - start) / (end - start)));
        path.style.strokeDashoffset = `${length * (1 - local)}`;
        path.style.visibility = local <= 0 ? "hidden" : "visible";
        if (fill) path.style.fill = local >= .99 ? fill : "none";
        let transform = "none";
        if (index === 1 && part === 0) transform = `rotate(${-38 * (1 - local)}deg)`;
        if (index === 2 && part >= 2) {
          const x = part < 4 ? -1 : 1;
          const y = part === 2 || part === 4 ? -1 : 1;
          transform = `translate(${x * (1 - local)}px, ${y * (1 - local)}px)`;
        }
        if (index === 3 && part >= 2) transform = `translate(${1.2 * (1 - local)}px, 0)`;
        path.style.transform = transform;
      });
      // Cursor paint runs before some icon RAF callbacks. Notify it after the
      // playhead commits so the cutout uses this frame's strokes, even at rest.
      element.dispatchEvent(new Event('portfolio-svg-paint', { bubbles: true }));
    };
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(frame); frame = 0; };
    const canPlay = () => visible && !disposed && !motion.matches && !document.hidden;
    const wait = (callback: () => void, delay: number) => { timer = window.setTimeout(callback, delay); };
    const fullHold = () => {
      element.dataset.iconPhase = "hold";
      paint(1);
      wait(() => travel(-1), MOTION.holdMin + Math.random() * (MOTION.holdMax - MOTION.holdMin));
    };
    const travel = (direction: 1 | -1) => {
      if (!canPlay()) return;
      element.dataset.iconPhase = direction === 1 ? "forward" : "reverse";
      let startTime: number | null = null;
      const tick = (time: number) => {
        if (!canPlay()) return;
        startTime ??= time;
        const elapsed = clamp((time - startTime) / MOTION.travel);
        paint(direction === 1 ? elapsed : 1 - elapsed);
        if (elapsed < 1) { frame = requestAnimationFrame(tick); return; }
        frame = 0;
        if (direction === 1) fullHold();
        else {
          element.dataset.iconPhase = "empty";
          wait(() => travel(1), MOTION.emptyHold);
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const begin = () => {
      stop();
      paint(1);
      if (!canPlay()) { element.dataset.iconPhase = "static"; return; }
      const waitForReveal = () => {
        if (!canPlay()) return;
        const card = element.closest(".soft-reveal-target");
        const style = card ? getComputedStyle(card) : null;
        // The reveal class is applied before its stagger/delayed transition.
        // Wait for the icon's container to actually be painted before drawing.
        if (card && (!card.classList.contains("is-soft-revealed") || Number(style?.opacity) < .999 || (style?.filter !== "none" && style?.filter !== "blur(0px)"))) {
          wait(waitForReveal, 50); return;
        }
        // Entrance shows the complete icon. Keep it visible for a varied beat,
        // then reverse and redraw; never blank it just after the fade finishes.
        element.dataset.iconPhase = "entrance-hold";
        wait(() => travel(-1), 1400 + Math.random() * 1800);
      };
      waitForReveal();
    };
    const observer = new IntersectionObserver(([entry]) => {
      const nextVisible = entry.isIntersecting && entry.intersectionRatio >= .75;
      if (nextVisible === visible) return;
      visible = nextVisible;
      begin();
    }, { threshold: [0, .75] });
    paint(1);
    element.dataset.iconPhase = "static";
    observer.observe(element);
    motion.addEventListener("change", begin);
    document.addEventListener("visibilitychange", begin);
    return () => {
      disposed = true; stop(); observer.disconnect();
      parts.forEach(({ path }) => {
        path.style.removeProperty("stroke-dasharray"); path.style.removeProperty("stroke-dashoffset");
        path.style.removeProperty("transform"); path.style.removeProperty("transform-origin");
        path.style.removeProperty("fill"); path.style.removeProperty("visibility");
      });
      motion.removeEventListener("change", begin);
      document.removeEventListener("visibilitychange", begin);
    };
  }, [Icon, index]);
  return <span ref={ref} className="about-value-icon" aria-hidden="true" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask data-fluid-cursor-animated-mask><Icon size={72} stroke={1.5} /></span>;
}
