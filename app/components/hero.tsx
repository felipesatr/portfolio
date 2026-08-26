import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { audienceContent } from "~/content/portfolio";
import type { Audience } from "~/content/types";
import { FaceIdIcon, SendDiagonalSolidIcon } from "./icons";

// Reveal wrappers are intentionally metric-neutral. Their only job is to clip
// the animated words; authored line breaks and the heading-fit formula remain
// the layout source of truth.
const wordRevealEnabled = true;

function headlineLines(headline: string, preserveAuthoredLines: boolean) {
  if (preserveAuthoredLines) {
    return headline.split("\n");
  }

  return [headline.replace(/\s+/g, " ").trim()];
}

interface HeadlineLayerProps {
  audience: Audience;
  headline: string;
  format?: "display" | "compact" | "code";
  fixedSize?: number;
  incoming?: boolean;
  moving: boolean;
  onFitSize?: (audience: Audience, size: number) => void;
  onFinished?: () => void;
}

function useHeadlineAutoFit(
  ref: React.RefObject<HTMLElement | null>,
  headline: string,
  format: "display" | "compact" | "code",
  fixedSize?: number,
  onFitSize?: (size: number) => void,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    const container = element?.parentElement;
    if (!element || !container) return;

    if (fixedSize !== undefined) {
      element.style.setProperty("--hero-fit-size", `${fixedSize}px`);
      return;
    }

    let frame = 0;
    let disposed = false;
    const minimum = format === "code" ? 8 : 28;
    const maximum = format === "code" ? 96 : 220;
    const lineHeight = format === "code" ? 1.08 : 1.06;
    const fit = () => {
      if (disposed) return;
      const availableWidth = Math.max(container.clientWidth, 1);
      const availableHeight = Math.max(container.clientHeight, 1);
      // Manual line breaks are the source of truth. This makes each headline
      // fill the same frame through a predictable equation rather than being
      // pushed between different row counts by browser wrapping thresholds.
      const authoredLines = headline.split("\n").length;
      let fittedSize = Math.floor(availableHeight / (Math.max(authoredLines, 1) * lineHeight));
      fittedSize = Math.min(maximum, Math.max(minimum, fittedSize));
      element.style.setProperty("--hero-fit-size", `${fittedSize}px`);

      // On narrow screens an authored line can still wrap. Reduce only then,
      // preserving the exact equation whenever the authored layout fits.
      while (
        fittedSize > minimum &&
        (element.scrollWidth > availableWidth + 0.5 || element.scrollHeight > availableHeight + 0.5)
      ) {
        fittedSize -= 1;
        element.style.setProperty("--hero-fit-size", `${fittedSize}px`);
      }

      onFitSize?.(fittedSize);
    };

    const scheduleFit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fit);
    };

    fit();
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);
    window.addEventListener("portfolio-heading-font-change", scheduleFit);
    void document.fonts?.ready.then(scheduleFit);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("portfolio-heading-font-change", scheduleFit);
    };
  }, [fixedSize, format, headline, onFitSize, ref]);
}

function HeadlineLayer({ audience, headline, format = "display", fixedSize, incoming = false, moving, onFitSize, onFinished }: HeadlineLayerProps) {
  const layerRef = useRef<HTMLHeadingElement | HTMLDivElement>(null);
  const recordFitSize = useCallback((size: number) => onFitSize?.(audience, size), [audience, onFitSize]);
  useHeadlineAutoFit(layerRef, headline, format, fixedSize, recordFitSize);
  const lines = headlineLines(headline, true);
  const words = lines.flatMap((line) => line.trim() ? line.trim().split(/\s+/) : []);
  let wordIndex = 0;

  const animatedContent = lines.map((line, lineIndex) => {
    const trimmedLine = line.trim();
    const lineWords = trimmedLine ? trimmedLine.split(/\s+/) : [];
    const leadingWhitespace = format === "code" ? line.match(/^\s*/)?.[0] ?? "" : "";

    return (
      <Fragment key={`${line}-${lineIndex}`}>
        <span className={`reveal-title__line${lineWords.length === 0 ? " reveal-title__line--blank" : ""}`}>
          {leadingWhitespace ? <span className="hero-code-indent" aria-hidden="true">{leadingWhitespace.replace(/ /g, "\u00a0")}</span> : null}
          {lineWords.map((word, index) => {
          const currentWordIndex = wordIndex++;
          const isLastWord = currentWordIndex === words.length - 1;
          return (
            <Fragment key={`${word}-${index}`}>
              <span className="reveal-title__word-mask">
                <span
                  className="reveal-title__word-inner"
                  data-last-word={isLastWord || undefined}
                  style={{ "--reveal-word-index": currentWordIndex } as CSSProperties}
                  onTransitionEnd={isLastWord ? onFinished : undefined}
                >
                  {word}
                </span>
              </span>
              {index < lineWords.length - 1 ? " " : null}
            </Fragment>
          );
          })}
          {lineWords.length === 0 ? <span aria-hidden="true">&nbsp;</span> : null}
        </span>
      </Fragment>
    );
  });
  const content = wordRevealEnabled ? animatedContent : headline;

  const className = `hero-headline__layer hero-headline__layer--${format} reveal-title hero-title-reveal hero-headline__layer--${incoming ? "incoming" : "outgoing"}${moving ? " is-moving" : ""}`;

  if (incoming) {
    return <h1 ref={layerRef as React.RefObject<HTMLHeadingElement>} id="hero-heading" className={className} aria-live="polite">{content}</h1>;
  }

  return <div ref={layerRef as React.RefObject<HTMLDivElement>} className={className} aria-hidden="true">{content}</div>;
}

export function Hero() {
  const [selectedAudience, setSelectedAudience] = useState<Audience>("anyone");
  const [outgoingAudience, setOutgoingAudience] = useState<Audience | null>(null);
  const [outgoingSize, setOutgoingSize] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const frameRef = useRef<number | null>(null);
  const fittedSizesRef = useRef(new Map<Audience, number>());
  const selectedContent = audienceContent.find((item) => item.id === selectedAudience) ?? audienceContent[0];
  const outgoingContent = outgoingAudience
    ? audienceContent.find((item) => item.id === outgoingAudience) ?? null
    : null;

  useEffect(() => {
    if (!wordRevealEnabled) {
      setIsMoving(true);
      setOutgoingAudience(null);
      setOutgoingSize(null);
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => setIsMoving(true));
    });

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [selectedAudience]);

  const selectAudience = (audience: Audience) => {
    if (audience === selectedAudience) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wordRevealEnabled || reduceMotion) {
      setOutgoingAudience(null);
      setOutgoingSize(null);
      setSelectedAudience(audience);
      setIsMoving(true);
      return;
    }

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    setOutgoingSize(fittedSizesRef.current.get(selectedAudience) ?? null);
    setOutgoingAudience(selectedAudience);
    setIsMoving(false);
    setSelectedAudience(audience);
  };

  const recordFitSize = useCallback((audience: Audience, size: number) => {
    fittedSizesRef.current.set(audience, size);
  }, []);

  const finishAudienceTransition = () => {
    setOutgoingAudience(null);
    setOutgoingSize(null);
  };

  return (
    <section id="hero" className="hero" aria-labelledby="hero-heading">
      <div className="hero__primary">
        <div className="hero__copy">
          <div className="hero-audience" role="group" aria-label="Choose who the introduction is for">
            {audienceContent.map((audience) => (
              <button
                key={audience.id}
                type="button"
                aria-pressed={selectedAudience === audience.id}
                onClick={() => selectAudience(audience.id)}
              >
                {audience.label}
              </button>
            ))}
          </div>
          <div className={`hero-headline${outgoingContent ? " hero-headline--switching" : ""}`}>
            <HeadlineLayer
              key={selectedAudience}
              audience={selectedAudience}
              headline={selectedContent.headline}
              format={selectedContent.format}
              incoming
              moving={isMoving}
              onFitSize={recordFitSize}
              onFinished={finishAudienceTransition}
            />
            {outgoingContent ? (
              <HeadlineLayer
                key={`outgoing-${outgoingAudience}`}
                audience={outgoingAudience!}
                headline={outgoingContent.headline}
                format={outgoingContent.format}
                fixedSize={outgoingSize ?? undefined}
                moving={isMoving}
              />
            ) : null}
          </div>
          <div className="hero__details">
            <div className="button-row">
              <Link className="button button--primary hero-about-button" to="/about">
                <span className="liquid-button__surface">
                  <span>Learn more about</span>
                  <span className="hero-about-button__face" aria-hidden="true"><FaceIdIcon size={18} /></span>
                  <span>me</span>
                </span>
              </Link>
              <Link className="button button--outline hero-contact-button" to="/contact">
                <span className="liquid-button__surface">
                  <span className="liquid-button__label">Let&apos;s talk! <SendDiagonalSolidIcon /></span>
                  <span className="liquid-button__label liquid-button__label--ink" aria-hidden="true">Let&apos;s talk! <SendDiagonalSolidIcon /></span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
