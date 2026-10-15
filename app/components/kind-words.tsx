import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { testimonials } from "~/content/portfolio";
import { publicAsset } from "~/lib/public-asset";
import { ArrowLeftIcon, ArrowRightIcon, NavArrowLeftIcon } from "./icons";
import { RevealTitle } from "./motion-reveal";
import { ENABLE_KIND_WORDS_TEST, type KindWordsView } from "./kind-words-test";

// These remain explicitly unpublished placeholders, not endorsements by the
// people in the demo portraits. The portraits are crops of the supplied video.
const references = testimonials.slice(0, 5).map((item, index) => ({
  ...item,
  name: `Reference ${String(index + 1).padStart(2, "0")}`,
  role: "Colleague reference",
  company: "Pending approval",
  portrait: publicAsset(`images/kind-words-demo/portrait-${index + 1}.webp`),
}));
type Reference = typeof references[number];
const wrap = (index: number, length = references.length) => (index % length + length) % length;

function Portrait({ person, className = "" }: { person: Reference; className?: string }) {
  return <img className={`kw-portrait ${className}`} src={person.portrait} alt="" width={240} height={320} loading="lazy" decoding="async" />;
}

function Attribution({ person, portrait = false }: { person: Reference; portrait?: boolean }) {
  return <div className="kw-author">{portrait && <Portrait person={person} />}<div><strong>{person.name}</strong><span>{person.role} · unpublished</span></div></div>;
}

function Stars({ rating = 5 }: { rating?: number }) {
  return <span className="kw-stars" aria-label={`Sample ${rating} out of 5 star rating`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < rating ? "" : "kw-stars__empty"} aria-hidden="true">★</span>)}</span>;
}

function PreviewLabel() {
  return <span className="kw-preview-label">Layout preview · unpublished references</span>;
}

function Arrows({ onPrevious, onNext }: { onPrevious: () => void; onNext: () => void }) {
  return <div className="kw-arrows"><button type="button" onClick={onPrevious} aria-label="Previous reference"><ArrowLeftIcon size={17} /></button><button type="button" onClick={onNext} aria-label="Next reference"><ArrowRightIcon size={17} /></button></div>;
}

function AvatarTabs({ active, onSelect, count = references.length, ring = false }: { active: number; onSelect: (index: number) => void; count?: number; ring?: boolean }) {
  return <div className={`kw-avatars${ring ? " kw-avatars--ring" : ""}`} role="group" aria-label="Choose a reference">
    {references.slice(0, count).map((person, index) => <button key={person.id} type="button" aria-label={`Read ${person.name}`} aria-pressed={active === index} onClick={() => onSelect(index)}>
      <Portrait person={person} />{ring && active === index && <svg key={index} className="kw-avatar-ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" /></svg>}
    </button>)}
  </div>;
}

function Dots({ active, onSelect, count = references.length }: { active: number; onSelect: (index: number) => void; count?: number }) {
  return <div className="kw-dots" role="group" aria-label="Reference pagination">{Array.from({ length: count }, (_, index) => <button type="button" key={index} aria-label={`Read reference ${index + 1}`} aria-pressed={active === index} onClick={() => onSelect(index)} />)}</div>;
}

// Reserve the largest quote at the final font/width so changing a selection
// never resizes the stage. Only the active quote is exposed to assistive tech.
function QuoteSlot({ active, count = references.length, reveal = false }: { active: number; count?: number; reveal?: boolean }) {
  return <div className="kw-quote-slot">
    {references.slice(0, count).map((person) => <blockquote key={person.id} className="kw-quote-reserve" aria-hidden="true">“{person.quote}”</blockquote>)}
    <blockquote key={`active-${active}`} className={`kw-quote-active${reveal ? " kw-quote-active--reveal" : ""}`} aria-live="polite" aria-atomic="true">
      {reveal ? `“${references[active].quote}”`.split(" ").map((word, index) => <Fragment key={index}><span className="kw-reveal-word" style={{ "--kw-word": index } as CSSProperties}>{word}</span>{" "}</Fragment>) : `“${references[active].quote}”`}
    </blockquote>
  </div>;
}

// Natural content determines height, then rounds up to a half horizontal-grid
// unit. Measurements ignore the animated quote because its reserves set size.
function Frame({ variant, rows, children, expanded = false }: { variant: number; rows: number; children: ReactNode; expanded?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const natural = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = stage.current;
    const content = natural.current;
    if (!element || !content) return;
    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      // Measure a CSS-sized probe so rem/px values and breakpoint changes use
      // exactly the same unit as the visible horizontal grid.
      const probe = element.querySelector<HTMLElement>(".kw-unit-probe");
      const gridRow = probe?.getBoundingClientRect().height || 96;
      const styles = getComputedStyle(element);
      const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const needed = Math.max(rows * gridRow, content.scrollHeight + padding);
      const snapped = Math.ceil((needed - 0.5) / (gridRow / 2)) * (gridRow / 2);
      element.style.setProperty("--kw-block-size", `${snapped}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    observer.observe(element);
    measure();
    void document.fonts.ready.then(schedule);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [rows, expanded]);
  return <div ref={stage} className={`kw-frame kw-frame--${variant}${expanded ? " kw-frame--expanded" : ""}`} style={{ "--kw-rows": rows } as CSSProperties} data-no-reveal>
    <i className="kw-unit-probe" aria-hidden="true" />
    <div ref={natural} className="kw-natural">{children}</div>
  </div>;
}

function CompactCard() {
  const [active, setActive] = useState(0);
  return <Frame variant={1} rows={3}><PreviewLabel /><QuoteSlot active={active} count={3} /><Attribution person={references[active]} /><AvatarTabs active={active} onSelect={setActive} count={3} ring /></Frame>;
}

function InlineQuotes() {
  const [focused, setFocused] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  return <Frame variant={2} rows={5} expanded={expanded}><PreviewLabel />
    <div className={`kw-flow${focused !== null ? " kw-flow--focused" : ""}`} onMouseLeave={() => setFocused(null)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}>
      {references.slice(0, expanded ? 5 : 3).map((person, index) => <Fragment key={person.id}><span role="button" tabIndex={0} className={`kw-flow__item${focused === index ? " is-focused" : ""}`} onMouseEnter={() => setFocused(index)} onFocus={() => setFocused(index)} onClick={() => setFocused(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFocused(index); } }} aria-label={`${person.name}: ${person.quote}`}>
        <Portrait person={person} />{person.quote}<span className="kw-flow__attribution">{person.name}<small>Unpublished</small></span>
      </span>{" "}</Fragment>)}
    </div>
    <button className="kw-show-more" type="button" aria-expanded={expanded} onClick={() => { setExpanded(!expanded); setFocused(null); }}>{expanded ? "Show less" : "Show more"}<NavArrowLeftIcon size={13} /></button>
  </Frame>;
}

function ProgressSlider() {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const paused = userPaused || engaged;
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setActive((current) => wrap(current + 1, 4)), 6500);
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, [paused, active]);
  return <Frame variant={3} rows={4}><div ref={host} className={`kw-progress-content${paused ? " is-paused" : ""}`} onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)} onFocusCapture={() => setEngaged(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false); }}>
    <div className="kw-progress-controls"><PreviewLabel /><Arrows onPrevious={() => setActive(wrap(active - 1, 4))} onNext={() => setActive(wrap(active + 1, 4))} /></div>
    <div className="kw-progress-tracks" role="group" aria-label="Choose a reference">{references.slice(0, 4).map((person, index) => <button key={person.id} type="button" aria-pressed={active === index} aria-label={`Read ${person.name}`} onClick={() => setActive(index)}>{active === index && <span key={active} />}</button>)}</div>
    <QuoteSlot active={active} count={4} reveal /><Attribution person={references[active]} portrait />
    <button type="button" className="kw-playback" onClick={() => setUserPaused(!userPaused)} aria-pressed={userPaused}>{userPaused ? "Resume rotation" : "Pause rotation"}</button>
  </div></Frame>;
}

function PortraitCarousel() {
  const [step, setStep] = useState(0);
  const active = wrap(step);
  return <Frame variant={4} rows={4.5}><PreviewLabel /><div className="kw-portrait-reel" role="group" aria-label="Choose a reference">
    {references.map((person, index) => {
      const offset = wrap(index - active + 2) - 2;
      return <button key={person.id} type="button" style={{ "--kw-offset": offset, "--kw-distance": Math.abs(offset) } as CSSProperties} aria-pressed={active === index} aria-label={`Read ${person.name}`} onClick={() => setStep(step + offset)}><Portrait person={person} /></button>;
    })}
    </div><QuoteSlot active={active} /><Attribution person={references[active]} /><Arrows onPrevious={() => setStep(step - 1)} onNext={() => setStep(step + 1)} />
  </Frame>;
}

function FanCarousel() {
  const [active, setActive] = useState(0);
  return <Frame variant={5} rows={4.5}><div className="kw-fan-controls"><PreviewLabel /><Arrows onPrevious={() => setActive(wrap(active - 1))} onNext={() => setActive(wrap(active + 1))} /></div>
    <div className="kw-fan-window"><div className="kw-fan">
      {references.map((person, index) => {
        const offset = wrap(index - active + 2) - 2;
        return <article key={person.id} className={`kw-fan-card kw-pastel-${index}`} aria-hidden={index !== active} style={{ "--kw-offset": offset, "--kw-distance": Math.abs(offset), zIndex: 5 - Math.abs(offset) } as CSSProperties}>
          <div className="kw-fan-card__header"><span>Reference preview</span><Stars /></div>
          <blockquote>“{person.quote.split(" ").map((word, wordIndex) => <Fragment key={wordIndex}>{wordIndex >= 6 && wordIndex <= 9 ? <mark>{word}</mark> : word}{" "}</Fragment>)}”</blockquote>
          <Attribution person={person} portrait />
        </article>;
      })}
    </div></div><div className="kw-pagination"><span>{String(active + 1).padStart(2, "0")} / 05</span><Dots active={active} onSelect={setActive} /></div>
  </Frame>;
}

function AuthorList() {
  const [active, setActive] = useState(0);
  return <Frame variant={6} rows={5}><div className="kw-editorial-head"><PreviewLabel /><span>{active + 1} / 4</span></div><div className="kw-editorial-columns">
    <QuoteSlot active={active} count={4} reveal />
    <div className="kw-author-list" role="group" aria-label="Choose a reference">{references.slice(0, 4).map((person, index) => <button type="button" key={person.id} aria-pressed={active === index} onClick={() => setActive(index)}>
      <strong>{person.name}</strong><div className="kw-author-list__detail"><div><span>{person.role}</span><small>Pending approval</small></div><Portrait person={person} /></div>
    </button>)}</div>
  </div></Frame>;
}

const reactions = [
  ["Clear communication", "Thoughtful process", "Attention to detail"],
  ["A reliable teammate", "Responsive", "Carefully considered"],
  ["Easy to work with", "From idea to delivery", "Always curious"],
  ["Practical solutions", "A fresh perspective", "Collaborative"],
  ["Quality matters", "Keeps things moving", "Happy to help"],
];
function ReactionMarquee() {
  const [focused, setFocused] = useState(2);
  return <Frame variant={7} rows={4}><PreviewLabel /><div className="kw-reactions" onMouseLeave={() => setFocused(2)}>
    {reactions.map((row, rowIndex) => <div className={`kw-reaction-row${focused === rowIndex ? " is-focused" : ""}`} key={rowIndex} onMouseEnter={() => setFocused(rowIndex)} tabIndex={0} onFocus={() => setFocused(rowIndex)} onBlur={() => setFocused(2)} aria-label={`Sample reactions: ${row.join(", ")}`}>
      <div className="kw-reaction-track">{[0, 1].map((copy) => <div className="kw-reaction-copy" key={copy} aria-hidden={copy === 1}>{[...row, ...row].map((text, index) => <span key={index} className="kw-reaction-pill"><Portrait person={references[wrap(index + rowIndex)]} /><span className="kw-reaction-message">{text}</span><span className="kw-typing" aria-hidden="true"><i /><i /><i /></span></span>)}</div>)}</div>
    </div>)}
  </div></Frame>;
}

function LayeredCards() {
  const [active, setActive] = useState(0);
  return <Frame variant={8} rows={3.5}><PreviewLabel /><div className="kw-stack-window"><div className="kw-stack">
    {references.slice(0, 3).map((person, index) => {
      const offset = wrap(index - active + 1, 3) - 1;
      return <article key={person.id} className="kw-stack-card" aria-hidden={active !== index} style={{ "--kw-offset": offset, "--kw-distance": Math.abs(offset), zIndex: offset === 0 ? 3 : 1 } as CSSProperties}><Stars rating={index === 1 ? 4 : 5} /><blockquote>“{person.quote}”</blockquote><Attribution person={person} portrait /></article>;
    })}
    <Arrows onPrevious={() => setActive(wrap(active - 1, 3))} onNext={() => setActive(wrap(active + 1, 3))} />
  </div></div><Dots active={active} onSelect={setActive} count={3} /></Frame>;
}

function CenteredQuote() {
  const [active, setActive] = useState(0);
  return <Frame variant={9} rows={3}><PreviewLabel /><Stars /><QuoteSlot active={active} count={4} /><Attribution person={references[active]} /><AvatarTabs active={active} onSelect={setActive} count={4} /></Frame>;
}

function ClientList() {
  const [active, setActive] = useState(0);
  const [showPortrait, setShowPortrait] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 80, y: 40, rotation: 0 });
  const position = useRef({ x: 80, y: 40, rotation: 0 });
  useEffect(() => {
    if (!showPortrait) return;
    let frame = 0;
    let lastTime = 0;
    const animate = (time: number) => {
      const factor = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 48) / 85);
      lastTime = time;
      const current = position.current;
      current.x += (target.current.x - current.x) * factor;
      current.y += (target.current.y - current.y) * factor;
      current.rotation += (target.current.rotation - current.rotation) * factor;
      if (photo.current) photo.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) rotate(${current.rotation}deg)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [showPortrait]);
  return <Frame variant={10} rows={4}><div className="kw-client-head"><PreviewLabel /><span>04</span></div><div className="kw-client-columns">
    <div className="kw-client-list" ref={list} onPointerMove={(event) => {
      if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const width = photo.current?.offsetWidth || 90;
      const height = photo.current?.offsetHeight || 120;
      const x = Math.max(12, Math.min(bounds.width - width - 12, event.clientX - bounds.left - width * 0.3));
      const y = Math.max(12, Math.min(bounds.height - height - 12, event.clientY - bounds.top - height * 0.4));
      const rotation = Math.max(-6, Math.min(6, (x - target.current.x) * 0.2));
      target.current = { x, y, rotation };
      setShowPortrait(true);
    }} onPointerLeave={() => setShowPortrait(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowPortrait(false); }}>
      {references.slice(0, 4).map((person, index) => <button key={person.id} type="button" aria-pressed={active === index} onPointerEnter={() => setActive(index)} onClick={() => setActive(index)} onFocus={() => { setActive(index); setShowPortrait(false); }}><span className="kw-client-index">{active === index ? "▪" : String(index + 1).padStart(2, "0")}</span><strong>{person.name}</strong><small>{person.company}</small></button>)}
      <div ref={photo} className={`kw-floating-portrait${showPortrait ? " is-visible" : ""}`} aria-hidden="true"><Portrait person={references[active]} /></div>
    </div><div className="kw-client-quote"><QuoteSlot active={active} count={4} /><i aria-hidden="true" /><Attribution person={references[active]} /></div>
  </div><div className="kw-touch-portrait" aria-hidden="true"><Portrait person={references[active]} /></div></Frame>;
}

const variants = [CompactCard, InlineQuotes, ProgressSlider, PortraitCarousel, FanCarousel, AuthorList, ReactionMarquee, LayeredCards, CenteredQuote, ClientList];

export function KindWordsSections({ view }: { view: KindWordsView }) {
  return <div className="kind-words-sections" id="references">
    {variants.map((Component, index) => {
      const number = index + 1;
      const hidden = ENABLE_KIND_WORDS_TEST && view !== null && view !== number;
      return <section key={number} className="kind-words-section" id={`kind-words-variant-${number}`} hidden={hidden} data-kind-words-variant={number} aria-labelledby={`kind-words-heading-${number}`}>
        <div className="kind-words-intro"><RevealTitle id={`kind-words-heading-${number}`} lines={["Kind words"]} /><span className="kw-variant-label">Layout {String(number).padStart(2, "0")}</span></div>
        {!hidden && <Component />}
      </section>;
    })}
  </div>;
}
