import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { audienceContent } from "~/content/portfolio";
import type { Audience } from "~/content/types";
import { ArrowUpRightIcon } from "./icons";

function headlineLines(headline: string) {
  if (headline.includes("\n")) return headline.split("\n").map((line) => line.trim()).filter(Boolean);
  return headline.match(/[^.!?]+[.!?]?/g)?.map((line) => line.trim()).filter(Boolean) ?? [headline];
}

interface HeadlineLayerProps {
  headline: string;
  incoming?: boolean;
  moving: boolean;
  onFinished?: () => void;
}

function HeadlineLayer({ headline, incoming = false, moving, onFinished }: HeadlineLayerProps) {
  const lines = headlineLines(headline);
  const words = lines.flatMap((line) => line.trim().split(/\s+/));
  let wordIndex = 0;

  const content = lines.map((line, lineIndex) => (
    <Fragment key={`${line}-${lineIndex}`}>
      <span className="reveal-title__line">
        {line.trim().split(/\s+/).map((word, index, lineWords) => {
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
      </span>
      {lineIndex < lines.length - 1 ? " " : null}
    </Fragment>
  ));

  const className = `hero-headline__layer reveal-title hero-headline__layer--${incoming ? "incoming" : "outgoing"}${moving ? " is-moving" : ""}`;

  if (incoming) {
    return <h1 id="hero-heading" className={className} aria-live="polite">{content}</h1>;
  }

  return <div className={className} aria-hidden="true">{content}</div>;
}

export function Hero() {
  const [selectedAudience, setSelectedAudience] = useState<Audience>("anyone");
  const [outgoingAudience, setOutgoingAudience] = useState<Audience | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const frameRef = useRef<number | null>(null);
  const selectedContent = audienceContent.find((item) => item.id === selectedAudience) ?? audienceContent[0];
  const outgoingContent = outgoingAudience
    ? audienceContent.find((item) => item.id === outgoingAudience) ?? null
    : null;

  useEffect(() => {
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
    if (reduceMotion) {
      setOutgoingAudience(null);
      setSelectedAudience(audience);
      setIsMoving(true);
      return;
    }

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    setOutgoingAudience(selectedAudience);
    setIsMoving(false);
    setSelectedAudience(audience);
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
              headline={selectedContent.headline}
              incoming
              moving={isMoving}
              onFinished={() => setOutgoingAudience(null)}
            />
            {outgoingContent ? (
              <HeadlineLayer
                key={`outgoing-${outgoingAudience}`}
                headline={outgoingContent.headline}
                moving={isMoving}
              />
            ) : null}
          </div>
          <div className="hero__details">
            <div className="button-row">
              <Link className="button button--primary" to="/about">
                About me and my work <ArrowUpRightIcon />
              </Link>
              <Link className="button button--secondary" to="/contact">
                Contact me <ArrowUpRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
