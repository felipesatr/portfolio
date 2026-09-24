import { Link } from "react-router";
import { createPortal, flushSync } from "react-dom";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Object3D } from "three";
import { experience, testimonials } from "~/content/portfolio";
import { services, type Service } from "~/content/services";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ExpandIcon, CodeIcon, HeartIcon, InfoCircleIcon, InterfaceIcon, NavArrowLeftIcon, PlayIcon, RestartIcon, SparkIcon, StrategyIcon } from "./icons";
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
  const drawingPointer = useRef<number | null>(null);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
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
      document.documentElement.classList.remove("draw-cursor-hidden");
    };
  }, []);

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
      <span className="lab-preview__number">02</span>
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
      <div className="lab-draw__controls" aria-label="Drawing controls coming soon">
        <span className="lab-draw__placeholders" aria-hidden="true"><i /><i /><i /></span>
        <button type="button" className="lab-draw__info" aria-label="About this drawing pad" data-cursor-tool data-cursor-title="" data-cursor-description="A simple freehand canvas. More drawing controls are coming soon." onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
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
};

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

    void (async () => {
      const [{ GLTFLoader }, THREE] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three"),
      ]);
      const stage = stageRef.current;
      if (!stage || disposed) return;

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
      const rimLight = new THREE.DirectionalLight(0xffdc32, 1.1);
      rimLight.position.set(-5, 2, -4);
      scene.add(rimLight);

      const defaultYaw = -0.55;
      const defaultPitch = 0.08;
      const defaultCameraDistance = 5.85;
      const closeZoomThreshold = 4.1;
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
        return true;
      };

      const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;
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
        if (pointerId === null && cameraTargetDistance <= closeZoomThreshold && !expandedRef.current) isZoomReturning = true;
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
        else stopRendering();
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

      new GLTFLoader().load("/models/1962-ferrari-250-gto.glb", (gltf) => {
        if (disposed) return;
        loadedModel = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(loadedModel);
        const centre = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const scale = 4.55 / Math.max(size.x, size.y, size.z);
        loadedModel.position.sub(centre);
        loadedModel.scale.setScalar(scale);
        loadedModel.position.y += 0.08;
        carGroup.add(loadedModel);
        if (isVisible) paint();
      });

      teardown = () => {
        if (transitionControllerRef.current === controller) transitionControllerRef.current = null;
        clearClipReveal();
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
        loadedModel?.traverse((object: Object3D) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return (
    <>
    <article className={`lab-preview__placeholder lab-preview__placeholder--6 lab-car${isExpanding ? " is-expanding" : ""}${isExpanded ? " is-expanded" : ""}${isCameraTransitioning ? " is-camera-transitioning" : ""}`} aria-label="Interactive Ferrari 250 GTO showcase">
      <div ref={stageRef} className="lab-car__stage" aria-label="Rotate the Ferrari 250 GTO by dragging" onPointerEnter={() => setIsPointerInsideCar(true)} onPointerLeave={() => setIsPointerInsideCar(false)}>
        <button type="button" className="lab-car__expand" aria-label="Expand 3D showcase" onClick={beginExpand}><ExpandIcon size={17} /></button>
        <p className="lab-car__credit">
          <a href="https://skfb.ly/pMsTp" target="_blank" rel="noreferrer">“1962 Ferrari 250 GTO”</a> by Dave Love, SketchFab, licensed under <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        </p>
      </div>
      <div className="lab-car__controls">
        <div className="lab-car__actions" aria-label="Car gallery controls">
          <button type="button" className="lab-car__action" data-fluid-cursor-surface data-fluid-cursor-dark-surface data-fluid-cursor-tight aria-label="Previous car"><ArrowLeftIcon size={15} /></button>
          <button type="button" className="lab-car__action" data-fluid-cursor-surface data-fluid-cursor-dark-surface data-fluid-cursor-tight aria-label="Next car"><ArrowRightIcon size={15} /></button>
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
            <button type="button" className="lab-car__action" aria-label="Previous car"><ArrowLeftIcon size={24} /></button>
            <button type="button" className="lab-car__action" aria-label="Next car"><ArrowRightIcon size={24} /></button>
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
          <span className="lab-visual-memory__level" data-fluid-cursor-negative-mask>{"Lvl " + level}</span>
          {highScore !== null ? <span className="lab-visual-memory__high-score" data-fluid-cursor-negative-mask><SparkIcon size={15} /><span>{highScore}</span></span> : null}
        </div>
        <div className="lab-visual-memory__actions">
          <span className="lab-visual-memory__lives" aria-label={lives + " lives remaining"}>{[0, 1, 2].map((heart) => <HeartIcon key={heart} className={heart >= lives ? "is-lost" : undefined} />)}</span>
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
      <button type="button" className={`lab-type-racer__restart${startedAt ? " is-visible" : ""}`} tabIndex={startedAt ? 0 : -1} aria-hidden={!startedAt} aria-label="Restart type racer" title="Restart type racer" data-cursor-tool data-cursor-title="" data-cursor-description="Restart timer" onClick={restart} onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><RestartIcon /></button>
      <button type="button" className="lab-type-racer__info" aria-label="About this type racer" title="About this type racer" data-cursor-tool data-cursor-title="" data-cursor-description="Type the phrase exactly as it is in the shortest time possible!" onPointerEnter={(event) => dispatchCursorToolEvent("portfolio-stack-tool-enter", event.currentTarget)} onPointerLeave={(event) => dispatchCursorToolEvent("portfolio-stack-tool-leave", event.currentTarget)}><InfoCircleIcon /></button>
      <output className={`lab-type-racer__timer${completionTime !== null ? " is-complete" : ""}`} data-fluid-cursor-negative-mask aria-live="polite">{time}</output>
      {highScore !== null ? <span className="lab-type-racer__high-score" data-fluid-cursor-negative-mask aria-label={`Best time ${formatTime(highScore)}`}><SparkIcon size={15} /><span>{formatTime(highScore)}</span></span> : null}
      <p className="lab-type-racer__prompt" onPointerEnter={() => { isPointerInsidePrompt.current = true; if (startedAt && completionTime === null) scheduleInputCursorFade(); }} onPointerLeave={() => { isPointerInsidePrompt.current = false; clearInputCursorFade(); showTypeCursor(); }}>
        <span data-fluid-cursor-negative-mask>{words.map((word, index) => <Fragment key={`${word}-${index}`}><span className={`lab-type-racer__word ${wordState(index)}${arrivingWordIndex === index ? " is-arriving" : ""}`}>{word}</span>{index < words.length - 1 ? " " : null}</Fragment>)}</span>
        <span data-fluid-cursor-negative-mask>{isComplete ? "Done!" : `${entry.length}/${phrase.length}`}</span>
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
        <span className="lab-snake__score" data-fluid-cursor-negative-mask><i aria-hidden="true" />{String(score).padStart(2, "0")}</span>
        <span className="lab-snake__high-score" data-fluid-cursor-negative-mask><SparkIcon size={15} /><span>{String(highScore).padStart(2, "0")}</span></span>
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

function CalendarPreview() {
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  // A visual-only first pass: September 2026 begins on a Tuesday.
  const days = [
    { value: 31, muted: true },
    ...Array.from({ length: 30 }, (_, index) => ({ value: index + 1, muted: false })),
    ...Array.from({ length: 4 }, (_, index) => ({ value: index + 1, muted: true })),
  ];

  return (
    <article className="lab-preview__placeholder lab-preview__placeholder--5 lab-calendar" aria-label="September 2026 calendar preview">
      <div className="lab-calendar__header">
        <strong>September</strong>
        <span>2026</span>
      </div>
      <div className="lab-calendar__weekdays" aria-hidden="true">
        {weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="lab-calendar__dates" aria-hidden="true">
        {days.map((day, index) => <span key={`${day.value}-${index}`} className={`${day.muted ? "is-muted" : ""}${day.value === 16 && !day.muted ? " is-today" : ""}`}>{day.value}</span>)}
      </div>
    </article>
  );
}

export function LabPreview() {
  return (
    <section className="lab-preview" id="lab&tools" aria-labelledby="lab-preview-heading">
      <div className="lab-grid">
        <div className="lab-grid__intro">
          <div className="lab-grid__title-fit">
            <RevealTitle id="lab-preview-heading" lines={["I like to create tools & interactive stuff"]} />
          </div>
          <Link className="button button--secondary lab-grid__cta" to="/lab"><span className="liquid-button__surface">Explore interaction lab <ArrowUpRightIcon /></span></Link>
        </div>
        <VisualMemoryGame />
        <DrawingPad />
        <TypeRacer />
        <SnakeGame />
        <CalendarPreview />
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
