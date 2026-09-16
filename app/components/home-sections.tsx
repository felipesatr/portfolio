import { Link } from "react-router";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { experience, testimonials } from "~/content/portfolio";
import { services, type Service } from "~/content/services";
import { ArrowUpRightIcon, CodeIcon, DownloadIcon, InfoCircleIcon, InterfaceIcon, RestartIcon, SparkIcon, StrategyIcon, TrashIcon } from "./icons";
import { RevealTitle, SoftBlurText } from "./motion-reveal";
import { SpotlightCard, SpotlightGrid } from "./spotlight-card";

function ServiceIcon({ service }: { service: Service }) {
  if (service.icon === "code") return <CodeIcon />;
  if (service.icon === "spark") return <SparkIcon />;
  if (service.icon === "strategy") return <StrategyIcon />;
  return <InterfaceIcon />;
}

type StackTool = {
  badge: string;
  color: string;
  use: string;
};

/* Placeholder tiles keep this first pass asset-free. They can be replaced with
   licensed tool marks later without changing the stack interaction. */
const stackTools: Record<string, StackTool> = {
  Figma: { badge: "Fi", color: "#a259ff", use: "UI flows, responsive screens, and prototypes." },
  HTML: { badge: "H", color: "#e44d26", use: "Semantic structure and accessible content." },
  CSS: { badge: "C", color: "#264de4", use: "Visual systems, responsive layouts, and interaction polish." },
  "Design systems": { badge: "DS", color: "#7c3aed", use: "Reusable tokens, components, and states." },
  Workshops: { badge: "W", color: "#ea580c", use: "Aligning the problem, audience, and next decisions." },
  Research: { badge: "R", color: "#0f766e", use: "Clarifying audience needs and useful patterns." },
  "Content planning": { badge: "Cp", color: "#ca8a04", use: "Turning the message into useful, structured content." },
  JavaScript: { badge: "JS", color: "#d4a800", use: "Small interactions and practical interface behavior." },
  Git: { badge: "G", color: "#f05032", use: "Keeping implementation changes traceable and reviewable." },
  GitHub: { badge: "GH", color: "#24292f", use: "Version control, collaboration, and project handoff." },
  Vite: { badge: "V", color: "#646cff", use: "Fast front-end development and production builds." },
  "No-code platforms": { badge: "NC", color: "#0891b2", use: "Shipping the right work with the right platform." },
  ChatGPT: { badge: "AI", color: "#10a37f", use: "Drafting, exploring, and accelerating supervised workflows." },
  "AI agents": { badge: "Ag", color: "#8b5cf6", use: "Assisted task flows with human checkpoints." },
  "Structured prompting": { badge: "P", color: "#ec4899", use: "Making AI output more reliable and repeatable." },
  "Automation tools": { badge: "Au", color: "#2563eb", use: "Reducing repetitive production work." },
  "Human review": { badge: "HR", color: "#64748b", use: "Keeping judgment, approval, and quality human-led." },
};

type CursorToolEvent = "portfolio-stack-tool-enter" | "portfolio-stack-tool-leave";

/* Magic Screen controls reuse the established stack-tile handoff, so one
   cursor owns every tooltip morph instead of running a second interaction. */
function dispatchCursorToolEvent(type: CursorToolEvent, tool: HTMLElement) {
  window.dispatchEvent(new CustomEvent(type, { detail: tool }));
}

function withoutTrailingPeriod(value: string) {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function ServiceStack({ service }: { service: Service }) {
  return (
    <section className="service-stack" aria-label={`The stack for ${service.title}`}>
      <h6>The stack:</h6>
      <div className="service-stack__tools">
        {service.tools.map((tool) => {
          const item = stackTools[tool] ?? { badge: tool.slice(0, 2), color: "#64748b", use: `Used for ${tool}.` };

          return (
            <button
              key={tool}
              type="button"
              className="service-stack__tool"
              aria-label={`${tool}: ${item.use}`}
              data-cursor-tool
              data-cursor-title={tool}
              data-cursor-description={withoutTrailingPeriod(item.use)}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget);
              }}
            >
              <span
                className="service-stack__tile"
                aria-hidden="true"
                style={{ "--stack-tool-color": item.color } as CSSProperties}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SkillsSection() {
  const [isProcessActionRevealed, setIsProcessActionRevealed] = useState(false);

  return (
    <section className="skills-section what-i-do what-i-do--cards" id="skills" aria-labelledby="skills-heading-cards">
      <div className="skills-section__intro">
        <RevealTitle id="skills-heading-cards" lines={["What I do"]} />
      </div>
      <SpotlightGrid className="service-summary-grid">
        {services.map((service) => (
          <SpotlightCard key={service.id} className="service-summary-card">
            <span className="service-summary-card__icon"><ServiceIcon service={service} /></span>
            <h5>{service.cardTitle}</h5>
            <p>{service.summary}</p>
            <ServiceStack service={service} />
          </SpotlightCard>
        ))}
      </SpotlightGrid>
      <div className="what-i-do__process">
        <RevealTitle as="h3" lines={["How do I do it?"]} onRevealComplete={() => setIsProcessActionRevealed(true)} />
        <Link
          className={`button button--secondary reveal-following-action${isProcessActionRevealed ? " is-revealed" : ""}`}
          to="/services"
          tabIndex={isProcessActionRevealed ? undefined : -1}
          aria-hidden={!isProcessActionRevealed}
        ><span className="liquid-button__surface">Learn about my process <ArrowUpRightIcon /></span></Link>
      </div>
    </section>
  );
}

function MagicScreenKnobGlyph() {
  return (
    <svg className="lab-etch__knob-glyph" viewBox="0 0 100 100" aria-hidden="true">
      {/* One path owns the stroke and ring: it leaves a single gap to the
          left of the radial bar, then rotates as one continuous mark. */}
      <path d="M50 7V50 M50 7A43 43 0 1 1 22 17" />
    </svg>
  );
}

function EtchASketch() {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [cursor, setCursor] = useState({ x: 150, y: 80 });
  const [knobAngle, setKnobAngle] = useState({ x: 0, y: 0 });
  const [isTurning, setIsTurning] = useState(false);
  const [isKeyboardDrawing, setIsKeyboardDrawing] = useState(false);
  const [isScreenHovered, setIsScreenHovered] = useState(false);
  const [isCursorSuppressed, setIsCursorSuppressed] = useState(false);
  const [isKnobDragging, setIsKnobDragging] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const cursorRef = useRef({ x: 150, y: 80 });
  const activeStroke = useRef<string | null>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const previousPointer = useRef({ x: 0, y: 0 });
  const isPointerInside = useRef(false);
  const activeDrawingKeys = useRef(new Set<string>());
  const cursorReturnTimer = useRef<number | null>(null);
  const clearAnimationTimer = useRef<number | null>(null);
  const knobDragCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "magic-screen-cursor-hidden",
      isCursorSuppressed || isKnobDragging,
    );
    return () => document.documentElement.classList.remove("magic-screen-cursor-hidden");
  }, [isCursorSuppressed, isKnobDragging]);

  useEffect(() => {
    if (isKeyboardDrawing && isScreenHovered) {
      if (cursorReturnTimer.current !== null) window.clearTimeout(cursorReturnTimer.current);
      setIsCursorSuppressed(true);
      return;
    }
    if (!isCursorSuppressed) return;
    cursorReturnTimer.current = window.setTimeout(() => {
      cursorReturnTimer.current = null;
      setIsCursorSuppressed(false);
    }, 5000);
    return () => {
      if (cursorReturnTimer.current !== null) window.clearTimeout(cursorReturnTimer.current);
      cursorReturnTimer.current = null;
    };
  }, [isCursorSuppressed, isKeyboardDrawing, isScreenHovered]);

  useEffect(() => () => {
    if (cursorReturnTimer.current !== null) window.clearTimeout(cursorReturnTimer.current);
  }, []);

  useEffect(() => {
    const revealCursorOnMove = () => setIsCursorSuppressed(false);
    window.addEventListener("pointermove", revealCursorOnMove, { passive: true });
    return () => window.removeEventListener("pointermove", revealCursorOnMove);
  }, []);

  useEffect(() => {
    if (!isTurning) return;
    let frame = 0;
    const draw = () => {
      const current = cursorRef.current;
      const next = {
        x: Math.max(4, Math.min(296, current.x + velocity.current.x)),
        y: Math.max(4, Math.min(156, current.y + velocity.current.y)),
      };

      // Once the drawing point reaches an edge, stop that knob rather than
      // letting its visual angle keep spinning against a clamped coordinate.
      if (next.x === current.x && velocity.current.x !== 0) velocity.current.x = 0;
      if (next.y === current.y && velocity.current.y !== 0) velocity.current.y = 0;
      if (activeStroke.current && (velocity.current.x || velocity.current.y)) {
        cursorRef.current = next;
        setCursor(next);
        setKnobAngle((current) => ({
          x: current.x + velocity.current.x * 5,
          y: current.y - velocity.current.y * 5,
        }));
        const stroke = `${activeStroke.current} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
        activeStroke.current = stroke;
        setStrokes((current) => [...current.slice(0, -1), stroke]);
      } else if (!velocity.current.x && !velocity.current.y) {
        setIsTurning(false);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [isTurning]);

  useEffect(() => {
    const handleKeyboardDraw = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // These shortcuts belong to the Magic Screen itself, not to the page.
      if (!isPointerInside.current) return;
      if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']")) return;

      const key = event.key.toLowerCase();
      const input = key === "a" ? { axis: "x" as const, amount: -3 }
        : key === "s" ? { axis: "x" as const, amount: 3 }
          : key === "k" ? { axis: "y" as const, amount: 3 }
            : key === "l" ? { axis: "y" as const, amount: -3 }
              : null;
      if (!input) return;

      event.preventDefault();
      activeDrawingKeys.current.add(key);
      setIsKeyboardDrawing(true);
      const current = cursorRef.current;
      const next = input.axis === "x"
        ? { x: Math.max(4, Math.min(296, current.x + input.amount)), y: current.y }
        : { x: current.x, y: Math.max(4, Math.min(156, current.y + input.amount)) };
      if (next.x === current.x && next.y === current.y) return;

      cursorRef.current = next;
      setCursor(next);
      setKnobAngle((angles) => ({
        ...angles,
        [input.axis]: angles[input.axis] + (input.axis === "y" ? -input.amount : input.amount) * 3,
      }));
      setStrokes((currentStrokes) => [
        ...currentStrokes,
        `${current.x.toFixed(1)},${current.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`,
      ]);
    };

    const handleKeyboardRelease = (event: KeyboardEvent) => {
      activeDrawingKeys.current.delete(event.key.toLowerCase());
      if (activeDrawingKeys.current.size === 0) setIsKeyboardDrawing(false);
    };

    const clearKeyboardDrawing = () => {
      activeDrawingKeys.current.clear();
      setIsKeyboardDrawing(false);
    };

    window.addEventListener("keydown", handleKeyboardDraw);
    window.addEventListener("keyup", handleKeyboardRelease);
    window.addEventListener("blur", clearKeyboardDrawing);
    return () => {
      window.removeEventListener("keydown", handleKeyboardDraw);
      window.removeEventListener("keyup", handleKeyboardRelease);
      window.removeEventListener("blur", clearKeyboardDrawing);
    };
  }, []);

  const stopKnob = () => {
    const cleanup = knobDragCleanup.current;
    knobDragCleanup.current = null;
    cleanup?.();
    velocity.current = { x: 0, y: 0 };
    activeStroke.current = null;
    setIsKnobDragging(false);
    setIsTurning(false);
  };

  const turnKnob = (axis: "x" | "y", clientX: number, clientY: number) => {
    const delta = axis === "x" ? clientX - previousPointer.current.x : clientY - previousPointer.current.y;
    previousPointer.current = { x: clientX, y: clientY };
    if (!delta) return;
    // A short deliberate drag should have enough lasting momentum to feel
    // like a dial, while larger drags still respond immediately.
    const nextVelocity = Math.sign(delta) * Math.max(0.9, Math.min(2.6, Math.abs(delta) / 7.5));
    const coordinate = cursorRef.current[axis];
    const isBlocked = (coordinate <= 4 && nextVelocity < 0) ||
      (coordinate >= (axis === "x" ? 296 : 156) && nextVelocity > 0);
    if (isBlocked) {
      velocity.current[axis] = 0;
      if (!velocity.current.x && !velocity.current.y) setIsTurning(false);
      return;
    }
    velocity.current[axis] = nextVelocity;
    setKnobAngle((current) => ({
      ...current,
      [axis]: current[axis] + (axis === "y" ? -delta : delta) * 3,
    }));
    setIsTurning(true);
  };

  const beginKnob = (axis: "x" | "y", event: PointerEvent<HTMLButtonElement>) => {
    // Keep pointer focus from turning into a focus-visible ring. Keyboard
    // focus is retained for actual Tab navigation.
    event.preventDefault();
    stopKnob();
    setIsKnobDragging(true);
    const pointerId = event.pointerId;
    previousPointer.current = { x: event.clientX, y: event.clientY };
    activeStroke.current = `${cursorRef.current.x},${cursorRef.current.y}`;
    setStrokes((current) => [...current, activeStroke.current!]);

    // Element-local pointer events get cut off when a cursor layer or the SVG
    // is crossed. This short-lived, pointer-specific listener keeps the drag
    // continuous without making any other page movement draggable.
    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      turnKnob(axis, moveEvent.clientX, moveEvent.clientY);
    };
    const handleEnd = (endEvent: globalThis.PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      stopKnob();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    };
    knobDragCleanup.current = cleanup;
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  };

  useEffect(() => () => {
    knobDragCleanup.current?.();
    if (clearAnimationTimer.current !== null) window.clearTimeout(clearAnimationTimer.current);
  }, []);

  const clear = () => {
    setStrokes([]);
    stopKnob();
    setIsClearing(true);
    if (clearAnimationTimer.current !== null) window.clearTimeout(clearAnimationTimer.current);
    clearAnimationTimer.current = window.setTimeout(() => {
      clearAnimationTimer.current = null;
      setIsClearing(false);
    }, 1000);
  };

  const downloadDrawing = () => {
    const output = document.createElement("canvas");
    output.width = 1200;
    output.height = 640;
    const context = output.getContext("2d");
    if (!context) return;

    const screen = document.querySelector<HTMLElement>(".lab-etch__canvas");
    const background = screen ? window.getComputedStyle(screen).backgroundColor : "#171717";
    const stroke = window.getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    context.scale(4, 4);
    context.fillStyle = background;
    context.fillRect(0, 0, 300, 160);
    context.strokeStyle = stroke;
    context.lineWidth = 3.25;
    context.lineCap = "round";
    context.lineJoin = "round";
    strokes.forEach((line) => {
      const points = line.trim().split(/\s+/).map((point) => point.split(",").map(Number));
      if (points.length < 2) return;
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
      context.stroke();
    });
    context.fillStyle = stroke;
    context.beginPath();
    context.arc(cursor.x, cursor.y, 2.25, 0, Math.PI * 2);
    context.fill();

    const download = document.createElement("a");
    download.href = output.toDataURL("image/png");
    download.download = "magic-screen.png";
    download.click();
  };

  return (
    <article className={`lab-preview__placeholder lab-preview__placeholder--1 lab-etch${isClearing ? " is-clearing" : ""}`} aria-label="Magic Screen drawing experiment" onPointerEnter={() => { isPointerInside.current = true; }} onPointerLeave={() => { isPointerInside.current = false; }}>
      <div className="lab-etch__topline"><strong>Magic screen</strong></div>
      <svg
        className={`lab-etch__canvas${isCursorSuppressed ? " is-cursor-suppressed" : ""}`}
        viewBox="0 0 300 160"
        role="img"
        aria-label="Magic Screen line display"
        onPointerEnter={() => setIsScreenHovered(true)}
        onPointerLeave={() => setIsScreenHovered(false)}
      >
        {strokes.map((stroke, index) => <polyline key={`${stroke.slice(0, 12)}-${index}`} points={stroke} />)}
        <circle className="lab-etch__cursor" cx={cursor.x} cy={cursor.y} r="2.25" />
      </svg>
      <div className="lab-etch__controls">
        <button type="button" className="lab-etch__knob lab-etch__knob--horizontal" aria-label="Move the line left or right" style={{ "--knob-angle": `${knobAngle.x}deg` } as CSSProperties} onPointerDown={(event) => beginKnob("x", event)}><MagicScreenKnobGlyph /></button>
        <div className="lab-etch__utility-controls" aria-label="Magic Screen controls">
          <button type="button" className="lab-etch__utility-button" aria-label="Download Magic Screen drawing" title="Download Magic Screen drawing" data-cursor-tool data-cursor-title="" data-cursor-description="Download work of art" onClick={downloadDrawing} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><DownloadIcon size={18} /></button>
          <button type="button" className="lab-etch__utility-button" aria-label="Magic Screen information" title="Magic Screen information" data-cursor-tool data-cursor-title="" data-cursor-description="Draw with the knobs! Drag them or use A/S - left and right, K/L - up and down" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon size={19} /></button>
          <button type="button" className="lab-etch__clear" onClick={clear} aria-label="Clear drawing" title="Clear drawing" data-cursor-tool data-cursor-title="" data-cursor-description="Clear magic screen" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><TrashIcon size={18} /></button>
        </div>
        <button type="button" className="lab-etch__knob lab-etch__knob--vertical" aria-label="Move the line up or down" style={{ "--knob-angle": `${knobAngle.y}deg` } as CSSProperties} onPointerDown={(event) => beginKnob("y", event)}><MagicScreenKnobGlyph /></button>
      </div>
    </article>
  );
}

function TypeRacer() {
  const phrase = "The quick brown fox jumps over the lazy dog.";
  const highScoreKey = "portfolio:type-racer:high-score";
  const words = phrase.split(" ");
  const [entry, setEntry] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [resetElapsed, setResetElapsed] = useState<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [arrivingWordIndex, setArrivingWordIndex] = useState<number | null>(null);
  const isComplete = entry === phrase;
  const inputRef = useRef<HTMLInputElement>(null);
  const resetFrame = useRef<number | null>(null);
  const inputFadeTimer = useRef<number | null>(null);
  const isPointerInsideInput = useRef(false);
  const isPointerInsidePrompt = useRef(false);
  const inputClickPoint = useRef<{ x: number; y: number } | null>(null);

  const typedWords = entry.split(" ");
  const wordState = (index: number) => {
    const typedWord = typedWords[index] ?? "";
    const isLast = index === words.length - 1;
    const isFinalised = index < typedWords.length - 1 || (isLast && entry.length >= phrase.length);
    if (isFinalised) return typedWord === words[index] ? "is-correct" : "is-incorrect";
    if (index === typedWords.length - 1 && entry.length > 0) return "is-active";
    return "is-upcoming";
  };

  useEffect(() => {
    if (!startedAt || completionTime !== null) return;
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => window.clearInterval(interval);
  }, [completionTime, startedAt]);

  useEffect(() => {
    if (!isComplete || !startedAt || completionTime !== null) return;
    const finishedAt = Date.now() - startedAt;
    setElapsed(finishedAt);
    setCompletionTime(finishedAt);
  }, [completionTime, isComplete, startedAt]);

  useEffect(() => {
    const savedScore = Number(window.localStorage.getItem(highScoreKey));
    if (Number.isFinite(savedScore) && savedScore > 0) setHighScore(savedScore);
  }, [highScoreKey]);

  useEffect(() => {
    if (completionTime === null) return;
    setHighScore((current) => {
      if (current !== null && current <= completionTime) return current;
      window.localStorage.setItem(highScoreKey, String(completionTime));
      return completionTime;
    });
  }, [completionTime, highScoreKey]);

  const clearInputCursorFade = () => {
    if (inputFadeTimer.current !== null) window.clearTimeout(inputFadeTimer.current);
    inputFadeTimer.current = null;
  };

  const showTypeCursor = () => document.documentElement.classList.remove("type-racer-cursor-hidden");

  const hideTypeCursor = () => document.documentElement.classList.add("type-racer-cursor-hidden");

  const scheduleInputCursorFade = () => {
    clearInputCursorFade();
    if (!isPointerInsideInput.current && !isPointerInsidePrompt.current) return;
    inputFadeTimer.current = window.setTimeout(() => {
      if ((isPointerInsideInput.current || isPointerInsidePrompt.current) && document.activeElement === inputRef.current) hideTypeCursor();
    }, 250);
  };

  const cancelTimerReset = () => {
    if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
    resetFrame.current = null;
    setResetElapsed(null);
  };

  useEffect(() => {
    const revealTypeCursor = (event: globalThis.PointerEvent) => {
      const clickPoint = inputClickPoint.current;
      if (clickPoint && event.clientX === clickPoint.x && event.clientY === clickPoint.y) return;
      inputClickPoint.current = null;
      showTypeCursor();
    };
    window.addEventListener("pointermove", revealTypeCursor, { passive: true });
    return () => {
      window.removeEventListener("pointermove", revealTypeCursor);
      if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
      clearInputCursorFade();
      showTypeCursor();
    };
  }, []);

  const displayedElapsed = resetElapsed ?? completionTime ?? elapsed;
  const formatTime = (value: number) => `${Math.floor(value / 60000)}:${String(Math.floor((value % 60000) / 1000)).padStart(2, "0")}.${Math.floor((value % 1000) / 100)}`;
  const time = formatTime(displayedElapsed);

  const restart = () => {
    if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
    setEntry("");
    setStartedAt(null);
    setCompletionTime(null);
    setArrivingWordIndex(null);
    const initialElapsed = Math.floor(elapsed / 100) * 100;
    const startedResetAt = performance.now();
    const resetDuration = 140;
    const animateReset = (now: number) => {
      const progress = Math.min(1, (now - startedResetAt) / resetDuration);
      const nextElapsed = Math.max(0, Math.round((initialElapsed * (1 - progress)) / 100) * 100);
      setResetElapsed(nextElapsed);
      if (progress < 1) {
        resetFrame.current = window.requestAnimationFrame(animateReset);
        return;
      }
      resetFrame.current = null;
      setResetElapsed(null);
      setElapsed(0);
    };
    setResetElapsed(initialElapsed);
    resetFrame.current = window.requestAnimationFrame(animateReset);
    inputRef.current?.focus();
  };

  return (
    <article className="lab-preview__placeholder lab-preview__placeholder--3 lab-type-racer" aria-label="Type racer experiment">
      <button type="button" className={`lab-type-racer__restart${startedAt ? " is-visible" : ""}`} tabIndex={startedAt ? 0 : -1} aria-hidden={!startedAt} aria-label="Restart type racer" title="Restart type racer" data-cursor-tool data-cursor-title="" data-cursor-description="Restart timer" data-cursor-side="left" onClick={restart} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><RestartIcon /></button>
      <button type="button" className="lab-type-racer__info" aria-label="About this type racer" title="About this type racer" data-cursor-tool data-cursor-title="" data-cursor-description="Type the phrase exactly as it is in the shortest time possible!" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      <output className={`lab-type-racer__timer${completionTime !== null ? " is-complete" : ""}`} aria-live="polite">{time}</output>
      {highScore !== null ? <span className="lab-type-racer__high-score" aria-label={`Best time ${formatTime(highScore)}`}><SparkIcon size={15} /><span>{formatTime(highScore)}</span></span> : null}
      <p className="lab-type-racer__prompt" onPointerEnter={() => { isPointerInsidePrompt.current = true; if (startedAt && completionTime === null) scheduleInputCursorFade(); }} onPointerLeave={() => { isPointerInsidePrompt.current = false; clearInputCursorFade(); showTypeCursor(); }}>
        <span>{words.map((word, index) => <Fragment key={`${word}-${index}`}><span className={`lab-type-racer__word ${wordState(index)}${arrivingWordIndex === index ? " is-arriving" : ""}`}>{word}</span>{index < words.length - 1 ? " " : null}</Fragment>)}</span>
        <span>{isComplete ? "Done" : `${entry.length}/${phrase.length}`}</span>
      </p>
      <input ref={inputRef} aria-label="Type the displayed phrase" value={entry} onPointerEnter={() => { isPointerInsideInput.current = true; }} onPointerLeave={() => { isPointerInsideInput.current = false; inputClickPoint.current = null; clearInputCursorFade(); showTypeCursor(); }} onPointerDown={(event) => { inputClickPoint.current = { x: event.clientX, y: event.clientY }; hideTypeCursor(); }} onChange={(event) => { const nextEntry = event.target.value; const previousWordIndex = entry ? entry.split(" ").length - 1 : -1; const nextWordIndex = nextEntry ? nextEntry.split(" ").length - 1 : -1; if (nextWordIndex > previousWordIndex) setArrivingWordIndex(nextWordIndex); else if (nextWordIndex < previousWordIndex) setArrivingWordIndex(null); if (resetElapsed !== null) { cancelTimerReset(); setElapsed(0); } if (!startedAt && nextEntry) setStartedAt(Date.now()); setEntry(nextEntry); scheduleInputCursorFade(); }} placeholder="Type it here" spellCheck="false" autoCapitalize="off" autoComplete="off" />
    </article>
  );
}

export function LabPreview() {
  return (
    <section className="lab-preview" id="lab" aria-labelledby="lab-preview-heading">
      <div className="lab-grid">
        <div className="lab-grid__intro">
          <div className="lab-grid__title-fit">
            <RevealTitle id="lab-preview-heading" lines={["I like to create tools & interactive stuff"]} />
          </div>
        </div>
        <Link className="button button--secondary lab-grid__cta" to="/lab"><span className="liquid-button__surface">Explore interaction lab <ArrowUpRightIcon /></span></Link>
        <EtchASketch />
        <div className="lab-preview__placeholder lab-preview__placeholder--2" aria-hidden="true"><span className="lab-preview__number">02</span></div>
        <TypeRacer />
        <div className="lab-preview__placeholder-group lab-preview__placeholder-group--bottom" aria-hidden="true">
          <div className="lab-preview__placeholder lab-preview__placeholder--4"><span className="lab-preview__number">04</span></div>
          <div className="lab-preview__placeholder lab-preview__placeholder--5"><span className="lab-preview__number">05</span></div>
        </div>
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="experience-section" id="experience" aria-labelledby="experience-heading">
      <div className="experience-section__intro">
        <RevealTitle id="experience-heading" lines={["Career"]} />
        <a className="button button--secondary" href="/resume-placeholder.txt" target="_blank" rel="noreferrer"><span className="liquid-button__surface">View my CV <ArrowUpRightIcon /></span></a>
      </div>
      <ol className="experience-list experience-list--index">
        {experience.map((item) => (
          <li key={item.id}>
            <span className="experience-list__logo" role="img" aria-label="Company logo placeholder"><span aria-hidden="true">Logo</span></span>
            <div className="experience-list__role">
              <h3>{item.title}</h3>
              <p>{item.company}</p>
            </div>
            <SoftBlurText className="experience-list__contribution" delay={0}>{item.summary}</SoftBlurText>
            <p className="experience-list__years">{item.years}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReferencesSection() {
  return (
    <section className="references-section" id="references" aria-labelledby="references-heading">
      <div className="references-section__intro">
        <RevealTitle id="references-heading" lines={["Kind words"]} />
      </div>
      <div className="references-grid">
        {testimonials.slice(0, 3).map((testimonial, index) => (
          <article className="reference-card" key={testimonial.id} aria-label={`Reference ${index + 1} of 3`}>
            <span>Unpublished reference placeholder · {String(index + 1).padStart(2, "0")}</span>
            <blockquote>“{testimonial.quote}”</blockquote>
            <p>{testimonial.name} · {testimonial.role} · {testimonial.relationship}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
