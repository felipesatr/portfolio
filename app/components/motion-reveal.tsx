import type { CSSProperties, ElementType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

function useRevealOnView() {
  const ref = useRef<HTMLElement>(null);
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

interface RevealTitleProps {
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
  lines: string[];
  live?: "polite" | "assertive";
}

export function RevealTitle({ as = "h2", className, id, lines, live }: RevealTitleProps) {
  const { ref, isRevealed } = useRevealOnView();
  const Heading = as as ElementType;

  return (
    <Heading
      ref={ref}
      id={id}
      className={`${className ? `${className} ` : ""}reveal-title${isRevealed ? " is-revealed" : ""}`}
      aria-live={live}
    >
      {lines.map((line, index) => (
        <span className="reveal-title__line" key={`${line}-${index}`}>
          <span
            className="reveal-title__line-inner"
            style={{ "--reveal-index": index } as CSSProperties}
          >
            {line}
          </span>
        </span>
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
  const { ref, isRevealed } = useRevealOnView();

  return (
    <p
      ref={ref as React.RefObject<HTMLParagraphElement>}
      className={`${className ? `${className} ` : ""}reveal-text${isRevealed ? " is-revealed" : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </p>
  );
}
