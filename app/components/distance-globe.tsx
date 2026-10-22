import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { GlobeLabel } from "./globe-label";
import { publicAsset } from "~/lib/public-asset";
import { cameraFor, decodeLand, exactDistanceKm, greatCircle, project, spherePoint, unproject, type Coordinate, type Vector } from "~/lib/globe-geometry";
import { separateGlobeLabels, updateGlobeLabelHover, type GlobeLabelHover, type GlobeLabelPointer } from "~/lib/globe-label-layout";
import { getApproximateLocation, locationDetail, type ApproximatePlace } from '~/lib/approximate-location';
import { stepDistance, catDistance, formatDistance, makeGlobeArc, makeExplorationArcs, nameClickedPoint, playfulDistance, type GlobeCity } from '~/lib/globe-play';

type Place = ApproximatePlace;
const HOME: Place = { name: "Bogotá", country: "Colombia", countryCode: "CO", coordinates: [4.711, -74.0721], precision: 'city', sources: 0, networkUncertain: false };
const AUTO_SPIN_RADIANS_PER_MS = .00025;
const PHRASES = [
  "{steps} apart. A little closer now.",
  "A small world, with {steps} between us.",
  "{steps} apart. Nice to cross paths here.",
  "{steps} between us. Imagine the playlist for that trip.",
];
let pagePhrase: number | null = null;
let pageExploredPoint: Coordinate | null = null;
function phraseForPage() {
  // Once per document load, not per render, loop, or route revisit.
  if (pagePhrase !== null) return pagePhrase;
  try {
    const previous = Number.parseInt(sessionStorage.getItem("portfolio-globe-caption-index") ?? "", 10);
    pagePhrase = Number.isInteger(previous) && previous >= 0 && previous < PHRASES.length ? (previous + 1) % PHRASES.length : crypto.getRandomValues(new Uint32Array(1))[0] % PHRASES.length;
    sessionStorage.setItem("portfolio-globe-caption-index", String(pagePhrase));
  } catch { pagePhrase = crypto.getRandomValues(new Uint32Array(1))[0] % PHRASES.length; }
  return pagePhrase;
}

export function DistanceGlobe() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routesRef = useRef<HTMLCanvasElement>(null);
  const homeLabel = useRef<HTMLDivElement>(null);
  const visitorLabel = useRef<HTMLDivElement>(null);
  const distanceLabel = useRef<HTMLDivElement>(null);
  const pickedLabel = useRef<HTMLDivElement>(null);
  const pickedHomeDistance = useRef<HTMLDivElement>(null);
  const pickedVisitorDistance = useRef<HTMLDivElement>(null);
  const choosePoint = useRef<(point: Coordinate | null) => void>(() => {});
  const gesture = useRef({ x: 0, y: 0, moved: false });
  const [picked, setPicked] = useState<{ coordinates: Coordinate; name: string; phrase: number } | null>(null);
  const initial = cameraFor(spherePoint(HOME.coordinates));
  const rotation = useRef({ ...initial, velocity: 0, dragging: false, recovering: false, x: 0, y: 0 });
  const renderRef = useRef(() => {});
  const [visitor, setVisitor] = useState<Place | null>(null);
  const [phrase, setPhrase] = useState(0);
  const [located, setLocated] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const distance = visitor ? exactDistanceKm(HOME.coordinates, visitor.coordinates) : null;
  const neighbour = Boolean(visitor && !visitor.networkUncertain && visitor.countryCode === HOME.countryCode && distance !== null && distance <= 400);
  const distanceText = distance === null ? "" : formatDistance(distance);
  const caption = distance !== null ? PHRASES[phrase].replace("{steps}", stepDistance(distance)) : located ? "Hello from Bogotá, wherever you are." : "Finding our little corner of the world…";

  useEffect(() => {
    const container = containerRef.current, canvas = canvasRef.current;
    if (!container || !canvas) return;
    // Start after React paints, independently of canvas/data loading. The
    // bounded result is usually cached before the visitor scrolls this far.
    void getApproximateLocation();
    const context = canvas.getContext("2d", { alpha: true });
    const routesCanvas = routesRef.current;
    const routeContext = routesCanvas?.getContext('2d', { alpha: true });
    let disposed = false, visible = false, loading = false;
    let frame = 0, previousTime = 0, size = 0, dpr = 1, delta = 16;
    let land: Vector[] = [];
    let other: Place | null = null, nearby = false;
    let arc: Vector[] = [];
    let cities: GlobeCity[] = [];
    type Trip = { coordinates: Coordinate; point: Vector; arcs: Vector[][]; progress: number; from: number; phase: 'arriving' | 'ready' | 'leaving'; started: number };
    let trip: Trip | null = null, queued: Coordinate | null = null, phraseIndex = -1;
    const home = spherePoint(HOME.coordinates);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let palette = { ink: "#f5f5f1", page: "#0a0a0a", accent: "#a68aff" };
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 24;
    const positions = new Map<string, { x: number; y: number }>();
    const renderedPositions = new Map<string, { x: number; y: number }>();
    const hoveredLabelOffset = new Map<string, { x: number; y: number }>();
    const labelPointer: GlobeLabelPointer = { x: 0, y: 0, revision: 0, inside: false };
    let labelHover: GlobeLabelHover = { id: null, blockedRevision: -1, outsideSince: null };
    const trackLabelPointer = (event: globalThis.PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!labelPointer.inside || Math.hypot(event.clientX - labelPointer.x, event.clientY - labelPointer.y) > .25) labelPointer.revision++;
      labelPointer.x = event.clientX; labelPointer.y = event.clientY; labelPointer.inside = true;
    };
    const leaveLabelPointer = () => { labelPointer.inside = false; };
    const smooth = (a: number, b: number, value: number) => {
      const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const paintSprite = () => {
      const paint = sprite.getContext("2d");
      if (!paint) return;
      paint.clearRect(0, 0, 24, 24);
      paint.fillStyle = palette.ink;
      paint.beginPath(); paint.arc(12, 12, 10, 0, Math.PI * 2); paint.fill();
    };
    const labels = () => [homeLabel.current, visitorLabel.current, distanceLabel.current, pickedLabel.current, pickedHomeDistance.current, pickedVisitorDistance.current];
    const hideLabels = () => labels().forEach((anchor) => {
      const button = anchor?.querySelector("button");
      if (button) { button.style.opacity = "0"; button.style.pointerEvents = "none"; button.tabIndex = -1; }
    });
    const positionLabels = () => {
      const bounds = canvas.getBoundingClientRect();
      const safeTop = innerWidth <= 1280 ? document.querySelector('.mobile-header')?.getBoundingClientRect().bottom ?? 8 : 8;
      const experience = innerWidth > 896 ? document.querySelector('.about-experience-section')?.getBoundingClientRect() : null;
      const railEdge = innerWidth > 1280 ? document.querySelector('.desktop-rail')?.getBoundingClientRect().right ?? 0 : 0;
      let leftLimit = Math.max(8, railEdge ? railEdge + 24 : 8);
      let rightLimit = innerWidth - 8;
      if (experience) {
        if (experience.left >= bounds.left + bounds.width / 2) rightLimit = Math.min(rightLimit, experience.left - 24);
        else leftLimit = Math.max(leftLimit, experience.right + 24);
      }
      const availableWidth = Math.max(32, rightLimit - leftLimit - 8);
      const nodes = [
        { id: "home", anchor: homeLabel.current, point: home, offset: nearby ? -13 : -15 },
        ...(other && !nearby ? [{ id: "visitor", anchor: visitorLabel.current, point: spherePoint(other.coordinates), offset: -15 }] : []),
        ...(other ? [{ id: "distance", anchor: distanceLabel.current, point: arc[Math.floor(arc.length / 2)] ?? home, offset: nearby ? -43 : -17 }] : []),
        ...(trip ? [
          { id: 'picked', anchor: pickedLabel.current, point: trip.point, offset: -17 },
          { id: 'picked-home', anchor: pickedHomeDistance.current, point: trip.arcs[0][50], offset: -10 },
          ...(other && !nearby && trip.arcs[1] ? [{ id: 'picked-visitor', anchor: pickedVisitorDistance.current, point: trip.arcs[1][50], offset: 30 }] : []),
        ] : []),
      ];
      labelHover = updateGlobeLabelHover(labelHover, labelPointer, nodes.flatMap(({ id, anchor }) => {
        const button = anchor?.querySelector('button');
        if (!button) return [];
        const rect = button.getBoundingClientRect();
        return [{ id, x: rect.left + rect.width / 2, y: rect.bottom, width: rect.width, height: rect.height, alpha: Number.parseFloat(getComputedStyle(button).opacity) || 0 }];
      }), performance.now());
      const engagedLabel = nodes.find(({ anchor }) => anchor?.querySelector('button')?.matches(':focus-visible'))?.id ?? labelHover.id;
      const desiredVisibility = new Map<string, number>();
      const boxes = nodes.flatMap(({ id, anchor, point, offset }) => {
        const button = anchor?.querySelector("button");
        if (!button) return [];
        button.style.maxInlineSize = `${availableWidth}px`;
        const directlyEngaged = engagedLabel === id;
        button.toggleAttribute('data-globe-expanded', directlyEngaged);
        const expanded = directlyEngaged;
        const hoverBounds = button.getBoundingClientRect();
        const natural = positions.get(id);
        if (expanded && directlyEngaged && !hoveredLabelOffset.has(id) && natural) {
          // Preserve only its existing collision offset, relative to the moving
          // globe anchor. Expansion cannot push the active label into another
          // slot, but the label still follows the globe on every frame.
          const origin = renderedPositions.get(id) ?? { x: hoverBounds.left + hoverBounds.width / 2, y: hoverBounds.bottom };
          hoveredLabelOffset.set(id, { x: origin.x - natural.x, y: origin.y - natural.y });
        }
        if (!directlyEngaged) hoveredLabelOffset.delete(id);
        const expansion = button.querySelector<HTMLElement>('.globe-label__expansion');
        const detailWidth = Number.parseFloat(button.style.getPropertyValue('--globe-detail-width')) || 0;
        const reservedWidth = expanded && expansion
          ? Math.max(button.offsetWidth, button.offsetWidth - expansion.offsetWidth + detailWidth)
          : button.offsetWidth;
        const [x, y, z] = project(point, rotation.current.yaw, rotation.current.tilt);
        const radius = size / 2 - 1;
        const pointY = bounds.top + size / 2 - y * radius;
        const visibility = pointY > safeTop && pointY < innerHeight && (z >= 0 || Math.hypot(x, y) > 1.001) && (!id.startsWith('picked') || trip?.phase === 'ready') ? 1 : 0;
        desiredVisibility.set(id, visibility);
        // An outgoing pill remains painted during its short opacity transition.
        // Keep reserving its space until it has actually disappeared.
        const paintedVisibility = Number.parseFloat(getComputedStyle(button).opacity) || 0;
        const target = { x: bounds.left + size / 2 + x * radius, y: bounds.top + size / 2 - y * radius + offset };
        const activeOffset = hoveredLabelOffset.get(id);
        let current = positions.get(id);
        if (!current) { current = { ...target }; positions.set(id, current); }
        const follow = reduceMotion.matches ? 1 : 1 - Math.exp(-delta / (expanded ? 75 : 52));
        current.x += (target.x - current.x) * follow;
        current.y += (target.y - current.y) * follow;
        const previousPosition = renderedPositions.get(id);
        return [{ id, x: current.x + (activeOffset?.x ?? 0) - bounds.left, y: current.y + (activeOffset?.y ?? 0) - bounds.top, width: Math.min(availableWidth, Math.ceil(reservedWidth) + 1), height: button.offsetHeight, alpha: Math.max(visibility, paintedVisibility > .02 ? paintedVisibility : 0), priority: directlyEngaged ? 3 : 0, previousY: previousPosition && paintedVisibility > .02 ? previousPosition.y - bounds.top : undefined }];
      });
      // Reserve the full expansion footprint before it grows. Previous positions
      // retain each neighbor's side while the painted pills ease into free slots.
      const solved = separateGlobeLabels(boxes, size, size, { left: leftLimit - bounds.left, right: rightLimit - bounds.left, top: safeTop - bounds.top + 8, bottom: innerHeight - bounds.top - 8 });
      solved.forEach((box) => {
        const anchor = nodes.find((node) => node.id === box.id)?.anchor;
        const button = anchor?.querySelector("button");
        if (!anchor || !button) return;
        const destination = { x: bounds.left + box.x, y: bounds.top + box.y };
        let rendered = renderedPositions.get(box.id);
        if (!rendered || reduceMotion.matches || Number.parseFloat(getComputedStyle(button).opacity) < .02) {
          rendered = destination;
          renderedPositions.set(box.id, rendered);
        } else {
          const follow = 1 - Math.exp(-delta / 72);
          rendered.x += (destination.x - rendered.x) * follow;
          rendered.y += (destination.y - rendered.y) * follow;
        }
        anchor.style.transform = `translate3d(${rendered.x}px,${rendered.y}px,0)`;
        const alpha = box.alpha >= .1 ? desiredVisibility.get(box.id) ?? 0 : 0;
        button.style.opacity = String(alpha);
        button.style.pointerEvents = alpha > .85 ? "auto" : "none";
        button.tabIndex = alpha > .85 ? 0 : -1;
      });
    };
    const draw = () => {
      if (!context || !size || !visible || document.hidden) return;
      const { yaw, tilt } = rotation.current;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
      const center = size / 2, radius = size / 2 - 1;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      const sphere = context.createRadialGradient(center - radius * .3, center - radius * .35, 0, center, center, radius);
      sphere.addColorStop(0, palette.ink); sphere.addColorStop(1, palette.page);
      context.globalAlpha = .11; context.fillStyle = sphere;
      context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fill();
      context.strokeStyle = palette.ink; context.lineWidth = .6;
      context.globalAlpha = .1; context.stroke();
      // Subpixel-filtered dot sprites with continuous depth opacity. No six-band
      // brightness jumps or hard popping at the limb.
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const dot = Math.max(.85, size / 500 * 1.1), stride = size < 380 ? 2 : 1;
      for (let i = 0; i < land.length; i += stride) {
        const [x, y, z] = land[i], depth = sy * x + cy * z;
        const front = st * y + ct * depth;
        if (front <= 0) continue;
        const px = center + (cy * x - sy * z) * radius, py = center - (ct * y - st * depth) * radius;
        const r = dot * (.62 + .38 * front);
        context.globalAlpha = smooth(0, .1, front) * (.38 + .6 * front);
        // Stamp includes a transparent antialiasing margin.
        context.drawImage(sprite, px - r * 1.2, py - r * 1.2, r * 2.4, r * 2.4);
      }
      if (!routeContext || !routesCanvas) return;
      const padding = size * .3;
      routeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      routeContext.clearRect(0, 0, size * 1.6, size * 1.6);
      routeContext.translate(padding, padding);
      routeContext.globalAlpha = .9; routeContext.strokeStyle = palette.accent; routeContext.lineWidth = 1.6;
      routeContext.lineCap = 'round'; routeContext.lineJoin = 'round';
      routeContext.beginPath();
      let connected = false;
      const displayedArc = nearby ? arc.slice(0, Math.ceil(arc.length / 2)) : arc;
      for (const point of displayedArc) {
        const [x, y, z] = project(point, yaw, tilt);
        if (z < 0 && x * x + y * y < 1.003) { connected = false; continue; }
        if (!connected) routeContext.moveTo(center + x * radius, center - y * radius);
        else routeContext.lineTo(center + x * radius, center - y * radius);
        connected = true;
      }
      routeContext.stroke();
      if (trip) {
        const now = performance.now();
        if (trip.phase !== 'ready') {
          const t = Math.min(1, (now - trip.started) / (trip.phase === 'arriving' ? 650 : 330));
          const eased = t * t * (3 - 2 * t);
          trip.progress = trip.phase === 'arriving' ? eased : trip.from * (1 - eased);
          if (t === 1) {
            if (trip.phase === 'arriving') trip.phase = 'ready';
            else { trip = null; setPicked(null); if (queued) { const point = queued; queued = null; startTrip(point); } }
          }
        }
        canvas.dataset.tripPhase = trip?.phase ?? 'none';
        canvas.dataset.tripRoutes = String(trip?.arcs.length ?? 0);
        if (trip) for (const route of trip.arcs) {
          routeContext.beginPath();
          let inFront = false;
          const end = trip.progress * (route.length - 1), whole = Math.floor(end);
          const routePoints = route.slice(0, whole + 1);
          if (whole < route.length - 1) routePoints.push(route[whole].map((v, i) => v + (route[whole + 1][i] - v) * (end - whole)) as unknown as Vector);
          for (const point of routePoints) {
            const [x, y, z] = project(point, yaw, tilt);
            if (z < 0 && x * x + y * y < 1.003) { inFront = false; continue; }
            if (inFront) routeContext.lineTo(center + x * radius, center - y * radius);
            else routeContext.moveTo(center + x * radius, center - y * radius);
            inFront = true;
          }
          routeContext.stroke();
        }
      }
      const markers = [
        { point: home, size: 4.5, ring: true, phase: 0 },
        ...(other && !nearby ? [{ point: spherePoint(other.coordinates), size: 4.5, ring: true, phase: .35 }] : []),
        ...(nearby && arc.length ? [{ point: arc[Math.floor(arc.length / 2)], size: 2.5, ring: false, phase: 0 }] : []),
        ...(trip ? [{ point: trip.point, size: 5 * Math.min(1, trip.progress * 4), ring: true, phase: .65 }] : []),
      ];
      for (const marker of markers) {
        const [x, y, z] = project(marker.point, yaw, tilt);
        const alpha = smooth(-.03, .07, z);
        if (alpha <= 0) continue;
        routeContext.fillStyle = palette.accent; routeContext.globalAlpha = alpha;
        routeContext.beginPath(); routeContext.arc(center + x * radius, center - y * radius, marker.size, 0, Math.PI * 2); routeContext.fill();
        if (marker.ring) {
          const pulse = reduceMotion.matches ? .25 : (performance.now() / 1700 + marker.phase) % 1;
          routeContext.globalAlpha = (1 - pulse) * .48 * alpha; routeContext.lineWidth = 1.2;
          routeContext.beginPath(); routeContext.arc(center + x * radius, center - y * radius, marker.size + 2 + pulse * 9, 0, Math.PI * 2); routeContext.stroke();
        }
      }
      context.globalAlpha = 1;
      positionLabels();
    };
    const animate = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || reduceMotion.matches) return;
      delta = Math.min((time - previousTime) || 16, 50);
      previousTime = time;
      if (!rotation.current.dragging) {
        rotation.current.yaw += delta * AUTO_SPIN_RADIANS_PER_MS + rotation.current.velocity * delta / 16;
        rotation.current.velocity *= Math.pow(.9, delta / 16);
        if (rotation.current.recovering) {
          rotation.current.tilt *= Math.exp(-delta / 1500);
          if (Math.abs(rotation.current.tilt) < .0001) { rotation.current.tilt = 0; rotation.current.recovering = false; }
        }
      }
      draw();
      frame = requestAnimationFrame(animate);
    };
    const playback = () => {
      cancelAnimationFrame(frame); frame = 0; previousTime = 0;
      if (disposed || !visible || document.hidden || !land.length) { hideLabels(); return; }
      draw();
      if (!reduceMotion.matches) frame = requestAnimationFrame(animate);
    };
    renderRef.current = draw;
    const theme = () => {
      const styles = getComputedStyle(container);
      palette = { ink: styles.color, page: styles.getPropertyValue("--page").trim() || "#0a0a0a", accent: styles.getPropertyValue('--secondary').trim() || '#7752fe' };
      paintSprite();
      draw();
    };
    const resize = () => {
      size = canvas.clientWidth;
      dpr = Math.min((devicePixelRatio || 1) * 1.5, 2);
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
      if (routesCanvas) {
        routesCanvas.width = Math.round(size * 1.6 * dpr); routesCanvas.height = Math.round(size * 1.6 * dpr);
        const bounds = canvas.getBoundingClientRect();
        const left = Math.max(-size * .3, -bounds.left + 8);
        const right = Math.min(size * 1.3, innerWidth - bounds.left - 8);
        const drawingWindow = routesCanvas.parentElement;
        if (drawingWindow) { drawingWindow.style.left = `${left}px`; drawingWindow.style.width = `${right - left}px`; }
        routesCanvas.style.left = `${-size * .3 - left}px`;
        routesCanvas.style.width = routesCanvas.style.height = `${size * 1.6}px`;
      }
      draw();
    };
    const init = async () => {
      if (loading || land.length || !visible) return;
      loading = true;
      if (!context) { setUnavailable(true); return; }
      try {
        const response = await fetch(publicAsset("data/globe-land.json"), { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error("Land data unavailable");
        const points = decodeLand(await response.json());
        if (disposed) return;
        land = points;
        setReady(true); theme(); resize(); playback();
        void fetch(publicAsset('data/globe-places.json')).then((r) => r.ok ? r.json() : []).then((data: GlobeCity[]) => {
          if (!disposed) { cities = data; if (trip) setPicked((current) => current ? { ...current, name: nameClickedPoint(current.coordinates, cities) } : null); }
        }).catch(() => { /* Coordinates remain a valid offline fallback. */ });
      } catch { if (!disposed) setUnavailable(true); }
      finally { loading = false; }
    };
    const locate = async () => {
      const place = await getApproximateLocation();
      if (disposed) return;
      other = place;
      nearby = Boolean(place && !place.networkUncertain && place.countryCode === HOME.countryCode && exactDistanceKm(HOME.coordinates, place.coordinates) <= 400);
      setVisitor(place); setPhrase(phraseForPage()); setLocated(true);
      if (place) {
        const to = spherePoint(place.coordinates);
        const midpoint = greatCircle(home, to, .5);
        Object.assign(rotation.current, cameraFor(midpoint));
        arc = makeGlobeArc(home, to, nearby ? .055 : undefined);
        if (trip) trip.arcs = makeExplorationArcs(home, to, trip.point, nearby, exactDistanceKm(HOME.coordinates, place.coordinates));
      }
      // React mounts new labels on the next frame.
      requestAnimationFrame(() => { if (!disposed) draw(); });
    };
    function startTrip(coordinates: Coordinate, restored = false) {
      const point = spherePoint(coordinates);
      phraseIndex = (phraseIndex + 1) % 7;
      trip = { coordinates, point, arcs: makeExplorationArcs(home, other ? spherePoint(other.coordinates) : null, point, nearby, other ? exactDistanceKm(HOME.coordinates, other.coordinates) : 0), progress: reduceMotion.matches || restored ? 1 : 0, from: 0, phase: reduceMotion.matches || restored ? 'ready' : 'arriving', started: performance.now() };
      setPicked({ coordinates, name: nameClickedPoint(coordinates, cities), phrase: phraseIndex });
    }
    choosePoint.current = (point) => {
      pageExploredPoint = point;
      if (trip && !reduceMotion.matches) {
        queued = point;
        if (trip.phase !== 'leaving') { trip.from = trip.progress; trip.phase = 'leaving'; trip.started = performance.now(); }
      } else {
        trip = null; queued = null; setPicked(null);
        if (point) startTrip(point);
      }
      draw();
      if (reduceMotion.matches) requestAnimationFrame(() => { if (!disposed) draw(); });
      if (!frame && !reduceMotion.matches) playback();
    };
    if (pageExploredPoint) startTrip(pageExploredPoint, true);
    let locationStarted = false;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        void init();
        if (!locationStarted) { locationStarted = true; void locate(); }
      }
      playback();
    });
    observer.observe(container);
    // Scroll restoration can put the section in view before an observer's
    // first delivery. Initialize from the real viewport too, without waiting
    // for a new intersection transition.
    const syncViewport = () => {
      if (disposed) return;
      const bounds = container.getBoundingClientRect();
      const inView = bounds.bottom > 0 && bounds.top < innerHeight;
      if (inView) {
        visible = true;
        void init();
        if (!locationStarted) { locationStarted = true; void locate(); }
        if (!frame) playback();
      }
    };
    const startupFrame = requestAnimationFrame(syncViewport);
    window.addEventListener("scroll", syncViewport, { passive: true });
    window.addEventListener('pointermove', trackLabelPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', leaveLabelPointer);
    window.addEventListener('blur', leaveLabelPointer);
    const sizing = new ResizeObserver(resize); sizing.observe(canvas);
    const themes = new MutationObserver(theme);
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", playback);
    reduceMotion.addEventListener("change", playback);
    return () => {
      disposed = true; cancelAnimationFrame(frame); cancelAnimationFrame(startupFrame);
      window.removeEventListener("scroll", syncViewport);
      window.removeEventListener('pointermove', trackLabelPointer);
      document.documentElement.removeEventListener('pointerleave', leaveLabelPointer);
      window.removeEventListener('blur', leaveLabelPointer);
      hideLabels();
      observer.disconnect(); sizing.disconnect(); themes.disconnect();
      document.removeEventListener("visibilitychange", playback);
      reduceMotion.removeEventListener("change", playback);
      renderRef.current = () => {};
      choosePoint.current = () => {};
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { x: event.clientX, y: event.clientY, moved: false };
    Object.assign(rotation.current, { dragging: true, recovering: false, x: event.clientX, y: event.clientY, velocity: 0 });
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    updateGlobeHover(event);
    const state = rotation.current;
    if (!state.dragging) return;
    if (!gesture.current.moved && Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) < 5) return;
    gesture.current.moved = true;
    const delta = (event.clientX - state.x) * .006;
    state.yaw -= delta; state.tilt = Math.max(-1.2, Math.min(1.2, state.tilt + (event.clientY - state.y) * .003));
    state.velocity = Math.max(-.025, Math.min(.025, -delta)); state.x = event.clientX; state.y = event.clientY;
    renderRef.current();
  };
  const updateGlobeHover = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const inside = event.pointerType !== 'touch' && Math.hypot(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2) <= bounds.width / 2;
    event.currentTarget.toggleAttribute('data-globe-hover', inside);
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const wasDragging = rotation.current.dragging;
    rotation.current.dragging = false;
    rotation.current.recovering = gesture.current.moved;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    updateGlobeHover(event);
    if (!wasDragging || gesture.current.moved) return;
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width / 2 - 1;
    const point = unproject((event.clientX - rect.left - rect.width / 2) / radius, -(event.clientY - rect.top - rect.height / 2) / radius, rotation.current.yaw, rotation.current.tilt);
    if (!point) return;
    window.dispatchEvent(new CustomEvent('portfolio-globe-pulse'));
    choosePoint.current(point);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    rotation.current.yaw += event.key === "ArrowLeft" ? -.12 : event.key === "ArrowRight" ? .12 : 0;
    rotation.current.tilt = Math.max(-1.2, Math.min(1.2, rotation.current.tilt + (event.key === "ArrowUp" ? -.08 : event.key === "ArrowDown" ? .08 : 0)));
    renderRef.current();
  };
  return <section ref={containerRef} className="distance-globe" aria-label="The approximate distance between us">
    <div className={`distance-globe__stage${ready ? " is-ready" : ""}`}>
      <div className="distance-globe__canvas"><canvas ref={canvasRef} data-fluid-cursor-negative-mask data-fluid-cursor-canvas-mask aria-label="Rotating globe showing Bogotá and your approximate city. Click to explore a place; drag or use arrow keys to rotate. Press Enter to explore the center." role="img" tabIndex={0} onPointerDown={onPointerDown} onPointerEnter={updateGlobeHover} onPointerLeave={(event) => event.currentTarget.removeAttribute('data-globe-hover')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={(event) => { event.currentTarget.removeAttribute('data-globe-hover'); rotation.current.dragging = false; rotation.current.recovering = true; }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const point = unproject(0, 0, rotation.current.yaw, rotation.current.tilt); if (point) choosePoint.current(point); } else onKeyDown(event); }} /><div className="distance-globe__routes-window"><canvas ref={routesRef} className="distance-globe__routes" aria-hidden="true" data-fluid-cursor-negative-mask data-fluid-cursor-canvas-mask /></div></div>
      {unavailable && <p className="distance-globe__fallback">The globe couldn’t load on this device.</p>}
      {!ready && !unavailable && <span className="distance-globe__loading">A little perspective…</span>}
    </div>
    {ready && createPortal(<div className="globe-label-layer" data-no-reveal>
      <GlobeLabel anchorRef={homeLabel} label={neighbour ? "Hello neighbour!" : "Me"} detail={neighbour && visitor ? locationDetail(visitor) : "Bogotá, Colombia"} title={neighbour ? 'Nearby approximate IP location. It may identify a nearby municipality rather than your actual city.' : 'Felipe is based in Bogotá, Colombia.'} />
      {visitor && !neighbour && <GlobeLabel anchorRef={visitorLabel} label="You" detail={locationDetail(visitor)} title={`Approximate IP network location (${visitor.precision} level), using ${visitor.sources} available provider${visitor.sources === 1 ? '' : 's'}. Disagreement or network uncertainty reduces detail; this is not GPS.`} />}
      {visitor && distance !== null && <GlobeLabel anchorRef={distanceLabel} label={distanceText} detail={catDistance(distance)} title="Approximate great-circle distance. Playful comparison using a reference cat length of 46 cm, excluding the tail; real cats vary. Rounded to the nearest whole cat." />}
      {picked && <>
        <GlobeLabel anchorRef={pickedLabel} label={picked.name} accent onClick={() => choosePoint.current(null)} accessibleLabel={`Remove explored location: ${picked.name}`} title="Approximate map location. Click to remove this point and retract both routes." />
        <GlobeLabel anchorRef={pickedHomeDistance} label={formatDistance(exactDistanceKm(HOME.coordinates, picked.coordinates))} detail={playfulDistance(exactDistanceKm(HOME.coordinates, picked.coordinates), picked.phrase).text} title={playfulDistance(exactDistanceKm(HOME.coordinates, picked.coordinates), picked.phrase).basis} />
        {visitor && !neighbour && <GlobeLabel anchorRef={pickedVisitorDistance} label={formatDistance(exactDistanceKm(visitor.coordinates, picked.coordinates))} detail={playfulDistance(exactDistanceKm(visitor.coordinates, picked.coordinates), picked.phrase).text} title={playfulDistance(exactDistanceKm(visitor.coordinates, picked.coordinates), picked.phrase).basis} />}
      </>}
    </div>, document.body)}
    <p className="distance-globe__caption" title="Approximate city-to-city straight-line distance from IP, not a walking route or precise location. One step is defined as 1 meter; steps are rounded to the nearest whole step." aria-live="polite">{caption.split(/(\d[\d,]* steps)/g).map((part, index) => /\d[\d,]* steps/.test(part) ? <strong key={index}>{part}</strong> : part)}</p>
  </section>;
}
