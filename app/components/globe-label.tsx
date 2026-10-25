import { useLayoutEffect, useRef, type RefObject } from "react";

export function GlobeLabel({ anchorRef, label, detail = '', accessibleLabel, title, onClick, accent = false }: {
  anchorRef: RefObject<HTMLDivElement | null>; label: string; detail?: string; accessibleLabel?: string;
  title?: string; onClick?: () => void; accent?: boolean;
}) {
  const detailRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (detailRef.current && buttonRef.current) buttonRef.current.style.setProperty("--globe-detail-width", `${detailRef.current.scrollWidth}px`);
    };
    measure();
    void document.fonts.ready.then(measure);
  }, [detail]);
  const content = <><span>{label}</span>{detail && <span className="globe-label__expansion"><span ref={detailRef} className="globe-label__detail"><span aria-hidden="true">•</span><span>{detail}</span></span></span>}</>;
  return <div ref={anchorRef} className="globe-label-anchor" data-no-reveal>
    <button ref={buttonRef} type="button" className={`distance-globe__label${accent ? ` distance-globe__label--picked button${onClick ? ' button--red' : ' distance-globe__label--distance'}` : ''}`} data-globe-removable={onClick ? '' : undefined} data-fluid-cursor-surface={!accent || undefined} data-fluid-cursor-tight data-globe-color-button={accent || undefined} aria-label={accessibleLabel ?? (detail ? `${label}: ${detail}` : label)} title={title} onClick={onClick}>
      {accent ? <span className="liquid-button__surface">{content}</span> : content}
    </button>
  </div>;
}
