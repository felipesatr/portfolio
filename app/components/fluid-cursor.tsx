import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const vertexSource = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentSource = `
  #ifdef GL_OES_standard_derivatives
  #extension GL_OES_standard_derivatives : enable
  #endif
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_dpr;
  uniform vec2 u_cursor;
  uniform vec2 u_cursor_radii;
  uniform vec2 u_cursor_direction;
  uniform float u_target_active;
  uniform vec2 u_target_center;
  uniform vec2 u_projection_center;
  uniform vec2 u_surface_normal;
  uniform float u_target_half_length;
  uniform float u_target_radius;
  uniform float u_cursor_absorption;
  uniform float u_target_reveal;

  vec2 safeNormalize(vec2 value, vec2 fallback) {
    float valueLength = length(value);
    return valueLength > 0.0001 ? value / valueLength : fallback;
  }

  float ellipseDistance(vec2 point, vec2 center, vec2 radii, vec2 direction) {
    vec2 delta = point - center;
    vec2 movementAxis = safeNormalize(direction, vec2(1.0, 0.0));
    vec2 crossAxis = vec2(-movementAxis.y, movementAxis.x);
    vec2 localPoint = vec2(dot(delta, movementAxis), dot(delta, crossAxis));
    vec2 safeRadii = max(radii, vec2(0.45));
    return (length(localPoint / safeRadii) - 1.0) * min(safeRadii.x, safeRadii.y);
  }

  float capsuleDistance(vec2 point, vec2 center, float halfLength, float radius) {
    vec2 localPoint = point - center;
    localPoint.x -= clamp(localPoint.x, -halfLength, halfLength);
    return length(localPoint) - radius;
  }

  float polynomialUnion(float firstDistance, float secondDistance, float radius) {
    float safeRadius = max(radius, 0.001);
    float interpolation = clamp(0.5 + 0.5 * (secondDistance - firstDistance) / safeRadius, 0.0, 1.0);
    return mix(secondDistance, firstDistance, interpolation) -
      safeRadius * interpolation * (1.0 - interpolation);
  }

  float exponentialUnion(float firstDistance, float secondDistance, float softness) {
    float safeSoftness = max(softness, 0.001);
    float minimumDistance = min(firstDistance, secondDistance);
    return minimumDistance - safeSoftness * log(
      exp(-(firstDistance - minimumDistance) / safeSoftness) +
      exp(-(secondDistance - minimumDistance) / safeSoftness)
    );
  }

  float surfaceKernelShape(
    vec2 point,
    float cursorDistance,
    float targetDistance,
    vec2 surfaceNormal,
    float kernelDistance,
    float jointSoftness,
    float jointBlend
  ) {
    float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
    vec2 tangent = vec2(-surfaceNormal.y, surfaceNormal.x);
    vec2 localPoint = point - u_projection_center;
    float surfacePlaneDistance = dot(localPoint, surfaceNormal) - u_target_radius;
    float tangentPosition = dot(localPoint, tangent) / max(cursorMaximum * 4.0, 0.001);
    float normalPosition = surfacePlaneDistance / max(cursorMaximum * 2.4, 0.001);
    float surfaceWindow = exp(-0.5 * tangentPosition * tangentPosition) *
      exp(-0.5 * normalPosition * normalPosition);
    float rawDisplacement = max(surfacePlaneDistance - kernelDistance, 0.0) * surfaceWindow;
    float displacementLimit = cursorMaximum * 0.7;
    float surfaceDisplacement = displacementLimit * rawDisplacement /
      max(displacementLimit + rawDisplacement, 0.001);
    float deformedTarget = targetDistance - surfaceDisplacement;
    float hardJoint = min(cursorDistance, deformedTarget);
    float liquidJoint = exponentialUnion(cursorDistance, deformedTarget, jointSoftness);
    return mix(hardJoint, liquidJoint, jointBlend);
  }

  float resistedCursorDistance(vec2 point, vec2 surfaceNormal, float absorption) {
    float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
    float currentRadius = length(u_cursor - u_projection_center);
    float resistedRadius = max(currentRadius, u_target_radius + cursorMaximum * 0.46);
    float release = smoothstep(0.06, 0.9, absorption);
    float heldRadius = mix(resistedRadius, currentRadius, release);
    vec2 resistedCenter = u_projection_center + surfaceNormal * heldRadius;
    return ellipseDistance(point, resistedCenter, u_cursor_radii, u_cursor_direction);
  }

  float surfaceUnionWidthFactor() {
    float normalizedPosition = abs(u_projection_center.x - u_target_center.x) /
      max(u_target_half_length, 1.0);
    float endcapProgress = smoothstep(0.58, 1.0, normalizedPosition);
    return mix(1.0, 0.7, endcapProgress);
  }

  float polynomialFixedButtonUnion(
    vec2 point,
    float cursorDistance,
    float targetDistance,
    vec2 surfaceNormal,
    float absorption,
    float nearFactor
  ) {
    float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
    float widthFactor = surfaceUnionWidthFactor();
    float visibleCursorDistance = resistedCursorDistance(point, surfaceNormal, absorption);
    vec2 localPoint = point - u_projection_center;
    float surfacePlaneDistance = dot(localPoint, surfaceNormal) - u_target_radius;
    float kernelRadius = cursorMaximum * 3.2 * nearFactor * widthFactor;
    float kernelDistance = polynomialUnion(visibleCursorDistance, surfacePlaneDistance, kernelRadius);
    float localShape = surfaceKernelShape(
      point,
      visibleCursorDistance,
      targetDistance,
      surfaceNormal,
      kernelDistance,
      cursorMaximum * 1.42 * nearFactor * widthFactor,
      smoothstep(0.08, 0.58, nearFactor)
    );
    return mix(localShape, targetDistance, absorption);
  }

  float revealCapsuleFromCursor(vec2 point, float targetDistance) {
    /* For outlined CTAs, ink begins at the moving cursor itself and expands
       into the capsule. Filled buttons pass 1.0 and keep their established
       full-surface behaviour. */
    /* A wide reveal field keeps the intersection nearly flat across the pill,
       rather than exposing the arc of a small circular mask. */
    float fullReach = (u_target_half_length + u_target_radius) * 6.25;
    vec2 surfaceNormal = safeNormalize(u_surface_normal, vec2(0.0, -1.0));
    /* One consistently large field slides into the capsule. This avoids the
       small, visibly circular cap caused by growing the reveal field itself. */
    /* This is a field overlap, not a larger pill: it closes the hairline
       while retaining the exact geometry of the real DOM border. */
    float revealDepth = 1.5 + fullReach * 0.35 * u_target_reveal;
    vec2 surfacePoint = u_projection_center + surfaceNormal * u_target_radius;
    vec2 revealOrigin = surfacePoint + surfaceNormal * (fullReach - revealDepth);
    float revealDistance = length(point - revealOrigin) - fullReach;
    return u_target_reveal > 0.999 ? targetDistance : max(targetDistance, revealDistance);
  }

  void main() {
    vec2 point = vec2(gl_FragCoord.x / u_dpr, u_resolution.y - gl_FragCoord.y / u_dpr);
    float cursorDistance = ellipseDistance(point, u_cursor, u_cursor_radii, u_cursor_direction);
    float finalDistance = cursorDistance;
    if (u_target_active > 0.5) {
      float targetDistance = capsuleDistance(point, u_target_center, u_target_half_length, u_target_radius);
      float revealedTargetDistance = revealCapsuleFromCursor(point, targetDistance);
      vec2 surfaceNormal = safeNormalize(u_surface_normal, vec2(0.0, -1.0));
      float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
      float surfaceGap = max(length(u_cursor - u_projection_center) - u_target_radius, 0.0);
      float nearFactor = 1.0 - smoothstep(cursorMaximum * 0.55, cursorMaximum * 4.8, surfaceGap);
      finalDistance = polynomialFixedButtonUnion(
        point,
        cursorDistance,
        revealedTargetDistance,
        surfaceNormal,
        u_cursor_absorption,
        nearFactor
      );
    }

    /* Keep every liquid silhouette crisp. The browser still anti-aliases the
       physical SDF edge, but there is no added blur around the button or orb. */
    float edge = max(0.7, fwidth(finalDistance));
    float alpha = 1.0 - smoothstep(-edge, edge, finalDistance);
    vec3 premultipliedInk = vec3(0.0353) * alpha;
    gl_FragColor = vec4(premultipliedInk, alpha);
  }
`;

interface LiquidTarget {
  element: HTMLElement;
  surface: HTMLElement;
  rect: DOMRect;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  isOutline: boolean;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program.");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown WebGL link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export function FluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const fallbackCursor = fallbackRef.current;
    if (!canvas || !fallbackCursor) return;
    const fallback = fallbackCursor;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const magneticRange = 56;
    const maxButtonShift = 16;
    const magnetStrength = 0.14;
    const cursorRadius = 10.8;
    const pointer = { x: 0, y: 0, active: false };
    const cursor = { x: 0, y: 0, vx: 0, vy: 0, initialized: false };
    let targets: LiquidTarget[] = [];
    let activeTarget: LiquidTarget | null = null;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let usingWebGL = false;
    let frame = 0;
    let running = false;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let stretch = 0;
    let angle = 0;
    let directionX = 1;
    let directionY = 0;
    const uniforms = new Map<string, WebGLUniformLocation | null>();

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const smootherstep = (start: number, end: number, value: number) => {
      const progress = clamp((value - start) / (end - start), 0, 1);
      return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    };

    const refreshTargets = () => {
      const previous = new Map(targets.map((target) => [target.element, target]));
      const next = Array.from(document.querySelectorAll<HTMLElement>(".button"))
        .map((element) => {
          const surface = element.querySelector<HTMLElement>(".liquid-button__surface");
          if (!surface) return null;
          return previous.get(element) ?? {
            element,
            surface,
            rect: element.getBoundingClientRect(),
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            tx: 0,
            ty: 0,
            isOutline: element.classList.contains("button--outline"),
          };
        })
        .filter((target): target is LiquidTarget => target !== null);

      targets.forEach((target) => {
        if (next.includes(target)) return;
        target.element.removeAttribute("data-liquid-active");
        target.surface.style.removeProperty("transform");
        target.surface.style.removeProperty("--liquid-ink-x");
        target.surface.style.removeProperty("--liquid-ink-y");
        target.surface.style.removeProperty("--liquid-ink-radius");
        if (activeTarget === target) activeTarget = null;
      });
      targets = next;
      targets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
    };

    const measureTargets = () => {
      targets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
    };

    const renderedRectFor = (target: LiquidTarget) => ({
      left: target.rect.left + target.x,
      right: target.rect.right + target.x,
      top: target.rect.top + target.y,
      bottom: target.rect.bottom + target.y,
    });

    const distanceToRect = (x: number, y: number, rect: ReturnType<typeof renderedRectFor>) => {
      const nearestX = clamp(x, rect.left, rect.right);
      const nearestY = clamp(y, rect.top, rect.bottom);
      return Math.hypot(x - nearestX, y - nearestY);
    };

    function startLoop() {
      if (running || document.hidden || !cursor.initialized) return;
      running = true;
      frame = window.requestAnimationFrame(render);
    }

    const resizeCanvas = () => {
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      canvas.width = Math.round(canvasWidth * dpr);
      canvas.height = Math.round(canvasHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      startLoop();
    };

    const initializeWebGL = () => {
      try {
        gl = canvas.getContext("webgl", {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          powerPreference: "high-performance",
        });
        if (!gl) throw new Error("WebGL is unavailable.");
        gl.getExtension("OES_standard_derivatives");
        program = createProgram(gl);
        gl.useProgram(program);
        const position = gl.getAttribLocation(program, "a_position");
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        usingWebGL = true;
        document.documentElement.classList.add("liquid-webgl-ready");
        resizeCanvas();
      } catch (error) {
        usingWebGL = false;
        document.documentElement.classList.remove("liquid-webgl-ready");
        console.warn("Liquid cursor renderer unavailable; using the standard cursor treatment.", error);
      }
    };

    const uniform = (name: string) => {
      if (!gl || !program) return null;
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
      return uniforms.get(name) ?? null;
    };
    const setUniform2 = (name: string, first: number, second: number) => {
      if (gl) gl.uniform2f(uniform(name), first, second);
    };
    const setUniform1 = (name: string, value: number) => {
      if (gl) gl.uniform1f(uniform(name), value);
    };

    const draw = () => {
      if (!usingWebGL || !gl || !program || !cursor.initialized) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      setUniform2("u_resolution", canvasWidth, canvasHeight);
      setUniform1("u_dpr", dpr);
      setUniform2("u_cursor", cursor.x, cursor.y);
      setUniform2("u_cursor_radii", cursorRadius * (1 + stretch), cursorRadius * (1 - stretch * 0.52));
      setUniform2("u_cursor_direction", directionX, directionY);

      if (activeTarget) {
        const rect = activeTarget.surface.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.height / 2;
        const halfLength = Math.max(rect.width / 2 - radius, 0);
        const skeletonX = clamp(cursor.x, centerX - halfLength, centerX + halfLength);
        const skeletonY = centerY;
        const dx = cursor.x - skeletonX;
        const dy = cursor.y - skeletonY;
        const distance = Math.hypot(dx, dy);
        const cursorToCapsule = distance - radius;
        const absorption = 1 - smootherstep(-cursorRadius, cursorRadius, cursorToCapsule);
        const proximityDistance = distanceToRect(cursor.x, cursor.y, {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        });
        const magneticProgress = 1 - clamp(proximityDistance / magneticRange, 0, 1);
        /* Ink starts as a nearly invisible creep with magnetism, then ramps
           rapidly only over the final 0-12px before the orb touches. Once the
           surfaces connect it remains fully filled until they separate. */
        const separation = cursorToCapsule - cursorRadius;
        const approachingConnection = 1 - smootherstep(0, 12, separation);
        const earlyCreep = Math.pow(magneticProgress, 8) * 0.06;
        const revealProgress = activeTarget.isOutline
          ? separation <= 0
            ? 1
            : earlyCreep + (1 - earlyCreep) * Math.pow(approachingConnection, 4)
          : 1;
        if (activeTarget.isOutline) {
          const fullReach = (halfLength + radius) * 6.25;
          const normalX = distance > 0.001 ? dx / distance : 0;
          const normalY = distance > 0.001 ? dy / distance : -1;
          const revealDepth = 1.5 + fullReach * 0.35 * revealProgress;
          const surfaceX = skeletonX + normalX * radius;
          const surfaceY = skeletonY + normalY * radius;
          const revealOriginX = surfaceX + normalX * (fullReach - revealDepth);
          const revealOriginY = surfaceY + normalY * (fullReach - revealDepth);
          activeTarget.surface.style.setProperty("--liquid-ink-x", `${revealOriginX - rect.left}px`);
          activeTarget.surface.style.setProperty("--liquid-ink-y", `${revealOriginY - rect.top}px`);
          activeTarget.surface.style.setProperty("--liquid-ink-radius", `${fullReach}px`);
        }
        setUniform1("u_target_active", 1);
        setUniform2("u_target_center", centerX, centerY);
        setUniform2("u_projection_center", skeletonX, skeletonY);
        setUniform2("u_surface_normal", distance > 0.001 ? dx / distance : 0, distance > 0.001 ? dy / distance : -1);
        setUniform1("u_target_half_length", halfLength);
        setUniform1("u_target_radius", radius);
        setUniform1("u_cursor_absorption", absorption);
        setUniform1("u_target_reveal", revealProgress);
      } else {
        setUniform1("u_target_active", 0);
        setUniform2("u_target_center", 0, 0);
        setUniform2("u_projection_center", 0, 0);
        setUniform2("u_surface_normal", 0, -1);
        setUniform1("u_target_half_length", 0);
        setUniform1("u_target_radius", 0);
        setUniform1("u_cursor_absorption", 0);
        setUniform1("u_target_reveal", 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const setActiveTarget = (x: number, y: number) => {
      let closest: LiquidTarget | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const target of targets) {
        const distance = distanceToRect(x, y, renderedRectFor(target));
        if (distance < closestDistance) {
          closest = target;
          closestDistance = distance;
        }
      }
      const nextTarget = closestDistance <= magneticRange ? closest : null;
      if (nextTarget !== activeTarget) {
        activeTarget?.element.removeAttribute("data-liquid-active");
        nextTarget?.element.setAttribute("data-liquid-active", "true");
        activeTarget = nextTarget;
      }
      targets.forEach((target) => {
        if (target !== activeTarget) {
          target.tx = 0;
          target.ty = 0;
          if (target.isOutline) {
            target.surface.style.removeProperty("--liquid-ink-x");
            target.surface.style.removeProperty("--liquid-ink-y");
            target.surface.style.removeProperty("--liquid-ink-radius");
          }
          return;
        }
        const centerX = target.rect.left + target.rect.width / 2;
        const centerY = target.rect.top + target.rect.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const proximity = 1 - clamp(closestDistance / magneticRange, 0, 1);
        const desiredShift = Math.min(distance * magnetStrength * proximity * proximity, maxButtonShift);
        target.tx = (dx / distance) * desiredShift;
        target.ty = (dy / distance) * desiredShift;
      });
    };

    function render() {
      cursor.vx = (cursor.vx + (pointer.x - cursor.x) * 0.12) * 0.7;
      cursor.vy = (cursor.vy + (pointer.y - cursor.y) * 0.12) * 0.7;
      cursor.x += cursor.vx;
      cursor.y += cursor.vy;
      setActiveTarget(cursor.x, cursor.y);
      const speed = Math.min(Math.hypot(cursor.vx, cursor.vy), 28);
      stretch = Math.min(speed * 0.018, 0.42);
      angle = Math.atan2(cursor.vy, cursor.vx);
      if (speed > 0.001) {
        directionX = cursor.vx / speed;
        directionY = cursor.vy / speed;
      }

      let buttonsMoving = false;
      targets.forEach((target) => {
        target.vx = (target.vx + (target.tx - target.x) * 0.12) * 0.72;
        target.vy = (target.vy + (target.ty - target.y) * 0.12) * 0.72;
        target.x += target.vx;
        target.y += target.vy;
        target.surface.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
        buttonsMoving ||= Math.abs(target.vx) + Math.abs(target.vy) +
          Math.abs(target.tx - target.x) + Math.abs(target.ty - target.y) > 0.025;
      });

      if (usingWebGL) draw();
      else fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
      const cursorMoving = Math.abs(cursor.vx) + Math.abs(cursor.vy) +
        Math.abs(pointer.x - cursor.x) + Math.abs(pointer.y - cursor.y) > 0.025;
      if (cursorMoving || buttonsMoving) frame = window.requestAnimationFrame(render);
      else running = false;
    }

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (!cursor.initialized) {
        cursor.initialized = true;
        cursor.x = pointer.x;
        cursor.y = pointer.y;
      }
      if (usingWebGL) canvas.classList.add("is-visible");
      else fallback.classList.add("fluid-cursor--visible");
      startLoop();
    };

    const resetTargets = () => {
      activeTarget?.element.removeAttribute("data-liquid-active");
      activeTarget = null;
      targets.forEach((target) => {
        target.tx = 0;
        target.ty = 0;
        if (target.isOutline) {
          target.surface.style.removeProperty("--liquid-ink-x");
          target.surface.style.removeProperty("--liquid-ink-y");
          target.surface.style.removeProperty("--liquid-ink-radius");
        }
      });
      startLoop();
    };
    const leaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointer.active = false;
      fallback.classList.remove("fluid-cursor--visible");
      canvas.classList.remove("is-visible");
      resetTargets();
    };
    const enterWindow = () => {
      if (!cursor.initialized) return;
      if (usingWebGL) canvas.classList.add("is-visible");
      else fallback.classList.add("fluid-cursor--visible");
      startLoop();
    };
    const handleResize = () => { measureTargets(); resizeCanvas(); };
    const handleScroll = () => { measureTargets(); startLoop(); };
    const syncVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        running = false;
        fallback.classList.remove("fluid-cursor--visible");
        canvas.classList.remove("is-visible");
      } else if (pointer.active) enterWindow();
    };

    refreshTargets();
    initializeWebGL();
    const observer = new MutationObserver(() => { refreshTargets(); startLoop(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leaveWindow);
    document.documentElement.addEventListener("pointerenter", enterWindow);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      document.documentElement.removeEventListener("pointerleave", leaveWindow);
      document.documentElement.removeEventListener("pointerenter", enterWindow);
      document.removeEventListener("visibilitychange", syncVisibility);
      document.documentElement.classList.remove("liquid-webgl-ready");
      targets.forEach((target) => {
        target.element.removeAttribute("data-liquid-active");
        target.surface.style.removeProperty("transform");
        target.surface.style.removeProperty("--liquid-ink-x");
        target.surface.style.removeProperty("--liquid-ink-y");
        target.surface.style.removeProperty("--liquid-ink-radius");
      });
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className="liquid-button-canvas" aria-hidden="true" />
      <div ref={fallbackRef} className="fluid-cursor" aria-hidden="true" />
    </>,
    document.body,
  );
}
