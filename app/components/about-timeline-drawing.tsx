import { useEffect, useId, useRef, useState, type RefObject } from "react";

type Drawing = { width: number; height: number; path: string; dots: { x: number; y: number }[] };

export function AboutTimelineDrawing({ timelineRef }: { timelineRef: RefObject<HTMLDivElement | null> }) {
  const drawingRef = useRef<HTMLSpanElement>(null);
  const fadeId = `timeline-fade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [drawing, setDrawing] = useState<Drawing | null>(null);

  useEffect(() => {
    const timeline = timelineRef.current;
    const surface = drawingRef.current;
    if (!timeline || !surface) return;
    let frame = 0;
    let disposed = false;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const rect = surface.getBoundingClientRect();
      const bounds = timeline.getBoundingClientRect();
      const spine = getComputedStyle(timeline, "::before");
      const x = bounds.left + Number.parseFloat(spine.insetInlineStart) + 1 - rect.left;
      const items = [...timeline.querySelectorAll<HTMLElement>(".about-timeline__column > li")]
        .sort((a, b) => Number(a.dataset.softRevealIndex) - Number(b.dataset.softRevealIndex));
      let lineEnd = 0;
      const dots: Drawing["dots"] = [];
      const branches = items.map((item) => {
        const box = item.getBoundingClientRect();
        const dot = getComputedStyle(item, "::after");
        const branch = getComputedStyle(item, "::before");
        const fromLeft = Number.parseFloat(dot.insetInlineStart);
        const dotX = Number.isFinite(fromLeft)
          ? box.left + fromLeft + 4 - rect.left
          : box.right - Number.parseFloat(dot.insetInlineEnd) - 4 - rect.left;
        const dotY = box.top + Number.parseFloat(dot.insetBlockStart) + 4 - rect.top;
        const startY = box.top + Number.parseFloat(branch.insetBlockStart) - rect.top;
        lineEnd = startY;
        dots.push({ x: dotX, y: dotY });
        return `M${x} ${startY}Q${x} ${dotY} ${dotX} ${dotY}`;
      });
      const next = { width: rect.width, height: bounds.height, path: `M${x} 0V${lineEnd} ${branches.join(" ")}`, dots };
      setDrawing((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(timeline);
    timeline.querySelectorAll(".about-timeline__column > li").forEach((item) => observer.observe(item));
    window.addEventListener("resize", schedule);
    void document.fonts.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [timelineRef]);

  return <span ref={drawingRef} className="about-timeline__drawing" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask aria-hidden="true">
    {drawing && <svg width="100%" height="100%" viewBox={`0 0 ${drawing.width} ${drawing.height}`} fill="none">
      <defs>
        <linearGradient id={`${fadeId}-gradient`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={20}>
          <stop offset={0} stopColor="white" stopOpacity={0} />
          <stop offset={1} stopColor="white" stopOpacity={1} />
        </linearGradient>
        <mask id={fadeId} maskUnits="userSpaceOnUse" x={0} y={0} width={drawing.width} height={drawing.height} style={{ maskType: "alpha" }}>
          <rect width={drawing.width} height={drawing.height} fill={`url(#${fadeId}-gradient)`} stroke="none" />
        </mask>
      </defs>
      <g mask={`url(#${fadeId})`}>
      <path d={drawing.path} className="about-timeline__stroke" fill="none" strokeWidth={2} />
      {drawing.dots.map((dot, index) => <circle key={index} cx={dot.x} cy={dot.y} r={4} className="about-timeline__dot" stroke="none" />)}
      </g>
    </svg>}
  </span>;
}
