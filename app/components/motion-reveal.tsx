import type { CSSProperties, ElementType, ReactNode, RefObject } from "react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function useRevealOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      const frame = window.requestAnimationFrame(() => setIsRevealed(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12%", threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isRevealed };
}

function useRenderedLineIndexes(ref: RefObject<HTMLParagraphElement | null>, content: ReactNode) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof content !== "string") return;

    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;

      const lineTops: number[] = [];
      const words = element.querySelectorAll<HTMLElement>("[data-reveal-word]");
      words.forEach((word) => {
        const top = word.offsetTop;
        let lineIndex = lineTops.findIndex((lineTop) => Math.abs(lineTop - top) < 2);
        if (lineIndex === -1) {
          lineIndex = lineTops.length;
          lineTops.push(top);
        }
        word.style.setProperty("--reveal-line-index", String(lineIndex));
      });
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(element);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [content, ref]);
}

interface RevealTitleProps {
  as?: "h1" | "h2" | "h3";
  autoFit?: boolean;
  className?: string;
  id?: string;
  lines: string[];
  live?: "polite" | "assertive";
  onRevealComplete?: () => void;
}

function useAutoFitTitle(ref: RefObject<HTMLElement | null>, content: string, enabled: boolean) {
  useLayoutEffect(() => {
    const element = ref.current;
    const container = element?.parentElement;
    if (!enabled || !element || !container) return;

    let frame = 0;
    let disposed = false;

    const fit = () => {
      if (disposed) return;
      const availableWidth = Math.max(container.clientWidth, 1);
      const availableHeight = Math.max(container.clientHeight, 1);
      let lower = 28;
      let upper = 128;
      let best = lower;

      while (lower <= upper) {
        const candidate = Math.floor((lower + upper) / 2);
        element.style.setProperty("--reveal-fit-size", `${candidate}px`);
        const fits = element.scrollWidth <= availableWidth + 0.5 && element.scrollHeight <= availableHeight + 0.5;

        if (fits) {
          best = candidate;
          lower = candidate;
        } else {
          upper = candidate;
        }
      }

      element.style.setProperty("--reveal-fit-size", `${best}px`);
    };

    const scheduleFit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fit);
    };

    fit();
    window.addEventListener("resize", scheduleFit);
    window.addEventListener("portfolio-heading-font-change", scheduleFit);
    void document.fonts?.ready.then(scheduleFit);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleFit);
      window.removeEventListener("portfolio-heading-font-change", scheduleFit);
    };
  }, [content, enabled, ref]);
}

export function RevealTitle({ as = "h2", autoFit = false, className, id, lines, live, onRevealComplete }: RevealTitleProps) {
  const { ref, isRevealed } = useRevealOnView<HTMLElement>();
  const hasCompleted = useRef(false);
  const Heading = as as ElementType;
  let wordIndex = 0;
  const totalWords = lines.reduce((count, line) => count + line.trim().split(/\s+/).filter(Boolean).length, 0);
  useAutoFitTitle(ref, lines.join(" "), autoFit);
  const completeReveal = useCallback(() => {
    if (hasCompleted.current) return;
    hasCompleted.current = true;
    onRevealComplete?.();
  }, [onRevealComplete]);

  useEffect(() => {
    if (!isRevealed || !onRevealComplete) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(completeReveal);
      return () => window.cancelAnimationFrame(frame);
    }

    // Let a dependent element take the very next word slot, rather than
    // waiting for the final word's long settling transition to finish.
    const timer = window.setTimeout(completeReveal, totalWords * 42 + 192);
    return () => window.clearTimeout(timer);
  }, [completeReveal, isRevealed, onRevealComplete, totalWords]);

  return (
    <Heading
      ref={ref}
      id={id}
      className={`${className ? `${className} ` : ""}reveal-title${autoFit ? " reveal-title--auto-fit" : ""}${isRevealed ? " is-revealed" : ""}`}
      aria-live={live}
    >
      {lines.map((line, lineIndex) => (
        <Fragment key={`${line}-${lineIndex}`}>
          <span className="reveal-title__line">
            {line.trim().split(/\s+/).map((word, index, words) => {
              const currentWordIndex = wordIndex++;
              return (
                <Fragment key={`${word}-${index}`}>
                  <span className="reveal-title__word-mask">
                    <span
                      className="reveal-title__word-inner"
                      style={{ "--reveal-word-index": currentWordIndex } as CSSProperties}
                    >
                      {word}
                    </span>
                  </span>
                  {index < words.length - 1 ? " " : null}
                </Fragment>
              );
            })}
          </span>
        </Fragment>
      ))}
    </Heading>
  );
}

interface RevealTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function RevealText({ children, className, delay = 0 }: RevealTextProps) {
  const { ref, isRevealed } = useRevealOnView<HTMLParagraphElement>();
  useRenderedLineIndexes(ref, children);
  const words = typeof children === "string" ? children.trim().split(/\s+/) : null;

  return (
    <p
      ref={ref}
      className={`${className ? `${className} ` : ""}reveal-text${isRevealed ? " is-revealed" : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {words ? words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="reveal-text__word" data-reveal-word>{word}</span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      )) : children}
    </p>
  );
}

interface SoftBlurTextProps {
  children: string;
  className?: string;
  delay?: number;
}

/* For body copy inside a parent that already owns a soft reveal. The parent
   resolves first; then this applies the supplied reference's character-level
   fade, blur, and upward settle without changing heading animation. */
export function SoftBlurText({ children, className, delay = 600 }: SoftBlurTextProps) {
  return (
    <p
      className={`${className ? `${className} ` : ""}soft-blur-text`}
      style={{ "--soft-blur-delay": `${delay}ms` } as CSSProperties}
    >
      {Array.from(children).map((character, index) => (
        <span
          key={`${character}-${index}`}
          className="soft-blur-text__character"
          style={{ "--soft-blur-index": index } as CSSProperties}
          aria-hidden="true"
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
      <span className="visually-hidden">{children}</span>
    </p>
  );
}
