import { Link } from "react-router";
import { createPortal, flushSync } from "react-dom";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Download } from "iconoir-react";
import type { BufferGeometry, Material, Object3D, Texture } from "three";
import { experience, testimonials } from "~/content/portfolio";
import { services, type Service } from "~/content/services";
import { publicAsset } from "~/lib/public-asset";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ExpandIcon, AutomationIcon, CodeIcon, HeartIcon, InfoCircleIcon, InterfaceIcon, NavArrowLeftIcon, PlayIcon, RestartIcon, SparkIcon, StrategyIcon } from "./icons";
import { RevealTitle, SoftBlurText } from "./motion-reveal";
import { SpotlightCard, SpotlightGrid } from "./spotlight-card";
import { LabCalendar } from "./lab-calendar";

function ServiceIcon({ service, className }: { service: Service; className?: string }) {
  if (service.icon === "code") return <CodeIcon className={className} />;
  if (service.icon === "spark") return <AutomationIcon className={className} />;
  if (service.icon === "strategy") return <StrategyIcon className={className} />;
  return <InterfaceIcon className={className} />;
}

type StackTool = {
  badge: string;
  color: string;
  use: string;
  icon?: string;
  src?: string;
  logoClass?: string;
  framed?: boolean;
  invert?: boolean;
  solid?: boolean;
  symbol?: "code";
};

/* Placeholder tiles keep this first pass asset-free. They can be replaced with
   licensed tool marks later without changing the stack interaction. */
const stackTools: Record<string, StackTool> = {
  Figma: { badge: "Fi", color: "#ffffff", src: publicAsset("images/tool-logos/uxui-figma-tile.webp"), solid: true, use: "Where the interface takes shape" },
  Sketch: { badge: "Sk", color: "#ffffff", src: publicAsset("images/tool-logos/uxui-sketch-tile.webp"), solid: true, use: "Even more UI flows and prototyping" },
  "Adobe XD": { badge: "Xd", color: "#470137", src: publicAsset("images/tool-logos/uxui-adobe-xd-tile.webp"), solid: true, use: "More UI flows and prototyping" },
  DevTools: { badge: "</>", color: "#252525", src: publicAsset("images/tool-logos/uxui-devtools-tile.webp"), solid: true, use: "Inspecting, testing and adjusting" },
  "Coming soon": { badge: "—", color: "#64748b", use: "This toolset is being defined." },
  Illustrator: { badge: "Ai", color: "#ff9a00", src: publicAsset("images/tool-logos/illustrator.webp"), use: "For vectors, illustrations and graphic systems" },
  Photoshop: { badge: "Ps", color: "#31a8ff", src: publicAsset("images/tool-logos/photoshop-fixed.webp"), use: "Pixels and composition" },
  InDesign: { badge: "Id", color: "#ff3366", src: publicAsset("images/tool-logos/indesign-fixed.webp"), use: "For editorial layouts, documents and publications" },
  Miro: { badge: "M", color: "#ffd02f", src: `${publicAsset("images/tool-logos/miro-fixed.webp")}?v=2`, use: "Workshops, mapping and collaborative planning" },
  Webflow: { badge: "W", color: "#146ef5", src: publicAsset("images/tool-logos/frontend-webflow-tile.webp"), use: "For no-code web design and deployment #2" },
  Framer: { badge: "Fr", color: "#000000", src: `${publicAsset("images/tool-logos/frontend-framer-tile.webp")}?v=3`, solid: true, use: "For no-code web design and deployment #1" },
  WordPress: { badge: "W", color: "#21759b", src: publicAsset("images/tool-logos/frontend-wordpress-tile.webp"), use: "Alternative for content-managed website production" },
  HTML: { badge: "H", color: "#f16529", src: publicAsset("images/tool-logos/frontend-html-tile.webp"), use: "The bones of the page" },
  CSS: { badge: "C", color: "#0096dc", src: publicAsset("images/tool-logos/frontend-css-tile.webp"), use: "Shape, color, movement" },
  React: { badge: "R", color: "#20232a", src: publicAsset("images/tool-logos/frontend-react-tile.webp"), use: "Component-based interface development" },
  TypeScript: { badge: "TS", color: "#3178c6", src: publicAsset("images/tool-logos/frontend-typescript-tile.webp"), use: "For a little more clarity in the code" },
  "React Router": { badge: "RR", color: "#ffffff", icon: "reactrouter/reactrouter-original", framed: true, use: "Client-side routing and page transitions." },
  "Node.js": { badge: "N", color: "#ffffff", src: publicAsset("images/tool-logos/frontend-node-tile.webp"), use: "JavaScript tooling and server-side workflows" },
  "Three.js": { badge: "3D", color: "#111111", src: publicAsset("images/tool-logos/frontend-threejs-tile.webp"), use: "For 3D in the browser" },
  "Design systems": { badge: "DS", color: "#7c3aed", use: "Reusable tokens, components, and states." },
  Workshops: { badge: "W", color: "#ea580c", use: "Aligning the problem, audience, and next decisions." },
  Research: { badge: "R", color: "#0f766e", use: "Clarifying audience needs and useful patterns." },
  "Content planning": { badge: "Cp", color: "#ca8a04", use: "Turning the message into useful, structured content." },
  Notion: { badge: "N", color: "#111111", src: `${publicAsset("images/tool-logos/automation-notion-tile.webp")}?v=1`, solid: true, use: "For notes, planning and project documentation" },
  Excel: { badge: "X", color: "#217346", use: "Structured data, planning, and practical analysis." },
  PowerPoint: { badge: "P", color: "#d24726", use: "Presentations, narrative structure, and visual communication." },
  "Monday.com": { badge: "M", color: "#ffffff", src: publicAsset("images/tool-logos/monday-square.webp"), use: "Project planning and delivery tracking #1" },
  Jira: { badge: "J", color: "#0052cc", src: publicAsset("images/tool-logos/jira-square.webp"), use: "Project planning and delivery tracking #2" },
  Confluence: { badge: "C", color: "#1868db", src: publicAsset("images/tool-logos/confluence-square.webp"), use: "Shared technical and project documentation" },
  "Microsoft 365": { badge: "M365", color: "#ffffff", src: publicAsset("images/tool-logos/microsoft-365-transparent.webp"), solid: true, use: "Documents, planning, numbers and presentations" },
  Slack: { badge: "S", color: "#4a154b", src: publicAsset("images/tool-logos/slack-transparent.webp"), solid: true, use: "Team communication and workflow coordination" },
  "Microsoft Teams": { badge: "T", color: "#ffffff", src: publicAsset("images/tool-logos/teams-transparent.webp"), solid: true, use: "More team communication and workflow coordination" },
  JavaScript: { badge: "JS", color: "#d4a800", src: publicAsset("images/tool-logos/frontend-javascript-tile.webp"), use: "For behavior, interactions and feedback" },
  Git: { badge: "G", color: "#ffffff", src: publicAsset("images/tool-logos/frontend-git-tile.webp"), use: "Version control, tracing and reviewing" },
  GitHub: { badge: "GH", color: "#24292f", icon: "github/github-original", use: "Version control, collaboration, and project handoff." },
  Vite: { badge: "V", color: "#ffffff", src: publicAsset("images/tool-logos/frontend-vite-tile.webp"), use: "Where the projects get moving" },
  n8n: { badge: "n8n", color: "#ffffff", src: `${publicAsset("images/tool-logos/automation-n8n-tile.webp")}?v=1`, solid: true, use: "Workflow automation and integrations" },
  Obsidian: { badge: "O", color: "#7c3aed", src: `${publicAsset("images/tool-logos/automation-obsidian-tile.webp")}?v=1`, solid: true, use: "Personal vault for research and reusable knowledge" },
  "Google Sheets": { badge: "S", color: "#ffffff", src: `${publicAsset("images/tool-logos/automation-google-sheets-tile.webp")}?v=1`, solid: true, use: "Status, numbers and tracking" },
  "Google Drive": { badge: "D", color: "#ffffff", src: `${publicAsset("images/tool-logos/automation-google-drive-tile.webp")}?v=1`, solid: true, use: "For assets and files" },
  Mailchimp: { badge: "M", color: "#ffe01b", src: `${publicAsset("images/tool-logos/automation-mailchimp-tile.webp")}?v=1`, solid: true, use: "Email automation" },
  Stripe: { badge: "S", color: "#635bff", src: `${publicAsset("images/tool-logos/automation-stripe-tile.webp")}?v=1`, solid: true, use: "For payments and receipts" },
  Supabase: { badge: "Sb", color: "#000000", src: `${publicAsset("images/tool-logos/automation-supabase-tile.webp")}?v=1`, solid: true, use: "Authentication, storage and data" },
  Codex: { badge: "Cx", color: "#111111", use: "Supervised coding workflows and implementation support." },
  Make: { badge: "Mk", color: "#6d3df5", use: "Visual automation and connected workflows." },
  "No-code platforms": { badge: "NC", color: "#0891b2", use: "Shipping the right work with the right platform." },
  ChatGPT: { badge: "AI", color: "#ffffff", src: `${publicAsset("images/tool-logos/automation-chatgpt-tile.webp")}?v=1`, solid: true, use: "Drafting, exploring and accelerating supervised workflows" },
  Claude: { badge: "Cl", color: "#d97757", src: `${publicAsset("images/tool-logos/automation-claude-tile.webp")}?v=1`, solid: true, use: "For a second opinion and reviewing" },
  "Pen and paper": { badge: "P", color: "#64748b", src: `${publicAsset("images/tool-logos/pen-line.webp")}?v=4`, use: "Early thinking, sketching, and rapid idea development." },
  "AI agents": { badge: "Ag", color: "#8b5cf6", use: "Assisted task flows with human checkpoints." },
  "Structured prompting": { badge: "P", color: "#ec4899", use: "Making AI output more reliable and repeatable." },
  "Automation tools": { badge: "Au", color: "#2563eb", use: "Reducing repetitive production work." },
  "Human review": { badge: "HR", color: "#64748b", use: "Keeping judgment, approval, and quality human-led." },
};

type CursorToolEvent = "portfolio-stack-tool-enter" | "portfolio-stack-tool-leave";

const localDeviconNames = new Set([
  "figma/figma-original",
  "wordpress/wordpress-plain",
  "html5/html5-original",
  "css3/css3-original",
  "react/react-original",
  "typescript/typescript-original",
  "reactrouter/reactrouter-original",
  "nodejs/nodejs-original",
  "threejs/threejs-original",
  "notion/notion-original",
  "javascript/javascript-original",
  "git/git-original",
  "github/github-original",
  "vitejs/vitejs-original",
]);

const deviconSvg = (icon: string) => localDeviconNames.has(icon)
  ? publicAsset(`images/tool-logos/devicon-${icon.replace("/", "-")}.webp`)
  : `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}.svg`;

/* Magic Screen controls reuse the established stack-tile handoff, so one
   cursor owns every tooltip morph instead of running a second interaction. */
function dispatchCursorToolEvent(type: CursorToolEvent, tool: HTMLElement) {
  window.dispatchEvent(new CustomEvent(type, { detail: tool }));
}

function withoutTrailingPeriod(value: string) {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

type MemoryCell = { x: number; y: number };
type MemoryStatus = "ready" | "preparing" | "revealing" | "recalling" | "recap" | "gameover";
type MemoryRevealPhase = "idle" | "entering" | "shown" | "hiding";

function memoryGridSize(level: number) {
  return Math.floor(Math.sqrt(9 + level * 3));
}

function memoryPatternSize(level: number) {
  return level + 2;
}

function makeMemoryPattern(gridSize: number, count: number) {
  const cells: MemoryCell[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) cells.push({ x, y });
  }

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }

  return cells.slice(0, count);
}

function includesMemoryCell(cells: MemoryCell[], cell: MemoryCell) {
  return cells.some((item) => item.x === cell.x && item.y === cell.y);
}

function DrawingPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eraseCanvasRef = useRef<HTMLCanvasElement>(null);
  const eraseFrameRef = useRef<number | null>(null);
  const drawingPointer = useRef<number | null>(null);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);

  const downloadDrawing = () => {
    // The dots/page colour are CSS only, not pixels in this transparent canvas.
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "work-of-art.png";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      if (eraseFrameRef.current !== null) {
        window.cancelAnimationFrame(eraseFrameRef.current);
        eraseFrameRef.current = null;
      }
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      const eraseCanvas = eraseCanvasRef.current;
      if (eraseCanvas) {
        eraseCanvas.width = canvas.width;
        eraseCanvas.height = canvas.height;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.25;
      context.strokeStyle = "#e8e8e8";
      if (previous.width && previous.height) {
        context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, bounds.width, bounds.height);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (eraseFrameRef.current !== null) window.cancelAnimationFrame(eraseFrameRef.current);
      document.documentElement.classList.remove("draw-cursor-hidden");
    };
  }, []);

  const eraseDrawing = () => {
    const canvas = canvasRef.current;
    const eraseCanvas = eraseCanvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    const eraseContext = eraseCanvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !eraseCanvas || !context || !eraseContext) return;

    if (eraseFrameRef.current !== null) window.cancelAnimationFrame(eraseFrameRef.current);
    eraseFrameRef.current = null;
    eraseContext.setTransform(1, 0, 0, 1, 0, 0);
    eraseContext.clearRect(0, 0, eraseCanvas.width, eraseCanvas.height);

    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    let hasInk = false;
    const particles: Array<{ x: number; y: number; alpha: number; drift: number; lift: number; releasedAt: number | null }> = [];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const sample = Math.max(1, Math.round(pixelRatio));
    for (let y = 0; y < canvas.height; y += sample) {
      for (let x = 0; x < canvas.width; x += sample) {
        const alpha = source.data[(y * canvas.width + x) * 4 + 3];
        if (alpha === 0) continue;
        hasInk = true;
        if (alpha < 96 || Math.random() < 0.18) continue;
        particles.push({ x: x / pixelRatio, y: y / pixelRatio, alpha: alpha / 255, drift: 14 + Math.random() * 18, lift: (Math.random() - 0.5) * 12, releasedAt: null });
      }
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (!hasInk || window.matchMedia("(prefers-reduced-motion: reduce)").matches || particles.length === 0) return;

    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d")?.putImageData(source, 0, 0);
    const startedAt = performance.now();
    const waveDuration = 660;
    const particleDuration = 380;
    const width = eraseCanvas.width / pixelRatio;
    const height = eraseCanvas.height / pixelRatio;
    const draw = (now: number) => {
      const waveProgress = Math.min(1, (now - startedAt) / waveDuration);
      const sweep = width - (width + 8) * waveProgress;
      eraseContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      eraseContext.clearRect(0, 0, width, height);
      const preservedWidth = Math.min(width, Math.max(0, sweep + 3));
      if (preservedWidth > 0) eraseContext.drawImage(snapshot, 0, 0, preservedWidth * pixelRatio, eraseCanvas.height, 0, 0, preservedWidth, height);
      for (const particle of particles) {
        if (particle.releasedAt === null && particle.x >= sweep - 3) particle.releasedAt = now;
        if (particle.releasedAt === null) continue;
        const progress = Math.min(1, (now - particle.releasedAt) / particleDuration);
        if (progress >= 1) continue;
        eraseContext.globalAlpha = particle.alpha * (1 - progress);
        eraseContext.fillStyle = "#e8e8e8";
        eraseContext.fillRect(particle.x + progress * particle.drift, particle.y + progress * particle.lift, 1.15, 1.15);
      }
      eraseContext.globalAlpha = 1;
      const hasActiveParticles = particles.some((particle) => particle.releasedAt === null || now - particle.releasedAt < particleDuration);
      if (waveProgress < 1 || hasActiveParticles) {
        eraseFrameRef.current = window.requestAnimationFrame(draw);
        return;
      }
      eraseContext.setTransform(1, 0, 0, 1, 0, 0);
      eraseContext.clearRect(0, 0, eraseCanvas.width, eraseCanvas.height);
      eraseFrameRef.current = null;
    };
    eraseFrameRef.current = window.requestAnimationFrame(draw);
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointer.current !== event.pointerId) return;
    drawingPointer.current = null;
    previousPoint.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <article className="lab-preview__placeholder lab-preview__placeholder--2 lab-draw" aria-label="Drawing pad">
      <canvas
        ref={canvasRef}
        className="lab-draw__canvas"
        aria-label="Draw here with your pointer"
        onPointerEnter={() => document.documentElement.classList.add("draw-cursor-hidden")}
        onPointerLeave={() => document.documentElement.classList.remove("draw-cursor-hidden")}
        onPointerDown={(event) => {
          const point = pointFromEvent(event);
          drawingPointer.current = event.pointerId;
          previousPoint.current = point;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drawingPointer.current !== event.pointerId || !previousPoint.current) return;
          const point = pointFromEvent(event);
          const context = event.currentTarget.getContext("2d");
          if (!context) return;
          context.beginPath();
          context.moveTo(previousPoint.current.x, previousPoint.current.y);
          context.lineTo(point.x, point.y);
          context.stroke();
          previousPoint.current = point;
        }}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
      <canvas ref={eraseCanvasRef} className="lab-draw__erase-animation" aria-hidden="true" />
      <div className="lab-draw__controls" aria-label="Drawing controls">
        <div className="lab-draw__actions">
          <button type="button" className="lab-draw__reset" aria-label="Clear drawing" data-cursor-tool data-cursor-compact data-cursor-title="" data-cursor-description="Clear drawing" onClick={eraseDrawing} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><RestartIcon /></button>
          <button type="button" className="lab-draw__download" aria-label="Download work of art" data-cursor-tool data-cursor-compact data-cursor-width="152" data-cursor-title="" data-cursor-description="Download work of art" onClick={downloadDrawing} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><Download /></button>
        </div>
        <button type="button" className="lab-draw__info" aria-label="About this drawing pad" data-cursor-tool data-cursor-title="" data-cursor-description="A small space to sketch! Save your drawing or clear the canvas anytime" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      </div>
    </article>
  );
}

type CarFrameAnchor = {
  rect: DOMRect;
  cornerRadius: string;
  distance: number;
};

type CarTransitionController = {
  capture: () => CarFrameAnchor;
  expand: (anchor: CarFrameAnchor, onComplete: () => void) => void;
  collapse: (anchor: CarFrameAnchor, onComplete: () => void) => void;
  finishCollapse: () => void;
  changeModel: (index: number) => Promise<void>;
};

const showcaseCars = [
  { name: "2017 Lexus LC 500", model: "models/gallery/lexus-lc-500-2017.glb", url: "https://sketchfab.com/3d-models/2017-lexus-lc-500-06f7ccfdf2aa4ef7afce64da59cacb16", author: "Ddiaz Design", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/", interiorVariant: "cream" },
  { name: "2017 Lexus LC 500", model: "models/gallery/lexus-lc-500-2017.glb", url: "https://sketchfab.com/3d-models/2017-lexus-lc-500-06f7ccfdf2aa4ef7afce64da59cacb16", author: "Ddiaz Design", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/", interiorVariant: "red-and-black" },
  { name: "1968 Lamborghini Miura P400", model: "models/miura/1968-lamborghini-miura-p400.glb", url: "https://sketchfab.com/3d-models/1968-lamborghini-miura-p400-d11a4c26add347d9b1b40ae0812fd83d", author: "Ddiaz Design", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  { name: "1962 Ferrari 250 GTO", model: "models/1962-ferrari-250-gto.glb", url: "https://sketchfab.com/3d-models/1962-ferrari-250-gto-500aca7ef92c4a79b5026f6c8fc51ac3", author: "OUTPISTON", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  { name: "Bugatti - La Voiture Noire", model: "models/bugatti/bugatti-la-voiture-noire.glb", url: "https://sketchfab.com/3d-models/bugatti-la-voiture-noire-b713f2e7c48842c194084cf42b0b7a5f", author: "SINNIK", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "2022 Apollo Project Evo", model: "models/gallery/apollo-project-evo-2022.glb", url: "https://sketchfab.com/3d-models/2022-apollo-project-evo-fd92ce955d6341e89143c564cc09ed14", author: "Ddiaz Design", license: "CC BY-NC 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { name: "1936 Bugatti Type 57SC Atlantic", model: "models/gallery/bugatti-type-57sc-atlantic-1936.glb", url: "https://sketchfab.com/3d-models/1936-bugatti-type-57sc-atlantic-4d40726e8183405188b333189e235f3d", author: "Res1n", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "2021 Ferrari SF90 Spider", model: "models/gallery/ferrari-sf90-spider-2021.glb", url: "https://sketchfab.com/3d-models/2021-ferrari-sf90-spider-94a830f22c974dc2a8d437fab830456f", author: "Outlaw Games™", license: "CC BY-NC 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { name: "BMW M8 F92 Coupé Competition", model: "models/gallery/bmw-m8-f92-coupe-competition.glb", url: "https://sketchfab.com/3d-models/bmw-m8-f92-coupe-competition-25d5b4f6d13e4217afa09bbf89f8d993", author: "kevin (ケビン)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "Aston Martin DBS Superleggera 2019", model: "models/gallery/aston-martin-dbs-superleggera-2019.glb", url: "https://sketchfab.com/3d-models/aston-martin-dbs-superleggera-2019-c7fb95e6b7ce40df8e3c4a55b7ecf9d9", author: "kevin (ケビン)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "1925 Rolls Royce Phantom I Jonckheere Coupe", model: "models/gallery/rolls-royce-phantom-i-jonckheere-coupe-1925.glb", url: "https://sketchfab.com/3d-models/1925-rolls-royce-phantom-i-jonckheere-coupe-1043f7cdbe1146df828a047dcbf42cc2", author: "Antonio Sagistiano", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "Pininfarina Battista", model: "models/gallery/pininfarina-battista.glb", url: "https://sketchfab.com/3d-models/pininfarina-battista-675658aa6cee4267877d8b83e20e096c", author: "kevin (ケビン)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "2020 Mercedes AVTR Concept", model: "models/gallery/mercedes-avtr-concept-2020.glb", url: "https://sketchfab.com/3d-models/2020-mercedes-avtr-concept-thanks-100k-wiew-690b13f974254b16a1c8ea8d6b92275b", author: "kevin (ケビン)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "2015 Mazda RX-Vision Concept", model: "models/gallery/mazda-rx-vision-2015.glb", url: "https://sketchfab.com/3d-models/2015-mazda-rx-vision-concept-a12b2f7d41dc4a54a4a55c7b7f8b0422", author: "kevin (ケビン)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "2023 Ferrari 296 GTS", model: "models/gallery/ferrari-296-gts-2023.glb", url: "https://sketchfab.com/3d-models/2023-ferrari-296-gts-9a596b9d09414adfad64fc1f5fd019f9", author: "Ddiaz Design", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  { name: "FREE - McLaren P1 MSO", model: "models/gallery/mclaren-p1-mso.glb", url: "https://sketchfab.com/3d-models/free-mclaren-p1-mso-c7687064e08c4be9a0af88e98bcf0a8e", author: "bohmerang", license: "CC BY-NC-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
] as const;

function CarShowcase() {
  const stageRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const expandTimer = useRef<number | null>(null);
  const expansionSettlingRef = useRef(false);
  const transitionControllerRef = useRef<CarTransitionController | null>(null);
  const cardAnchorRef = useRef<CarFrameAnchor | null>(null);
  const [isPointerInsideCar, setIsPointerInsideCar] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCameraTransitioning, setIsCameraTransitioning] = useState(false);
  const [carIndex, setCarIndex] = useState(0);
  const [isCarChanging, setIsCarChanging] = useState(false);
  const carIndexRef = useRef(0);
  const carChangingRef = useRef(false);

  const changeCar = (step: number) => {
    if (carChangingRef.current) return;
    const next = Math.max(0, Math.min(showcaseCars.length - 1, carIndexRef.current + step));
    if (next === carIndexRef.current) return;
    const controller = transitionControllerRef.current;
    if (!controller) return;
    const previous = carIndexRef.current;
    carChangingRef.current = true;
    setIsCarChanging(true);
    void (async () => {
      // Let the current credit finish its fade/blur before changing its content.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
      carIndexRef.current = next;
      setCarIndex(next);
      try {
        await controller.changeModel(next);
      } catch (error) {
        carIndexRef.current = previous;
        setCarIndex(previous);
        console.error("Could not load car model", error);
      } finally {
        carChangingRef.current = false;
        setIsCarChanging(false);
      }
    })();
  };

  const setExpanded = (nextExpanded: boolean) => {
    expandedRef.current = nextExpanded;
    setIsExpanded(nextExpanded);
  };

  const closeExpanded = () => {
    if (expandTimer.current !== null) {
      window.clearTimeout(expandTimer.current);
      expandTimer.current = null;
      expansionSettlingRef.current = false;
      setIsExpanding(false);
      return;
    }
    if (!expandedRef.current) return;
    const controller = transitionControllerRef.current;
    const anchor = cardAnchorRef.current;
    if (!controller || !anchor) return;
    setIsCameraTransitioning(true);
    controller.collapse(anchor, () => {
      flushSync(() => {
        setExpanded(false);
        setIsCameraTransitioning(false);
      });
      controller.finishCollapse();
    });
  };

  const beginExpand = () => {
    if (isExpanding || isExpanded) return;
    expansionSettlingRef.current = true;
    setIsExpanding(true);
    expandTimer.current = window.setTimeout(() => {
      expandTimer.current = null;
      const controller = transitionControllerRef.current;
      if (!controller) {
        expansionSettlingRef.current = false;
        setIsExpanding(false);
        return;
      }
      const anchor = controller.capture();
      cardAnchorRef.current = anchor;
      expansionSettlingRef.current = false;
      flushSync(() => {
        setIsExpanding(false);
        setExpanded(true);
        setIsCameraTransitioning(true);
      });
      controller.expand(anchor, () => setIsCameraTransitioning(false));
    }, 340);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("car-cursor-hidden", isPointerInsideCar);
    return () => document.documentElement.classList.remove("car-cursor-hidden");
  }, [isPointerInsideCar]);

  useEffect(() => {
    document.body.classList.toggle("car-showcase-expanded", isExpanding || isExpanded);
    return () => document.body.classList.remove("car-showcase-expanded");
  }, [isExpanding, isExpanded]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeExpanded();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (expandTimer.current !== null) window.clearTimeout(expandTimer.current);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let teardown = () => {};
    let bootObserver: IntersectionObserver | null = null;

    void (async () => {
      // Don't parse models or create a second WebGL context during the hero.
      await new Promise<void>((resolve) => {
        const stage = stageRef.current;
        if (!stage) { resolve(); return; }
        bootObserver = new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting) return;
          bootObserver?.disconnect();
          resolve();
        }, { rootMargin: "800px" });
        bootObserver.observe(stage);
      });
      if (disposed) return;
      const [{ GLTFLoader }, THREE, { mergeGeometries }, { MeshoptDecoder: meshoptDecoder }] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three"),
        import("three/addons/utils/BufferGeometryUtils.js"),
        import("three/addons/libs/meshopt_decoder.module.js"),
      ]);
      const stage = stageRef.current;
      if (!stage || disposed) return;
      // Decoding neighbors stays off the animation's main thread.
      meshoptDecoder.useWorkers(2);
      const modelLoader = new GLTFLoader().setMeshoptDecoder(meshoptDecoder);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.className = "lab-car__canvas";
      stage.appendChild(renderer.domElement);

      const carGroup = new THREE.Group();
      scene.add(carGroup);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 2.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
      rimLight.position.set(-5, 2, -4);
      scene.add(rimLight);

      const defaultYaw = -0.55;
      const defaultPitch = 0.08;
      const defaultCameraDistance = 5.85;
      let yaw = defaultYaw;
      let pitch = defaultPitch;
      let pointerId: number | null = null;
      let previousPointer = { x: 0, y: 0 };
      let animationFrame = 0;
      let isVisible = false;
      let isIntersecting = false;
      let rotationSpeed = 0;
      let isReturningToDefault = false;
      let isZoomReturning = false;
      let cameraDistance = defaultCameraDistance;
      let cameraTargetDistance = cameraDistance;
      let loadedModel: Object3D | null = null;
      const modelCache = new Map<number, Object3D>();
      const modelLoads = new Map<number, Promise<Object3D>>();
      let currentModelIndex = 0;
      let finishModelTransition: (() => void) | null = null;
      let modelTransitionStarted = 0;
      let transitionFrameTimes: number[] = [];
      let transitionLastFrame = 0;
      let carTriangles = 0;
      let carDrawCalls = 0;
      const preparedModels = new WeakMap<Object3D, Promise<void>>();
      // Keep the outgoing image on the GPU: no PNG encoding, CPU readback,
      // Image.decode, SVG masks or 48 DOM attribute writes per frame.
      const outgoingFrame = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false, samples: 2 });
      const warmupFrame = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false });
      const blindsScene = new THREE.Scene();
      const blindsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const blindsMaterial = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false, toneMapped: true,
        uniforms: { frame: { value: outgoingFrame.texture }, background: { value: new THREE.Color() }, elapsed: { value: 0 }, forward: { value: 1 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `uniform sampler2D frame; uniform vec3 background; uniform float elapsed; uniform float forward; varying vec2 vUv;
          void main() {
            float column = min(floor(vUv.x * 24.0), 23.0);
            float order = mix(column, 23.0 - column, forward);
            float p = clamp((elapsed - order * 14.0) / 420.0, 0.0, 1.0);
            p = p * p * (3.0 - 2.0 * p);
            if (abs(fract(vUv.x * 24.0) - 0.5) * 2.0 >= 1.001 - p) discard;
            vec4 old = texture2D(frame, vUv);
            gl_FragColor = vec4(old.rgb, 1.0);
            #include <tonemapping_fragment>
            gl_FragColor.rgb = mix(background, gl_FragColor.rgb, old.a);
            #include <colorspace_fragment>
          }`,
      });
      const blindsGeometry = new THREE.PlaneGeometry(2, 2);
      blindsScene.add(new THREE.Mesh(blindsGeometry, blindsMaterial));
      let hasStartedRendering = false;
      let lastRenderWidth = 0;
      let lastRenderHeight = 0;
      let lastPixelRatio = 0;
      let lastFrameTime = 0;
      let viewOffsetX = 0;
      let viewOffsetY = 0;
      let clipReveal: Animation | null = null;
      let framing: {
        kind: "expand" | "collapse";
        startedAt: number;
        duration: number;
        fromZoom: number;
        toZoom: number;
        fromOffsetX: number;
        toOffsetX: number;
        fromOffsetY: number;
        toOffsetY: number;
        fromDistance: number;
        toDistance: number;
        fromPitch: number;
        toPitch: number;
        onComplete: () => void;
      } | null = null;

      const applyProjection = () => {
        if (Math.abs(viewOffsetX) > 0.001 || Math.abs(viewOffsetY) > 0.001) {
          camera.setViewOffset(lastRenderWidth, lastRenderHeight, viewOffsetX, viewOffsetY, lastRenderWidth, lastRenderHeight);
        } else if (camera.view?.enabled) {
          camera.clearViewOffset();
        } else {
          camera.updateProjectionMatrix();
        }
      };

      const expandedCenterOffsetX = (distance: number) => {
        const railWidth = document.querySelector<HTMLElement>(".desktop-rail")?.getBoundingClientRect().width ?? 0;
        if (!loadedModel || !lastRenderWidth) return -railWidth / 2;

        const previousZoom = camera.zoom;
        const previousZ = camera.position.z;
        const previousOffsetX = viewOffsetX;
        const previousOffsetY = viewOffsetY;
        const previousPitch = carGroup.rotation.x;
        camera.zoom = 1;
        camera.position.z = distance;
        camera.updateMatrixWorld(true);
        carGroup.rotation.x = defaultPitch;
        carGroup.updateMatrixWorld(true);
        const projectedModelCenterX = (offset: number) => {
          viewOffsetX = offset;
          viewOffsetY = 0;
          applyProjection();
          camera.updateMatrixWorld(true);
          carGroup.updateMatrixWorld(true);
          const center = new THREE.Vector3(0, 0, 0).applyMatrix4(carGroup.matrixWorld).project(camera);
          return (center.x + 1) * lastRenderWidth / 2;
        };
        const baseX = projectedModelCenterX(0);
        const shiftedX = projectedModelCenterX(100);
        const slope = (shiftedX - baseX) / 100;
        const gridLines = Array.from(document.querySelectorAll<HTMLElement>(".layout-grid__vertical-line"));
        const stageBounds = stage.getBoundingClientRect();
        const visibleGridLines = gridLines.filter((line) => line.getClientRects().length > 0);
        const secondGridLine = visibleGridLines.find((line) => line.querySelector("span")?.textContent?.trim() === "V2");
        const innerRightGridLine = visibleGridLines.at(-2);
        const secondGridX = secondGridLine?.getBoundingClientRect().left;
        const innerRightGridX = innerRightGridLine?.getBoundingClientRect().left;
        const targetX = Number.isFinite(secondGridX) && Number.isFinite(innerRightGridX)
          ? ((secondGridX! + innerRightGridX!) / 2) - stageBounds.left
          : lastRenderWidth * (13 / 24);
        const offset = Math.abs(slope) > 0.01 ? (targetX - baseX) / slope : -railWidth / 2;

        camera.zoom = previousZoom;
        camera.position.z = previousZ;
        camera.updateMatrixWorld(true);
        carGroup.rotation.x = previousPitch;
        carGroup.updateMatrixWorld(true);
        viewOffsetX = previousOffsetX;
        viewOffsetY = previousOffsetY;
        applyProjection();
        return Math.max(-lastRenderWidth / 3, Math.min(lastRenderWidth / 3, offset));
      };

      const paint = () => {
        camera.position.z = cameraDistance;
        carGroup.rotation.set(pitch, yaw, 0);
        renderer.render(scene, camera);
        carTriangles = renderer.info.render.triangles;
        carDrawCalls = renderer.info.render.calls;
        if (finishModelTransition) {
          const now = performance.now();
          const elapsed = now - modelTransitionStarted;
          if (import.meta.env.DEV && transitionLastFrame) transitionFrameTimes.push(now - transitionLastFrame);
          transitionLastFrame = now;
          blindsMaterial.uniforms.elapsed.value = elapsed;
          renderer.autoClear = false;
          renderer.render(blindsScene, blindsCamera);
          renderer.autoClear = true;
          if (elapsed >= 742) finishModelTransition();
        }
      };

      const resize = () => {
        const bounds = stage.getBoundingClientRect();
        if (bounds.width < 2 || bounds.height < 2) return false;
        const width = Math.round(bounds.width);
        const height = Math.round(bounds.height);
        const preferredPixelRatio = expandedRef.current
          ? Math.min(window.devicePixelRatio || 1, 2)
          : Math.min(window.devicePixelRatio || 1, 1.25);
        const pixelBudget = expandedRef.current ? 4_200_000 : 1_800_000;
        const pixelRatio = Math.min(preferredPixelRatio, Math.sqrt(pixelBudget / (width * height)));
        if (width === lastRenderWidth && height === lastRenderHeight && Math.abs(pixelRatio - lastPixelRatio) < 0.001) return false;
        lastRenderWidth = width;
        lastRenderHeight = height;
        lastPixelRatio = pixelRatio;
        camera.aspect = width / height;
        applyProjection();
        // setPixelRatio() calls setSize() internally in this Three.js version.
        // This writes the drawing buffer only once for the new stage geometry.
        renderer.setDrawingBufferSize(width, height, pixelRatio);
        // One reusable snapshot target, allocated only when its size changes.
        outgoingFrame.setSize(renderer.domElement.width, renderer.domElement.height);
        return true;
      };

      const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;
      const disposeModel = (model: Object3D) => {
        const geometries = new Set<BufferGeometry>();
        const materials = new Set<Material>();
        const textures = new Set<Texture>();
        model.traverse((object: Object3D) => {
          if (!(object instanceof THREE.Mesh)) return;
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material);
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) textures.add(value);
            }
          }
        });
        geometries.forEach((geometry) => geometry.dispose());
        const bitmaps = new Set<ImageBitmap>();
        textures.forEach((texture) => {
          if (typeof ImageBitmap !== "undefined" && texture.source.data instanceof ImageBitmap) bitmaps.add(texture.source.data);
          texture.dispose();
        });
        bitmaps.forEach((bitmap) => bitmap.close());
        materials.forEach((material) => material.dispose());
      };
      const pruneModelCache = (center: number) => {
        for (const [index, model] of modelCache) {
          if (Math.abs(index - center) <= 1) continue;
          modelCache.delete(index);
          disposeModel(model);
        }
      };
      const loadModel = async (index: number): Promise<Object3D> => {
        const cached = modelCache.get(index);
        if (cached) return cached;
        const inFlight = modelLoads.get(index);
        if (inFlight) return inFlight;
        const car = showcaseCars[index];
        if (!car) throw new RangeError(`No showcase car exists at index ${index}`);
        const assetName = car.model.split("/").at(-1)!;
        const request = modelLoader.loadAsync(publicAsset(`models/optimized/${assetName}`)).then(async (gltf) => {
          const model = gltf.scene;
          // The Bugatti GLB's forward axis is opposite to the other showcase cars.
          if (car.name === "Bugatti - La Voiture Noire") model.rotation.y = Math.PI;
          // The Type 57SC is authored along the X axis, unlike the gallery's
          // Z-forward cars. Turn its nose toward the camera without mirroring it.
          if (car.name === "1936 Bugatti Type 57SC Atlantic") model.rotation.y = -Math.PI / 2;
          // Give the BMW the Miura's restrained metallic paint finish in blue,
          // leaving its glass, lights, trim, wheels, and texture maps intact.
          if (car.name === "BMW M8 F92 Coupé Competition") {
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial) || material.name !== "m8f92_CarPaint") continue;
                material.color.set("#245d9f");
                material.metalness = 0.10819;
                material.roughness = 0.105737;
                if (material instanceof THREE.MeshPhysicalMaterial) {
                  material.specularIntensity = 0.163048;
                  material.clearcoat = 0;
                }
              }
            });
          }
          if (car.name === "1925 Rolls Royce Phantom I Jonckheere Coupe") {
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial) || material.name !== "Car_Base") continue;
                material.color.set("#5f9e6e");
                material.metalness = 0.28;
                material.roughness = 0.3;
              }
            });
          }
          if (car.name === "2017 Lexus LC 500") {
            const darkInterior = "interiorVariant" in car && car.interiorVariant === "red-and-black";
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial)) continue;
                if (material.name === "CUERO") {
                  material.color.set(darkInterior ? "#29282b" : "#684b37");
                  if (darkInterior) material.roughness = 0.44;
                }
                // Authored fabric is mustard yellow on the pillars and mirror
                // housing. Keep it in the dashboard's muted cream-beige range,
                // rather than the much lighter original recolor.
                if (material.name === "TELA") material.color.set(darkInterior ? "#414348" : "#9e795e");
                // This separate interior trim material carries the factory-dark
                // details. Tint only this interior material red; CHROME remains
                // untouched so the metallic accents keep their original finish.
                if (darkInterior && material.name === "Lexus_LC500TNR0_2018InteriorA_Material") material.color.set("#a51c2a");
              }
            });
          }
          if (car.name === "BMW M8 F92 Coupé Competition" || car.name === "2020 Mercedes AVTR Concept") {
            const glassMaterialNames = car.name === "BMW M8 F92 Coupé Competition"
              ? new Set(["m8f92_glass"])
              : new Set(["avtr_glass", "avtr_glass.001"]);
            const windowOpacity = car.name === "BMW M8 F92 Coupé Competition" ? 0.48 : 0.1;
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial) || !glassMaterialNames.has(material.name)) continue;
                material.opacity = windowOpacity;
                material.transparent = true;
                material.depthWrite = false;
                if (car.name === "BMW M8 F92 Coupé Competition") {
                  material.color.set("#303b46");
                  material.roughness = 0.18;
                  material.metalness = 0;
                } else if (car.name === "2020 Mercedes AVTR Concept") {
                  material.color.setRGB(0.08, 0.09, 0.1);
                  material.metalness = 0;
                  material.roughness = 0;
                }
              }
            });
          }
          if (car.name === "Aston Martin DBS Superleggera 2019") {
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial) || material.name !== "ext_glass") continue;
                material.color.set("#343d46");
                material.opacity = 0.36;
                material.transparent = true;
                material.depthWrite = false;
                material.roughness = 0.18;
                material.metalness = 0;
              }
            });
          }
          if (car.name === "2015 Mazda RX-Vision Concept") {
            model.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial) || !["body", "body_add"].includes(material.name)) continue;
                material.metalness = 0.12;
                material.roughness = 0.62;
              }
            });
          }
          if (car.name === "Pininfarina Battista") {
            const detachedWindow = model.getObjectByName("Window_Geo_lodA_battista_glass_0");
            if (detachedWindow) {
              detachedWindow.parent?.remove(detachedWindow);
              if (detachedWindow instanceof THREE.Mesh) {
                detachedWindow.geometry.dispose();
              }
            }
          }
          // Some exports split a static car into >1,000 opaque primitives.
          // Batch only identical-material, compatible leaf meshes. Glass,
          // skins, morphs, mirrored geometry and authored animations stay intact.
          const meshList: InstanceType<typeof THREE.Mesh>[] = [];
          model.traverse((object) => { if (object instanceof THREE.Mesh) meshList.push(object); });
          if (meshList.length > 250 && !gltf.animations.length) {
            model.updateMatrixWorld(true);
            const inverseRoot = model.matrixWorld.clone().invert();
            const buckets = new Map<string, InstanceType<typeof THREE.Mesh>[]>();
            for (const mesh of meshList) {
              const material = mesh.material;
              if (mesh instanceof THREE.SkinnedMesh || mesh.children.length || !mesh.visible || Array.isArray(material) || material.transparent ||
                Object.keys(mesh.geometry.morphAttributes).length || mesh.matrixWorld.determinant() < 0 ||
                (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0)) continue;
              const layout = Object.entries(mesh.geometry.attributes).map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`).sort().join("|");
              const key = `${material.uuid}:${mesh.renderOrder}:${Boolean(mesh.geometry.index)}:${layout}`;
              const bucket = buckets.get(key) ?? [];
              bucket.push(mesh); buckets.set(key, bucket);
            }
            const removed = new Set<BufferGeometry>();
            for (const bucket of buckets.values()) {
              if (bucket.length < 2) continue;
              await yieldForUpload();
              if (disposed) { disposeModel(model); return model; }
              const baked: BufferGeometry[] = [];
              for (let part = 0; part < bucket.length; part++) {
                const mesh = bucket[part];
                baked.push(mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld)));
                if (part % 12 === 11) await yieldForUpload();
              }
              const geometry = mergeGeometries(baked, false);
              baked.forEach((part) => part.dispose());
              if (!geometry) continue;
              const merged = new THREE.Mesh(geometry, bucket[0].material);
              merged.name = `Batched_${bucket[0].name}`;
              merged.renderOrder = bucket[0].renderOrder;
              bucket.forEach((mesh) => { removed.add(mesh.geometry); mesh.removeFromParent(); });
              model.add(merged);
            }
            model.traverse((object) => { if (object instanceof THREE.Mesh) removed.delete(object.geometry); });
            removed.forEach((geometry) => geometry.dispose());
          }
          const bounds = new THREE.Box3().setFromObject(model);
          const centre = bounds.getCenter(new THREE.Vector3());
          const size = bounds.getSize(new THREE.Vector3());
          const scale = 4.55 / Math.max(size.x, size.y, size.z, 0.001);
          model.scale.setScalar(scale);
          model.position.copy(centre).multiplyScalar(-scale);
          model.position.y += 0.08;
          if (disposed || Math.abs(index - currentModelIndex) > 1) {
            disposeModel(model);
            return model;
          }
          modelCache.set(index, model);
          return model;
        }).finally(() => modelLoads.delete(index));
        modelLoads.set(index, request);
        return request;
      };
      const maintainModelWindow = (center: number) => {
        pruneModelCache(center);
        for (const index of [center - 1, center + 1]) {
          if (index < 0 || index >= showcaseCars.length) continue;
          void loadModel(index).then((model) => {
            if (!disposed && modelCache.get(index) === model) return prepareModel(model);
          }).catch((error) => console.error(`Could not preload ${showcaseCars[index].name}`, error));
        }
      };
      const yieldForUpload = () => new Promise<void>((resolve) => window.setTimeout(resolve, 16));
      const prepareModel = (model: Object3D) => {
        const existing = preparedModels.get(model);
        if (existing) return existing;
        const work = (async () => {
          const textures = new Set<Texture>();
          model.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
            }
          });
          // Upload separately instead of stalling the first frame of the wipe.
          for (const texture of textures) {
            await yieldForUpload();
            if (disposed || !Array.from(modelCache.values()).includes(model)) return;
            renderer.initTexture(texture);
          }
          if (disposed || !Array.from(modelCache.values()).includes(model)) return;
          await renderer.compileAsync(model, camera, scene);
          // The outgoing capture renders linear HDR; compile that variant too.
          // Restore the target before awaiting, so the live loop stays intact.
          renderer.setRenderTarget(warmupFrame);
          const captureProgram = renderer.compileAsync(model, camera, scene);
          renderer.setRenderTarget(null);
          await captureProgram;
          if (disposed || !Array.from(modelCache.values()).includes(model)) return;
          const warmScene = new THREE.Scene();
          warmScene.add(scene.children.find((object) => object instanceof THREE.HemisphereLight)!.clone(), keyLight.clone(), rimLight.clone());
          warmScene.add(model);
          renderer.setRenderTarget(warmupFrame);
          renderer.render(warmScene, camera);
          renderer.setRenderTarget(null);
          warmScene.remove(model);
        })();
        preparedModels.set(model, work);
        return work;
      };
      const revealNewModel = (direction: "left-to-right" | "right-to-left") => new Promise<void>((resolve) => {
        modelTransitionStarted = performance.now();
        transitionFrameTimes = [];
        transitionLastFrame = 0;
        blindsMaterial.uniforms.elapsed.value = 0;
        blindsMaterial.uniforms.forward.value = direction === "right-to-left" ? 1 : 0;
        finishModelTransition = () => {
          finishModelTransition = null;
          if (import.meta.env.DEV) {
            const times = [...transitionFrameTimes].sort((a, b) => a - b);
            stage.dataset.carTransitionStats = JSON.stringify({ model: showcaseCars[currentModelIndex].name, direction,
              frames: times.length, p95: Number((times[Math.floor(times.length * 0.95)] ?? 0).toFixed(1)),
              worst: Number((times.at(-1) ?? 0).toFixed(1)), cachedModels: modelCache.size,
              triangles: carTriangles, drawCalls: carDrawCalls, textures: renderer.info.memory.textures });
          }
          resolve();
        };
        if (isVisible) startRendering();
        else finishModelTransition();
      });
      const clearClipReveal = () => {
        clipReveal?.cancel();
        clipReveal = null;
        renderer.domElement.style.removeProperty("clip-path");
      };
      const controller: CarTransitionController = {
        capture: () => {
          const rect = stage.getBoundingClientRect();
          return { rect, cornerRadius: getComputedStyle(stage).borderTopLeftRadius, distance: cameraDistance };
        },
        expand: (anchor, onComplete) => {
          framing = null;
          isZoomReturning = false;
          isReturningToDefault = false;
          const bounds = stage.getBoundingClientRect();
          const startClip = `inset(${Math.max(0, anchor.rect.top - bounds.top)}px ${Math.max(0, bounds.right - anchor.rect.right)}px ${Math.max(0, bounds.bottom - anchor.rect.bottom)}px ${Math.max(0, anchor.rect.left - bounds.left)}px round ${anchor.cornerRadius})`;
          renderer.domElement.style.clipPath = startClip;
          resize();
          camera.zoom = anchor.rect.height / bounds.height;
          viewOffsetX = bounds.width / 2 - (anchor.rect.left + anchor.rect.width / 2 - bounds.left);
          viewOffsetY = bounds.height / 2 - (anchor.rect.top + anchor.rect.height / 2 - bounds.top);
          cameraDistance = anchor.distance;
          cameraTargetDistance = cameraDistance;
          applyProjection();
          paint();
          const reveal = renderer.domElement.animate(
            [{ clipPath: startClip }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }],
            { duration: 700, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
          );
          clipReveal = reveal;
          reveal.onfinish = () => {
            if (clipReveal !== reveal) return;
            clearClipReveal();
          };
          framing = {
            kind: "expand", startedAt: performance.now(), duration: 1500,
            fromZoom: camera.zoom, toZoom: 1,
            fromOffsetX: viewOffsetX, toOffsetX: expandedCenterOffsetX(Math.max(4.55, anchor.distance * 0.8)),
            fromOffsetY: viewOffsetY, toOffsetY: 0,
            fromDistance: cameraDistance, toDistance: Math.max(4.55, anchor.distance * 0.8),
            fromPitch: pitch, toPitch: defaultPitch, onComplete,
          };
          isVisible = !document.hidden;
          if (isVisible) startRendering();
        },
        collapse: (anchor, onComplete) => {
          clearClipReveal();
          const bounds = stage.getBoundingClientRect();
          framing = {
            kind: "collapse", startedAt: performance.now(), duration: 1450,
            fromZoom: camera.zoom, toZoom: anchor.rect.height / bounds.height,
            fromOffsetX: viewOffsetX, toOffsetX: bounds.width / 2 - (anchor.rect.left + anchor.rect.width / 2 - bounds.left),
            fromOffsetY: viewOffsetY, toOffsetY: bounds.height / 2 - (anchor.rect.top + anchor.rect.height / 2 - bounds.top),
            fromDistance: cameraDistance, toDistance: anchor.distance,
            fromPitch: pitch, toPitch: defaultPitch, onComplete,
          };
          isZoomReturning = false;
          isReturningToDefault = false;
        },
        finishCollapse: () => {
          framing = null;
          camera.zoom = 1;
          viewOffsetX = 0;
          viewOffsetY = 0;
          cameraDistance = anchorDistance();
          cameraTargetDistance = cameraDistance;
          resize();
          applyProjection();
          paint();
        },
        changeModel: async (index) => {
          const nextModel = await loadModel(index);
          await prepareModel(nextModel);
          if (disposed) return;
          const direction = index > currentModelIndex ? "right-to-left" : "left-to-right";
          paint();
          if (!renderer.domElement.width || !renderer.domElement.height) {
            throw new Error("The car stage has no drawable area for its blinds transition");
          }
          // Capture once on-GPU. This is opaque over the entire stage, not just
          // the car silhouette, so the new car cannot leak through early.
          renderer.setRenderTarget(outgoingFrame);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          blindsMaterial.uniforms.background.value.set(getComputedStyle(stage).backgroundColor);
          const installModel = () => {
            if (loadedModel) carGroup.remove(loadedModel);
            loadedModel = nextModel;
            currentModelIndex = index;
            carGroup.add(nextModel);
            pruneModelCache(index);
          };
          installModel();
          // Prime the incoming display variant behind a completely closed
          // wipe before starting its clock. First-use driver work must not
          // consume the wipe's duration and jump straight to its last frame.
          blindsMaterial.uniforms.elapsed.value = 0;
          blindsMaterial.uniforms.forward.value = direction === "right-to-left" ? 1 : 0;
          paint();
          renderer.autoClear = false;
          renderer.render(blindsScene, blindsCamera);
          renderer.autoClear = true;
          const transition = revealNewModel(direction);
          await transition;
          if (!disposed) maintainModelWindow(index);
        },
      };
      const anchorDistance = () => cardAnchorRef.current?.distance ?? defaultCameraDistance;
      transitionControllerRef.current = controller;

      const render = (time: number) => {
        if (!isVisible) {
          animationFrame = 0;
          return;
        }
        const frameElapsed = lastFrameTime ? Math.max(time - lastFrameTime, 0) : 16.667;
        const elapsed = Math.min(frameElapsed, 50);
        const rotationElapsed = Math.min(frameElapsed, 120);
        lastFrameTime = time;
        if (framing) {
          const motion = framing;
          const progress = Math.min(1, Math.max(0, (time - motion.startedAt) / motion.duration));
          const eased = progress * progress * (3 - 2 * progress);
          camera.zoom = interpolate(motion.fromZoom, motion.toZoom, eased);
          viewOffsetX = interpolate(motion.fromOffsetX, motion.toOffsetX, eased);
          viewOffsetY = interpolate(motion.fromOffsetY, motion.toOffsetY, eased);
          cameraDistance = interpolate(motion.fromDistance, motion.toDistance, eased);
          cameraTargetDistance = cameraDistance;
          pitch = interpolate(motion.fromPitch, motion.toPitch, eased);
          if (motion.kind === "expand") {
            rotationSpeed = interpolate(rotationSpeed, 0.0026, 1 - Math.exp(-elapsed / 650));
          } else {
            rotationSpeed *= Math.exp(-elapsed / 280);
          }
          yaw += rotationSpeed * rotationElapsed / 16.667;
          applyProjection();
          paint();
          if (progress >= 1) {
            framing = null;
            motion.onComplete();
          }
        } else {
          if (expansionSettlingRef.current) {
            rotationSpeed *= Math.exp(-elapsed / 260);
            yaw += rotationSpeed * rotationElapsed / 16.667;
            pitch = interpolate(pitch, defaultPitch, 1 - Math.exp(-elapsed / 170));
          } else if (pointerId === null) {
            if (isReturningToDefault) {
              pitch = interpolate(pitch, defaultPitch, 1 - Math.exp(-elapsed / 900));
              if (Math.abs(defaultPitch - pitch) < 0.001) {
                pitch = defaultPitch;
                isReturningToDefault = false;
              }
            }
            rotationSpeed = interpolate(rotationSpeed, 0.0026, 1 - Math.exp(-elapsed / 320));
            yaw += rotationSpeed * rotationElapsed / 16.667;
          }
          if (isZoomReturning) {
            cameraTargetDistance = interpolate(cameraTargetDistance, defaultCameraDistance, 1 - Math.exp(-elapsed / 1400));
            if (Math.abs(defaultCameraDistance - cameraTargetDistance) < 0.01) {
              cameraTargetDistance = defaultCameraDistance;
              isZoomReturning = false;
            }
          }
          cameraDistance = interpolate(cameraDistance, cameraTargetDistance, 1 - Math.exp(-elapsed / 90));
          paint();
        }
        animationFrame = window.requestAnimationFrame(render);
      };

      const startRendering = () => {
        if (animationFrame) return;
        if (!hasStartedRendering) {
          yaw = defaultYaw;
          pitch = defaultPitch;
          rotationSpeed = 0;
          hasStartedRendering = true;
        }
        lastFrameTime = 0;
        animationFrame = window.requestAnimationFrame(render);
      };

      const stopRendering = () => {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      };

      const onPointerDown = (event: PointerEvent) => {
        if (framing || expansionSettlingRef.current) return;
        pointerId = event.pointerId;
        rotationSpeed = 0;
        isReturningToDefault = false;
        previousPointer = { x: event.clientX, y: event.clientY };
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.classList.add("is-dragging");
      };
      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        yaw += (event.clientX - previousPointer.x) * 0.012;
        pitch = Math.max(-0.32, Math.min(0.28, pitch + (event.clientY - previousPointer.y) * 0.006));
        previousPointer = { x: event.clientX, y: event.clientY };
      };
      const onPointerEnd = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        pointerId = null;
        isReturningToDefault = true;
        renderer.domElement.releasePointerCapture(event.pointerId);
        renderer.domElement.classList.remove("is-dragging");
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (framing || expansionSettlingRef.current) return;
        const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
        isZoomReturning = false;
        cameraTargetDistance = Math.max(3.2, Math.min(defaultCameraDistance, cameraTargetDistance + delta * 0.006));
      };
      const onCanvasLeave = () => {
        if (pointerId === null && cameraTargetDistance < defaultCameraDistance - 0.001 && !expandedRef.current) isZoomReturning = true;
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerEnd);
      renderer.domElement.addEventListener("pointercancel", onPointerEnd);
      renderer.domElement.addEventListener("pointerleave", onCanvasLeave);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      const observer = new ResizeObserver(() => {
        if (resize() && !animationFrame) paint();
      });
      observer.observe(stage);
      const syncRenderVisibility = () => {
        isVisible = !document.hidden && (expandedRef.current || isIntersecting);
        if (isVisible) startRendering();
        else { stopRendering(); finishModelTransition?.(); }
      };
      const visibilityObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        isIntersecting = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.12);
        syncRenderVisibility();
      }, { threshold: [0, 0.12] });
      visibilityObserver.observe(stage);
      document.addEventListener("visibilitychange", syncRenderVisibility);
      camera.position.set(0, 0.45, cameraDistance);
      camera.lookAt(0, 0, 0);
      resize();
      paint();

      void renderer.compileAsync(blindsScene, blindsCamera);
      void loadModel(0).then(async (model) => {
        await prepareModel(model);
        if (disposed || currentModelIndex !== 0) return;
        loadedModel = model;
        carGroup.add(model);
        maintainModelWindow(0);
        paint();
      }).catch((error) => console.error("Could not load Ferrari model", error));

      teardown = () => {
        if (transitionControllerRef.current === controller) transitionControllerRef.current = null;
        clearClipReveal();
        finishModelTransition?.();
        window.cancelAnimationFrame(animationFrame);
        observer.disconnect();
        visibilityObserver.disconnect();
        document.removeEventListener("visibilitychange", syncRenderVisibility);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerEnd);
        renderer.domElement.removeEventListener("pointercancel", onPointerEnd);
        renderer.domElement.removeEventListener("pointerleave", onCanvasLeave);
        renderer.domElement.removeEventListener("wheel", onWheel);
        modelCache.forEach(disposeModel);
        modelCache.clear();
        outgoingFrame.dispose();
        warmupFrame.dispose();
        blindsGeometry.dispose();
        blindsMaterial.dispose();
        renderer.dispose();
        meshoptDecoder.useWorkers(0);
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      bootObserver?.disconnect();
      teardown();
    };
  }, []);

  return (
    <>
    <article className={`lab-preview__placeholder lab-preview__placeholder--6 lab-car${isExpanding ? " is-expanding" : ""}${isExpanded ? " is-expanded" : ""}${isCameraTransitioning ? " is-camera-transitioning" : ""}${isCarChanging ? " is-changing" : ""}`} aria-label="Interactive car showcase">
      <div ref={stageRef} className="lab-car__stage" aria-label={`Rotate the ${showcaseCars[carIndex].name} by dragging`} onPointerEnter={() => setIsPointerInsideCar(true)} onPointerLeave={() => setIsPointerInsideCar(false)}>
        <button type="button" className="lab-car__expand" aria-label="Expand 3D showcase" onClick={beginExpand}><ExpandIcon size={17} /></button>
        <p className="lab-car__credit">
          <a href={showcaseCars[carIndex].url} target="_blank" rel="noreferrer">“{showcaseCars[carIndex].name}”</a> by {showcaseCars[carIndex].author}, Sketchfab, licensed under <a href={showcaseCars[carIndex].licenseUrl} target="_blank" rel="noreferrer">{showcaseCars[carIndex].license}</a>.
        </p>
      </div>
      <div className="lab-car__controls">
        <div className="lab-car__actions" aria-label="Car gallery controls">
          <button type="button" className="lab-car__action" data-fluid-cursor-surface data-fluid-cursor-dark-surface data-fluid-cursor-tight aria-label="Previous car" disabled={carIndex === 0} onClick={() => changeCar(-1)}><ArrowLeftIcon size={15} /></button>
          <button type="button" className="lab-car__action" data-fluid-cursor-surface data-fluid-cursor-dark-surface data-fluid-cursor-tight aria-label="Next car" disabled={carIndex === showcaseCars.length - 1} onClick={() => changeCar(1)}><ArrowRightIcon size={15} /></button>
        </div>
        <button type="button" className="lab-car__info" aria-label="About this 3D showcase" data-cursor-tool data-cursor-title="" data-cursor-description="Here’s a showcase of some of my all-time favorite cars, with details about each one! Scroll to zoom in or out, and drag to rotate the model" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      </div>
    </article>
    {isExpanded && typeof document !== "undefined" ? createPortal(
      <div className={`lab-car__expanded-overlay${isCameraTransitioning ? " is-camera-transitioning" : ""}`}>
        <p className="lab-car__description">Car details coming soon.</p>
        <div className="lab-car__expanded-ui">
          <div className="lab-car__expanded-left">
            <button type="button" className="lab-car__back" aria-label="Return to page" onClick={closeExpanded}><NavArrowLeftIcon size={34} /></button>
            <span className="lab-car__back-label" aria-hidden="true">HOMEPAGE</span>
          </div>
          <div className="lab-car__expanded-nav" aria-label="Car gallery controls">
            <button type="button" className="lab-car__action" aria-label="Previous car" disabled={carIndex === 0} onClick={() => changeCar(-1)}><ArrowLeftIcon size={24} /></button>
            <button type="button" className="lab-car__action" aria-label="Next car" disabled={carIndex === showcaseCars.length - 1} onClick={() => changeCar(1)}><ArrowRightIcon size={24} /></button>
          </div>
        </div>
      </div>, document.body) : null}
    </>
  );
}
function VisualMemoryGame() {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<MemoryCell[]>([]);
  const [selected, setSelected] = useState<MemoryCell[]>([]);
  const [errors, setErrors] = useState<MemoryCell[]>([]);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<MemoryStatus>("ready");
  const [revealPhase, setRevealPhase] = useState<MemoryRevealPhase>("idle");
  const [resultFadeMode, setResultFadeMode] = useState<"none" | "all" | "white" | "fast">("none");
  const [isBoardTransitioning, setIsBoardTransitioning] = useState(false);
  const [isControlLeaving, setIsControlLeaving] = useState(false);

  const [isPointerInsideGame, setIsPointerInsideGame] = useState(false);
  const [highScore, setHighScore] = useState<number | null>(null);
  const memoryTimers = useRef<number[]>([]);

  const clearMemoryTimers = () => {
    memoryTimers.current.forEach((timer) => window.clearTimeout(timer));
    memoryTimers.current = [];
  };

  const scheduleMemoryStep = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      memoryTimers.current = memoryTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);
    memoryTimers.current.push(timer);
  };

  useEffect(() => () => clearMemoryTimers(), []);

  const shouldHideMemoryCursor = isPointerInsideGame && (isControlLeaving || (status !== "ready" && status !== "gameover"));

  useEffect(() => {
    document.documentElement.classList.toggle("memory-cursor-hidden", shouldHideMemoryCursor);
    return () => document.documentElement.classList.remove("memory-cursor-hidden");
  }, [shouldHideMemoryCursor]);

  const beginStage = (nextLevel: number, revealDelay = 500) => {
    clearMemoryTimers();
    const nextGridSize = memoryGridSize(nextLevel);

    const setUpStage = () => {
      setLevel(nextLevel);
      setGridSize(nextGridSize);
      setPattern(makeMemoryPattern(nextGridSize, memoryPatternSize(nextLevel)));
      setSelected([]);
      setErrors([]);
      setStatus("preparing");
      setRevealPhase("idle");
      setResultFadeMode("none");
      setIsBoardTransitioning(false);
      setIsControlLeaving(false);
      scheduleMemoryStep(() => {
        setStatus("revealing");
        setRevealPhase("entering");
        scheduleMemoryStep(() => {
          setRevealPhase("shown");
          scheduleMemoryStep(() => {
            setRevealPhase("hiding");
            scheduleMemoryStep(() => {
              setRevealPhase("idle");
              setStatus("recalling");
            }, 300);
          }, 1200);
        }, 300);
      }, revealDelay);
    };

    if (nextGridSize !== gridSize) {
      setIsBoardTransitioning(true);
      scheduleMemoryStep(setUpStage, 260);
      return;
    }

    setUpStage();
  };
  const start = () => {
    clearMemoryTimers();
    setIsControlLeaving(true);
    setLives(3);
    scheduleMemoryStep(() => beginStage(1, 720), 180);
  };

  const retry = () => {
    clearMemoryTimers();
    setIsControlLeaving(true);
    setResultFadeMode("fast");
    scheduleMemoryStep(() => {
      setLives(3);
      beginStage(1, 720);
    }, 180);
  };
  const finishStage = (didWin: boolean) => {
    setStatus("recap");
    setResultFadeMode("none");

    if (didWin) {
      setHighScore((current) => Math.max(current ?? 0, level));
      scheduleMemoryStep(() => setResultFadeMode("all"), 260);
      scheduleMemoryStep(() => beginStage(level + 1), 850);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);

    if (nextLives <= 0) {
      // On game over, let correct tiles dissolve while mistakes return to normal.
      setStatus("gameover");
      scheduleMemoryStep(() => setResultFadeMode("all"), 260);
      return;
    }

    scheduleMemoryStep(() => setResultFadeMode("all"), 260);
    scheduleMemoryStep(() => beginStage(level), 850);
  };
  const selectCell = (cell: MemoryCell) => {
    if (status !== "recalling" || includesMemoryCell(selected, cell) || includesMemoryCell(errors, cell)) return;

    if (!includesMemoryCell(pattern, cell)) {
      const nextErrors = [...errors, cell];
      setErrors(nextErrors);
      if (nextErrors.length >= 3) finishStage(false);
      return;
    }

    const nextSelected = [...selected, cell];
    setSelected(nextSelected);
    if (nextSelected.length === pattern.length) finishStage(true);
  };

  const isPatternVisible = (cell: MemoryCell) => status === "revealing" && includesMemoryCell(pattern, cell);
  const canShowResult = status === "recalling" || status === "recap" || status === "gameover";
  const isSelected = (cell: MemoryCell) => canShowResult && includesMemoryCell(selected, cell);
  const isError = (cell: MemoryCell) => canShowResult && includesMemoryCell(errors, cell);

  return (
    <article className="lab-preview__placeholder lab-preview__placeholder--1 lab-visual-memory" aria-label="Visual memory game" onPointerEnter={() => setIsPointerInsideGame(true)} onPointerLeave={() => setIsPointerInsideGame(false)}>
      <div className="lab-visual-memory__topline">
        <div className="lab-visual-memory__scoreline">
          <span className="lab-visual-memory__level" data-fluid-cursor-native-ink>{"Lvl " + level}</span>
          {highScore !== null ? <span className="lab-visual-memory__high-score" data-fluid-cursor-native-ink><SparkIcon size={15} /><span>{highScore}</span></span> : null}
        </div>
        <div className="lab-visual-memory__actions">
          <span className="lab-visual-memory__lives" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask aria-label={lives + " lives remaining"}>{[0, 1, 2].map((heart) => <HeartIcon key={heart} className={heart >= lives ? "is-lost" : undefined} />)}</span>
          <button type="button" aria-label="How to play visual memory" data-cursor-tool data-cursor-title="" data-cursor-description="Watch the pattern, then repeat it. Three wrong clicks cost a life. See how far you can get!" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
        </div>
      </div>
      <div id="visual-memory-board" className={`lab-visual-memory__board${isBoardTransitioning ? " is-transitioning" : ""}`} style={{ "--memory-grid": gridSize } as CSSProperties}>
        {Array.from({ length: gridSize * gridSize }, (_, index) => {
          const cell = { x: index % gridSize, y: Math.floor(index / gridSize) };
          const phaseClass = isPatternVisible(cell) ? " is-revealed is-" + revealPhase : "";
          return <button key={cell.x + "-" + cell.y} type="button" className={"lab-visual-memory__cell" + phaseClass + (isSelected(cell) ? " is-selected" : "") + (isError(cell) ? " is-error" : "") + (resultFadeMode !== "none" ? " is-result-fade-" + resultFadeMode : "")} onClick={() => selectCell(cell)} aria-label={"Tile " + (index + 1)} disabled={status !== "recalling"} />;
        })}
        {status === "ready" ? <button type="button" className={`lab-visual-memory__play${isControlLeaving ? " is-leaving" : ""}`} data-fluid-cursor-surface data-fluid-cursor-tight aria-label="Start visual memory game" onClick={start}><PlayIcon size={15} /></button> : null}
        {status === "gameover" ? <button type="button" className={`lab-visual-memory__retry${isControlLeaving ? " is-leaving" : ""}`} data-fluid-cursor-surface data-fluid-cursor-tight onClick={retry}>Try Again</button> : null}
      </div>
    </article>
  );
}
function ServiceStack({ service, heading = "The stack:" }: { service: Service; heading?: string }) {
  return (
    <section className="service-stack" aria-label={`${heading} for ${service.title}`}>
      <h6>{heading}</h6>
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
              className={`service-stack__tile${item.icon || item.src || item.symbol ? " service-stack__tile--logo" : ""}${item.framed ? " service-stack__tile--framed" : ""}${item.solid ? " service-stack__tile--solid" : ""}`}
                aria-hidden="true"
                style={{ "--stack-tool-color": item.color } as CSSProperties}
              >
                {item.badge}
                {item.symbol === "code" ? <CodeIcon size={17} className="service-stack__symbol" /> : null}
                {(item.icon || item.src) ? <img className={`service-stack__logo${item.invert ? " service-stack__logo--invert" : ""}${item.logoClass ? ` service-stack__logo--${item.logoClass}` : ""}`} src={item.src ?? deviconSvg(item.icon!)} alt="" aria-hidden="true" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type SkillsSectionProps = {
  experiment?: boolean;
  idSuffix?: string;
  cardVariant?: "default" | "stacked";
  originalCopy?: boolean;
  toolsLabel?: string;
};

const experimentSummaries: Record<string, string> = {
  "webapp-ui-design": "I shape content, requirements, and user needs into clear responsive websites and interfaces that can move into production.",
  "strategy-brand-consulting": "I clarify ideas, audiences, and visual direction before shaping useful brands and digital experiences.",
  "front-end-technical-delivery": "I turn approved designs into responsive, accessible websites with code or the right no-code platform.",
  "ai-workflows-automation": "I design supervised AI workflows, automate repetitive production work, and turn useful ideas into practical prototypes and tools.",
};

export function SkillsSection({ experiment = false, idSuffix, cardVariant = idSuffix === "third" ? "stacked" : "default", originalCopy = false, toolsLabel }: SkillsSectionProps = {}) {
  const [isProcessActionRevealed, setIsProcessActionRevealed] = useState(false);
  const sectionId = experiment ? `skills${idSuffix ? `-${idSuffix}` : "-experiment"}` : "skills";
  const headingId = experiment ? `skills-heading-cards${idSuffix ? `-${idSuffix}` : "-experiment"}` : "skills-heading-cards";
  const usesStackedCards = cardVariant === "stacked";

  return (
    <section className={`skills-section what-i-do what-i-do--cards${experiment ? " what-i-do--experiment" : ""}${usesStackedCards ? " what-i-do--stacked" : ""}${idSuffix ? ` what-i-do--${idSuffix}` : ""}`} id={sectionId} aria-labelledby={headingId}>
      <div className="skills-section__intro">
        <RevealTitle id={headingId} lines={["What I do"]} />
      </div>
      <SpotlightGrid className="service-summary-grid">
        {services.map((service) => (
          <SpotlightCard key={service.id} className={`service-summary-card${experiment ? " service-summary-card--experiment" : ""}`}>
            <span className={`service-summary-card__icon${experiment ? " service-summary-card__icon--experiment" : ""}${service.icon === "strategy" ? " service-summary-card__icon--strategy" : ""}`}>
              <ServiceIcon service={service} />
            </span>
            {experiment ? (
              usesStackedCards ? (
                <h5>{originalCopy ? service.cardTitle : service.id === "front-end-technical-delivery" ? "Code & No-Code Development" : service.cardTitle}</h5>
              ) : (
                <h6>{originalCopy ? service.cardTitle : service.id === "front-end-technical-delivery" ? "Code & No-Code Development" : service.cardTitle}</h6>
              )
            ) : (
              <h5>{service.cardTitle}</h5>
            )}
            <p>{experiment && !originalCopy ? experimentSummaries[service.id] : service.summary}</p>
            <ServiceStack service={service} heading={toolsLabel} />
          </SpotlightCard>
        ))}
      </SpotlightGrid>
      <div className="what-i-do__process">
        <RevealTitle as="h3" lines={["How do I do it?"]} onRevealSettled={() => setIsProcessActionRevealed(true)} />
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
  const [isInputPlaceholderVisible, setIsInputPlaceholderVisible] = useState(true);
  const [isInputVanishActive, setIsInputVanishActive] = useState(false);
  const isComplete = entry === phrase;
  const inputRef = useRef<HTMLInputElement>(null);
  const inputVanishCanvasRef = useRef<HTMLCanvasElement>(null);
  const resetFrame = useRef<number | null>(null);
  const vanishFrame = useRef<number | null>(null);
  const inputFadeTimer = useRef<number | null>(null);
  const isPointerInsideInput = useRef(false);
  const isPointerInsidePrompt = useRef(false);
  const inputClickPoint = useRef<{ x: number; y: number } | null>(null);

  const typedWords = entry.split(" ");
  const wordState = (index: number) => {
    const typedWord = typedWords[index] ?? "";
    const isLast = index === words.length - 1;
    // The final word is not submitted merely because a long paste reaches the
    // phrase's character count. It must actually be the current final token.
    const isFinalised = index < typedWords.length - 1 ||
      (isLast && typedWords.length === words.length && entry.length >= phrase.length);
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

  const cancelInputVanish = () => {
    if (vanishFrame.current !== null) window.cancelAnimationFrame(vanishFrame.current);
    vanishFrame.current = null;
    const canvas = inputVanishCanvasRef.current;
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
  };

  const vanishInputText = (value: string) => {
    const input = inputRef.current;
    const canvas = inputVanishCanvasRef.current;
    if (!input || !canvas || !value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

    cancelInputVanish();
    setIsInputPlaceholderVisible(false);
    setIsInputVanishActive(true);
    const bounds = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.scale(pixelRatio, pixelRatio);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.1;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textBaseline = "middle";
    context.fillText(value, paddingLeft, bounds.height / 2 + (lineHeight - fontSize) / 4);
    const textEnd = Math.min(bounds.width, paddingLeft + context.measureText(value).width);

    const source = context.getImageData(0, 0, width, height);
    const snapshot = document.createElement("canvas");
    snapshot.width = width;
    snapshot.height = height;
    snapshot.getContext("2d")?.putImageData(source, 0, 0);
    const particles: Array<{ x: number; y: number; alpha: number; drift: number; lift: number; releasedAt: number | null }> = [];
    const sample = Math.max(1, Math.round(pixelRatio));
    for (let y = 0; y < height; y += sample) {
      for (let x = 0; x < width; x += sample) {
        const alpha = source.data[(y * width + x) * 4 + 3];
        if (alpha < 96 || Math.random() < 0.18) continue;
        particles.push({
          x: x / pixelRatio,
          y: y / pixelRatio,
          alpha: alpha / 255,
          drift: 14 + Math.random() * 18,
          lift: (Math.random() - 0.5) * 12,
          releasedAt: null,
        });
      }
    }

    const startedAt = performance.now();
    const waveDuration = 540;
    const particleDuration = 310;
    const draw = (now: number) => {
      const waveProgress = Math.min(1, (now - startedAt) / waveDuration);
      const sweep = textEnd - (textEnd - paddingLeft + 8) * waveProgress;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      const overlap = 3;
      const preservedWidth = Math.min(bounds.width, Math.max(0, sweep + overlap));
      if (preservedWidth > 0) context.drawImage(snapshot, 0, 0, preservedWidth * pixelRatio, height, 0, 0, preservedWidth, bounds.height);
      context.fillStyle = style.color;
      for (const particle of particles) {
        if (particle.releasedAt === null && particle.x >= sweep - overlap) particle.releasedAt = now;
        if (particle.releasedAt === null) continue;
        const particleProgress = Math.min(1, (now - particle.releasedAt) / particleDuration);
        if (particleProgress >= 1) continue;
        context.globalAlpha = particle.alpha * (1 - particleProgress);
        context.fillRect(particle.x + particleProgress * particle.drift, particle.y + particleProgress * particle.lift, 1.15, 1.15);
      }
      context.globalAlpha = 1;
      const hasActiveParticles = particles.some((particle) => particle.releasedAt === null || now - particle.releasedAt < particleDuration);
      if (waveProgress < 1 || hasActiveParticles) {
        vanishFrame.current = window.requestAnimationFrame(draw);
        return;
      }
      cancelInputVanish();
      setIsInputVanishActive(false);
      setIsInputPlaceholderVisible(true);
    };
    vanishFrame.current = window.requestAnimationFrame(draw);
    return true;
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
      cancelInputVanish();
      clearInputCursorFade();
      showTypeCursor();
    };
  }, []);

  const displayedElapsed = resetElapsed ?? completionTime ?? elapsed;
  const formatTime = (value: number) => `${Math.floor(value / 60000)}:${String(Math.floor((value % 60000) / 1000)).padStart(2, "0")}.${Math.floor((value % 1000) / 100)}`;
  const time = formatTime(displayedElapsed);

  const restart = () => {
    if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
    if (!vanishInputText(entry)) {
      setIsInputVanishActive(false);
      setIsInputPlaceholderVisible(true);
    }
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
      <button type="button" className={`lab-type-racer__restart${startedAt ? " is-visible" : ""}`} tabIndex={startedAt ? 0 : -1} aria-hidden={!startedAt} aria-label="Restart type racer" data-cursor-tool data-cursor-compact data-cursor-title="" data-cursor-description="Restart timer" onClick={restart} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><RestartIcon /></button>
      <button type="button" className="lab-type-racer__info" aria-label="About this type racer" title="About this type racer" data-cursor-tool data-cursor-title="" data-cursor-description="Type the phrase exactly as it is in the shortest time possible!" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      <output className={`lab-type-racer__timer${completionTime !== null ? " is-complete" : ""}`} data-fluid-cursor-native-ink aria-live="polite">{time}</output>
      {highScore !== null ? <span className="lab-type-racer__high-score" data-fluid-cursor-native-ink aria-label={`Best time ${formatTime(highScore)}`}><SparkIcon size={15} /><span>{formatTime(highScore)}</span></span> : null}
      <p className="lab-type-racer__prompt" onPointerEnter={() => { isPointerInsidePrompt.current = true; if (startedAt && completionTime === null) scheduleInputCursorFade(); }} onPointerLeave={() => { isPointerInsidePrompt.current = false; clearInputCursorFade(); showTypeCursor(); }}>
        <span data-fluid-cursor-native-ink>{words.map((word, index) => <Fragment key={`${word}-${index}`}><span className={`lab-type-racer__word ${wordState(index)}${arrivingWordIndex === index ? " is-arriving" : ""}`}>{word}</span>{index < words.length - 1 ? " " : null}</Fragment>)}</span>
        <span data-fluid-cursor-native-ink>{isComplete ? "Done!" : `${entry.length}/${phrase.length}`}</span>
      </p>
      <div className={`lab-type-racer__input-wrap${isInputPlaceholderVisible ? " is-placeholder-visible" : ""}${isInputVanishActive ? " is-vanishing" : ""}`}>
        <input ref={inputRef} aria-label="Type the displayed phrase" value={entry} onPointerEnter={() => { isPointerInsideInput.current = true; }} onPointerLeave={() => { isPointerInsideInput.current = false; inputClickPoint.current = null; clearInputCursorFade(); showTypeCursor(); }} onPointerDown={(event) => { inputClickPoint.current = { x: event.clientX, y: event.clientY }; hideTypeCursor(); }} onChange={(event) => { if (isInputVanishActive) { cancelInputVanish(); setIsInputVanishActive(false); setIsInputPlaceholderVisible(true); } const nextEntry = event.target.value; const previousWordIndex = entry ? entry.split(" ").length - 1 : -1; const nextWordIndex = nextEntry ? nextEntry.split(" ").length - 1 : -1; if (nextWordIndex > previousWordIndex) setArrivingWordIndex(nextWordIndex); else if (nextWordIndex < previousWordIndex) setArrivingWordIndex(null); if (resetElapsed !== null) { cancelTimerReset(); setElapsed(0); } if (!startedAt && nextEntry) setStartedAt(Date.now()); setEntry(nextEntry); scheduleInputCursorFade(); }} placeholder="Type it here" spellCheck="false" autoCapitalize="off" autoComplete="off" />
        <canvas ref={inputVanishCanvasRef} className="lab-type-racer__vanish" aria-hidden="true" />
      </div>
    </article>
  );
}

type SnakeCell = { x: number; y: number };
type SnakeDirection = "up" | "down" | "left" | "right";

const snakeGridSize = 11;
const snakeStepMs = 260;
const initialSnake = (): SnakeCell[] => [
  { x: 3, y: 5 },
  { x: 2, y: 5 },
  { x: 1, y: 5 },
  { x: 1, y: 6 },
];

function snakeTurnClass(snake: SnakeCell[], index: number) {
  // The head and tail never need a corner: a bend only belongs to a body
  // square with a segment entering from the tail and another leaving to head.
  if (index === 0 || index === snake.length - 1) return "";
  const cell = snake[index];
  const towardHead = snake[index - 1];
  const towardTail = snake[index + 1];
  const arrival = { x: cell.x - towardTail.x, y: cell.y - towardTail.y };
  const departure = { x: towardHead.x - cell.x, y: towardHead.y - cell.y };

  // Two horizontal or two vertical neighbors mean this is a straight segment.
  if ((arrival.x !== 0) === (departure.x !== 0)) return "";

  // Round the corner that is forward from the arriving segment and opposite
  // the segment leaving toward the head. Example: up -> right is top-left.
  const vertical = arrival.y
    ? arrival.y < 0 ? "top" : "bottom"
    : departure.y < 0 ? "bottom" : "top";
  const horizontal = arrival.x
    ? arrival.x < 0 ? "left" : "right"
    : departure.x < 0 ? "right" : "left";
  return ` is-turn-${vertical}-${horizontal}`;
}

function snakeTailClass(snake: SnakeCell[], index: number) {
  if (index !== snake.length - 1 || snake.length < 2) return "";
  const tail = snake[index];
  const beforeTail = snake[index - 1];
  const tailDirection = { x: tail.x - beforeTail.x, y: tail.y - beforeTail.y };
  if (tailDirection.x < 0) return " is-tail-facing-left";
  if (tailDirection.x > 0) return " is-tail-facing-right";
  if (tailDirection.y < 0) return " is-tail-facing-up";
  return " is-tail-facing-down";
}

function SnakeGame() {
  const [snake, setSnake] = useState<SnakeCell[]>(initialSnake);
  const [food, setFood] = useState<SnakeCell>({ x: 2, y: 2 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [status, setStatus] = useState<"ready" | "playing" | "crashing" | "lost" | "won">("ready");
  const [isPointerInsideSnake, setIsPointerInsideSnake] = useState(false);
  const [isControlLeaving, setIsControlLeaving] = useState(false);
  const [isCrashVertical, setIsCrashVertical] = useState(false);
  const direction = useRef<SnakeDirection>("right");
  const directionQueue = useRef<SnakeDirection[]>([]);
  const snakeRef = useRef<SnakeCell[]>(initialSnake());
  const boardActive = useRef(false);
  const foodRef = useRef(food);
  const controlTimer = useRef<number | null>(null);
  const crashTimer = useRef<number | null>(null);

  useEffect(() => {
    const stored = Number.parseInt(window.localStorage.getItem("portfolio:snake:high-score") || "0", 10);
    if (Number.isFinite(stored)) setHighScore(stored);
  }, []);

  const shouldHideSnakeCursor = isPointerInsideSnake && (isControlLeaving || status === "playing" || status === "crashing");

  useEffect(() => {
    document.documentElement.classList.toggle("snake-cursor-hidden", shouldHideSnakeCursor);
    return () => document.documentElement.classList.remove("snake-cursor-hidden");
  }, [shouldHideSnakeCursor]);

  useEffect(() => () => {
    if (controlTimer.current !== null) window.clearTimeout(controlTimer.current);
    if (crashTimer.current !== null) window.clearTimeout(crashTimer.current);
  }, []);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  const createFood = (occupied: SnakeCell[]) => {
    const open: SnakeCell[] = [];
    for (let y = 0; y < snakeGridSize; y += 1) {
      for (let x = 0; x < snakeGridSize; x += 1) {
        if (!occupied.some((cell) => cell.x === x && cell.y === y)) open.push({ x, y });
      }
    }
    return open[Math.floor(Math.random() * open.length)] ?? { x: 0, y: 0 };
  };

  const resetGame = () => {
    if (crashTimer.current !== null) {
      window.clearTimeout(crashTimer.current);
      crashTimer.current = null;
    }
    const nextSnake = initialSnake();
    const nextFood = createFood(nextSnake);
    direction.current = "right";
    directionQueue.current = [];
    snakeRef.current = nextSnake;
    setSnake(nextSnake);
    foodRef.current = nextFood;
    setFood(nextFood);
    setScore(0);
    setStatus("playing");
  };

  const startFromControl = () => {
    boardActive.current = true;
    if (controlTimer.current !== null) window.clearTimeout(controlTimer.current);
    setIsControlLeaving(true);
    controlTimer.current = window.setTimeout(() => {
      controlTimer.current = null;
      resetGame();
      setIsControlLeaving(false);
    }, 180);
  };

  const requestDirection = (next: SnakeDirection) => {
    const opposite: Record<SnakeDirection, SnakeDirection> = { up: "down", down: "up", left: "right", right: "left" };
    if (status === "crashing") return;
    if (status !== "playing") {
      resetGame();
      // A fresh snake faces right; starting it left would immediately reverse
      // into its own four-segment body.
      if (next !== "left") directionQueue.current = [next];
      return;
    }

    // Validate against the last queued turn, not just the current heading. This
    // lets fast sequences such as right -> up -> left resolve across ticks.
    if (directionQueue.current.length >= 3) return;
    const priorDirection = directionQueue.current.at(-1) ?? direction.current;
    if (next === priorDirection || opposite[priorDirection] === next) return;
    directionQueue.current.push(next);
  };

  useEffect(() => {
    const keys: Record<string, SnakeDirection> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right",
    };
    const handleKey = (event: KeyboardEvent) => {
      const next = keys[event.key];
      if (!next || !boardActive.current) return;
      event.preventDefault();
      requestDirection(next);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status]);

  useEffect(() => {
    if (status !== "playing") return;
    const opposite: Record<SnakeDirection, SnakeDirection> = { up: "down", down: "up", left: "right", right: "left" };
    const delta: Record<SnakeDirection, SnakeCell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const timer = window.setInterval(() => {
      const current = snakeRef.current;
      const queuedDirection = directionQueue.current.shift();
      // A final guard keeps the queue valid even if a key event arrives as a
      // tick starts. Each accepted turn is still applied on its own tick.
      if (queuedDirection && opposite[direction.current] !== queuedDirection) {
        direction.current = queuedDirection;
      }

      const head = current[0];
      const nextHead = { x: head.x + delta[direction.current].x, y: head.y + delta[direction.current].y };
      const hitsWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= snakeGridSize || nextHead.y >= snakeGridSize;
      const isEating = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
      const bodyToCheck = isEating ? current : current.slice(0, -1);
      if (hitsWall || bodyToCheck.some((cell) => cell.x === nextHead.x && cell.y === nextHead.y)) {
        directionQueue.current = [];
        setIsCrashVertical(direction.current === "up" || direction.current === "down");
        setStatus("crashing");
        const crashDuration = 260 + Math.max(0, current.length - 1) * 12;
        if (crashTimer.current !== null) window.clearTimeout(crashTimer.current);
        crashTimer.current = window.setTimeout(() => {
          crashTimer.current = null;
          setStatus("lost");
        }, crashDuration);
        return;
      }

      const nextSnake = isEating ? [nextHead, ...current] : [nextHead, ...current.slice(0, -1)];
      snakeRef.current = nextSnake;
      setSnake(nextSnake);
      if (!isEating) return;

      const nextScore = nextSnake.length - initialSnake().length;
      setScore(nextScore);
      setHighScore((currentHigh) => {
        const nextHigh = Math.max(currentHigh, nextScore);
        window.localStorage.setItem("portfolio:snake:high-score", String(nextHigh));
        return nextHigh;
      });
      if (nextSnake.length === snakeGridSize * snakeGridSize) {
        setStatus("won");
        return;
      }
      const nextFood = createFood(nextSnake);
      foodRef.current = nextFood;
      setFood(nextFood);
    }, snakeStepMs);
    return () => window.clearInterval(timer);
  }, [status]);

  return (
    <article className="lab-preview__placeholder lab-preview__placeholder--5 lab-snake" aria-label="Snake game" onPointerEnter={() => setIsPointerInsideSnake(true)} onPointerLeave={() => { setIsPointerInsideSnake(false); boardActive.current = false; }}>
      <div className="lab-snake__topline">
        <span className="lab-snake__score" data-fluid-cursor-native-ink><i aria-hidden="true" />{String(score).padStart(2, "0")}</span>
        {highScore > 0 ? <span className="lab-snake__high-score" data-fluid-cursor-native-ink aria-label={`High score ${highScore}`}><SparkIcon size={15} /><span>{String(highScore).padStart(2, "0")}</span></span> : null}
        <button type="button" className="lab-snake__info" aria-label="How to play Snake" data-cursor-tool data-cursor-title="" data-cursor-description="Grow by eating the food scattered across the canvas and avoid crashing into the border or yourself! Use WASD or the arrow keys to move" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      </div>
      <div className={`lab-snake__board${status === "crashing" ? ` is-crashing${isCrashVertical ? " is-crash-vertical" : ""}` : status === "lost" || status === "won" ? " is-paused" : ""}`} onPointerEnter={() => { boardActive.current = true; }} aria-label={status === "playing" ? "Snake game board" : "Snake game"}>
        <span className="lab-snake__grid" aria-hidden="true">{Array.from({ length: snakeGridSize * snakeGridSize }, (_, index) => <i key={index} />)}</span>
        <span className="lab-snake__cells" aria-hidden="true">
          {snake.map((cell, index) => {
            const shakeDistance = Math.max(0.015, 0.18 * Math.pow(0.94, index));
            return <i key={`${cell.x}-${cell.y}-${index}`} className={`lab-snake__segment${index < 4 ? ` is-tone-${index + 1}` : ""}${snakeTurnClass(snake, index)}${snakeTailClass(snake, index)}`} style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1, "--snake-shake-delay": `${index * 12}ms`, "--snake-shake-distance": `${shakeDistance}rem` } as CSSProperties} />;
          })}
          <i className="lab-snake__food" style={{ gridColumn: food.x + 1, gridRow: food.y + 1 } as CSSProperties} />
        </span>
        {status === "ready" ? <button type="button" className={`lab-visual-memory__play${isControlLeaving ? " is-leaving" : ""}`} data-fluid-cursor-surface data-fluid-cursor-tight aria-label="Start Snake" onClick={startFromControl}><PlayIcon size={15} /></button> : null}
        {status === "lost" || status === "won" ? <button type="button" className={`lab-visual-memory__retry${isControlLeaving ? " is-leaving" : ""}`} data-fluid-cursor-surface data-fluid-cursor-tight aria-label={status === "won" ? "Restart Snake after winning" : "Try Snake again"} onClick={startFromControl}>{status === "won" ? "YOU WON!" : "Try Again"}</button> : null}
      </div>
    </article>
  );
}

export function LabPreview() {
  const [isTitleRevealed, setIsTitleRevealed] = useState(false);
  const [isLabActionRevealed, setIsLabActionRevealed] = useState(false);

  return (
    <section className={`lab-preview${isTitleRevealed ? " lab-preview--title-revealed" : ""}`} id="lab&tools" aria-labelledby="lab-preview-heading">
      <div className="lab-grid">
        <div className="lab-grid__intro">
          <div className="lab-grid__title-fit">
            <RevealTitle id="lab-preview-heading" lines={["I like to create tools & interactive stuff"]} onRevealComplete={() => setIsTitleRevealed(true)} onRevealSettled={() => setIsLabActionRevealed(true)} />
          </div>
          <Link
            className={`button button--secondary lab-grid__cta reveal-following-action${isLabActionRevealed ? " is-revealed" : ""}`}
            to="/lab"
            tabIndex={isLabActionRevealed ? undefined : -1}
            aria-hidden={!isLabActionRevealed}
          ><span className="liquid-button__surface">Explore interaction lab <ArrowUpRightIcon /></span></Link>
        </div>
        <VisualMemoryGame />
        <DrawingPad />
        <TypeRacer />
        <SnakeGame />
        <LabCalendar />
        <CarShowcase />
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="experience-section" id="experience" aria-labelledby="experience-heading">
      <div className="experience-section__intro">
        <RevealTitle id="experience-heading" lines={["Career"]} />
        <a className="button button--secondary" href={publicAsset("resume/felipe-salazar-cv.pdf")} target="_blank" rel="noreferrer"><span className="liquid-button__surface">View my CV <ArrowUpRightIcon /></span></a>
      </div>
      <ol className="experience-list experience-list--index">
        {experience.map((item) => (
          <li key={item.id}>
            <div className="experience-list__identity">
              <span className="experience-list__logo" role="img" aria-label={`${item.company} initials`}><span aria-hidden="true">{item.initials}</span></span>
              <div className="experience-list__identity-copy">
                <p className="experience-list__company-name">{item.company}</p>
                <p className="experience-list__role">{item.title}</p>
              </div>
            </div>
            <p className="experience-list__contribution">{item.summary}</p>
            <p className="experience-list__years">{item.years}</p>
          </li>
        ))}
        <li className="experience-list__education">
          <div className="experience-list__identity">
            <img className="experience-list__university-logo" src={publicAsset("images/uniandes-logo.svg")} alt="Universidad de los Andes" width={300} height={126} loading="lazy" />
            <p className="experience-list__degree">Bachelor’s degree in Design</p>
          </div>
          <p className="experience-list__contribution">Universidad de Los Andes</p>
          <p className="experience-list__years">2024</p>
        </li>
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
