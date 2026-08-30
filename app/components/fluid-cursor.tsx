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
  uniform float u_target_red;

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
    float jointBlend,
    float endcapProgress
  ) {
    float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
    vec2 tangent = vec2(-surfaceNormal.y, surfaceNormal.x);
    vec2 localPoint = point - u_projection_center;
    float surfacePlaneDistance = dot(localPoint, surfaceNormal) - u_target_radius;
    /* The long edges are flat, but the ends are circular. Blend to the true
       capsule distance and arc length before the cursor reaches the cap, so
       the liquid seam follows the curve instead of ending in visible tips. */
    float curvedSurfaceDistance = capsuleDistance(
      point,
      u_target_center,
      u_target_half_length,
      u_target_radius
    );
    vec2 pointDirection = safeNormalize(localPoint, surfaceNormal);
    float arcAngle = atan(
      surfaceNormal.x * pointDirection.y - surfaceNormal.y * pointDirection.x,
      dot(surfaceNormal, pointDirection)
    );
    float straightTangentDistance = dot(localPoint, tangent);
    float curvedTangentDistance = arcAngle * u_target_radius;
    float tangentDistance = mix(straightTangentDistance, curvedTangentDistance, endcapProgress);
    float surfaceDistance = mix(surfacePlaneDistance, curvedSurfaceDistance, endcapProgress);
    /* On a rounded end-cap, carry the deformation toward both points where
       the cap meets the horizontal edges. A narrow local Gaussian is what
       leaves the small, visible tips at those transitions. */
    float flatTangentReach = cursorMaximum * 4.0;
    float capTangentReach = max(flatTangentReach, u_target_radius * 3.4);
    float tangentReach = mix(flatTangentReach, capTangentReach, endcapProgress);
    float tangentPosition = tangentDistance / max(tangentReach, 0.001);
    float normalPosition = surfaceDistance / max(cursorMaximum * 2.4, 0.001);
    float surfaceWindow = exp(-0.5 * tangentPosition * tangentPosition) *
      exp(-0.5 * normalPosition * normalPosition);
    float rawDisplacement = max(surfaceDistance - kernelDistance, 0.0) * surfaceWindow;
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

  float surfaceUnionWidthFactor(float endcapProgress) {
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
    /* Start the hand-off just before the circular cap. This removes the
       discontinuity caused by clamp() pinning the projection at an end. */
    float capOffset = abs(u_cursor.x - u_target_center.x) - u_target_half_length;
    float endcapProgress = smoothstep(
      -u_target_radius * 0.18,
      u_target_radius * 0.72,
      capOffset
    );
    float widthFactor = surfaceUnionWidthFactor(endcapProgress);
    float visibleCursorDistance = resistedCursorDistance(point, surfaceNormal, absorption);
    vec2 localPoint = point - u_projection_center;
    float surfacePlaneDistance = dot(localPoint, surfaceNormal) - u_target_radius;
    float curvedSurfaceDistance = capsuleDistance(
      point,
      u_target_center,
      u_target_half_length,
      u_target_radius
    );
    float surfaceDistance = mix(surfacePlaneDistance, curvedSurfaceDistance, endcapProgress);
    float kernelRadius = cursorMaximum * 3.2 * nearFactor * widthFactor;
    float kernelDistance = polynomialUnion(visibleCursorDistance, surfaceDistance, kernelRadius);
    float localShape = surfaceKernelShape(
      point,
      visibleCursorDistance,
      targetDistance,
      surfaceNormal,
      kernelDistance,
      cursorMaximum * 1.42 * nearFactor * widthFactor,
      smoothstep(0.08, 0.58, nearFactor),
      endcapProgress
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
    float diagonalApproach = smoothstep(
      0.14,
      0.58,
      min(abs(surfaceNormal.x), abs(surfaceNormal.y))
    );
    /* Keep the established union geometry. Only push the reveal field a
       fraction farther into the pill at diagonal contact to prevent a seam. */
    float revealOverlap = 1.5 + diagonalApproach * 0.75;
    float revealDepth = revealOverlap + fullReach * 0.35 * u_target_reveal;
    vec2 surfacePoint = u_projection_center + surfaceNormal * u_target_radius;
    vec2 revealOrigin = surfacePoint + surfaceNormal * (fullReach - revealDepth);
    float revealDistance = length(point - revealOrigin) - fullReach;
    return u_target_reveal > 0.999 ? targetDistance : max(targetDistance, revealDistance);
  }

  void main() {
    vec2 point = vec2(gl_FragCoord.x / u_dpr, u_resolution.y - gl_FragCoord.y / u_dpr);
    float cursorDistance = ellipseDistance(point, u_cursor, u_cursor_radii, u_cursor_direction);
    float finalDistance = cursorDistance;
    float targetRedWeight = 0.0;
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
      /* Use one continuous proximity curve for colour. It preserves the quiet
         beginning of the bridge, accelerates through the middle, and reaches
         the target colour while the cursor is still entering the pill. */
      float cursorMinimum = min(u_cursor_radii.x, u_cursor_radii.y);
      float bridgeApproach = smoothstep(0.62, 0.995, nearFactor);
      float colourProgress = pow(bridgeApproach, 3.4);
      float easedColourProgress = smoothstep(0.0, 1.0, colourProgress);
      float shellDepth = mix(0.7, cursorMinimum * 1.45, easedColourProgress);
      float shellFeather = cursorMinimum * 0.72;
      float shellVisibility = smoothstep(0.0, 0.06, colourProgress);
      float cursorShell = smoothstep(
        -shellDepth - shellFeather,
        -shellDepth + shellFeather,
        cursorDistance
      );
      float cursorRedWeight = u_target_red * shellVisibility * cursorShell;
      float pillOwnership = smoothstep(-16.0, 16.0, cursorDistance - targetDistance);
      targetRedWeight = mix(cursorRedWeight, u_target_red, pillOwnership);
    }

    /* Keep every liquid silhouette crisp. The browser still anti-aliases the
       physical SDF edge, but there is no added blur around the button or orb. */
    float edge = max(0.7, fwidth(finalDistance));
    float alpha = 1.0 - smoothstep(-edge, edge, finalDistance);
    float mixedRedWeight = pow(clamp(targetRedWeight, 0.0, 1.0), 0.68);
    vec3 ink = mix(vec3(0.0353), vec3(0.89, 0.2, 0.2), mixedRedWeight);
    vec3 premultipliedInk = ink * alpha;
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
  isRed: boolean;
}

interface DrawBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
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
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted || !isEnabled) return;
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
    // Keep the liquid renderer alive through very small, slow pointer changes
    // near a CTA. This avoids stopping and restarting between adjacent frames.
    const cursorIdleGrace = 220;
    const settledFrameLimit = 12;
    const scrollSettleDelay = 120;
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
    let previousDrawBounds: DrawBounds | null = null;
    let measurementFrame = 0;
    let targetResizeObserver: ResizeObserver | null = null;
    let scrollIdleTimer = 0;
    let lastPointerMoveAt = 0;
    let settledFrames = 0;
    let magneticTranslationSuspended = false;
    let lastScrollX = window.scrollX;
    let lastScrollY = window.scrollY;
    const uniforms = new Map<string, WebGLUniformLocation | null>();

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const smootherstep = (start: number, end: number, value: number) => {
      const progress = clamp((value - start) / (end - start), 0, 1);
      return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    };

    const refreshTargets = () => {
      const previous = new Map(targets.map((target) => [target.element, target]));
      // Only links that represent a destination are eligible. Controls such as
      // filters stay ordinary buttons, which keeps the costly interaction for
      // actual calls to action.
      const next = Array.from(document.querySelectorAll<HTMLElement>("a.button"))
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
            isRed: element.classList.contains("button--red"),
          };
        })
        .filter((target): target is LiquidTarget => target !== null);

      targets.forEach((target) => {
        if (next.includes(target)) return;
        targetResizeObserver?.unobserve(target.surface);
        target.element.removeAttribute("data-liquid-active");
        target.element.removeAttribute("data-liquid-rendered");
        target.surface.style.removeProperty("transform");
        target.surface.style.removeProperty("--liquid-ink-x");
        target.surface.style.removeProperty("--liquid-ink-y");
        target.surface.style.removeProperty("--liquid-ink-radius");
        if (activeTarget === target) activeTarget = null;
      });
      targets = next;
      targets.forEach((target) => {
        target.rect = target.element.getBoundingClientRect();
        targetResizeObserver?.observe(target.surface);
      });
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

    const nearestTargetDistance = (x: number, y: number) => {
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const target of targets) {
        closestDistance = Math.min(closestDistance, distanceToRect(x, y, renderedRectFor(target)));
      }
      return closestDistance;
    };

    const isNearTarget = (x: number, y: number) => nearestTargetDistance(x, y) <= magneticRange;

    const showFallbackAtPointer = () => {
      canvas.classList.remove("is-visible");
      fallback.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      fallback.classList.add("fluid-cursor--visible");
    };

    const showLiquidRenderer = () => {
      fallback.classList.remove("fluid-cursor--visible");
      canvas.classList.add("is-visible");
    };

    const unionBounds = (first: DrawBounds, second: DrawBounds): DrawBounds => ({
      left: Math.min(first.left, second.left),
      top: Math.min(first.top, second.top),
      right: Math.max(first.right, second.right),
      bottom: Math.max(first.bottom, second.bottom),
    });

    const clampBounds = (bounds: DrawBounds): DrawBounds => ({
      left: clamp(bounds.left, 0, canvasWidth),
      top: clamp(bounds.top, 0, canvasHeight),
      right: clamp(bounds.right, 0, canvasWidth),
      bottom: clamp(bounds.bottom, 0, canvasHeight),
    });

    const applyScissor = (bounds: DrawBounds, dpr: number) => {
      if (!gl) return;
      const clamped = clampBounds(bounds);
      const left = Math.floor(clamped.left * dpr);
      const bottom = Math.floor((canvasHeight - clamped.bottom) * dpr);
      const width = Math.ceil((clamped.right - clamped.left) * dpr);
      const height = Math.ceil((clamped.bottom - clamped.top) * dpr);
      gl.scissor(left, bottom, Math.max(width, 1), Math.max(height, 1));
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
      gl.disable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      previousDrawBounds = null;
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
        gl.enable(gl.SCISSOR_TEST);
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
      const cursorExtent = cursorRadius * (1 + stretch) + 8;
      let currentDrawBounds: DrawBounds = {
        left: cursor.x - cursorExtent,
        top: cursor.y - cursorExtent,
        right: cursor.x + cursorExtent,
        bottom: cursor.y + cursorExtent,
      };
      if (activeTarget) {
        const targetRect = renderedRectFor(activeTarget);
        const joinPadding = magneticRange + cursorRadius * 3;
        currentDrawBounds = unionBounds(currentDrawBounds, {
          left: targetRect.left - joinPadding,
          top: targetRect.top - joinPadding,
          right: targetRect.right + joinPadding,
          bottom: targetRect.bottom + joinPadding,
        });
      }
      currentDrawBounds = clampBounds(currentDrawBounds);
      const clearBounds = previousDrawBounds
        ? unionBounds(previousDrawBounds, currentDrawBounds)
        : currentDrawBounds;
      applyScissor(clearBounds, dpr);
      gl.clear(gl.COLOR_BUFFER_BIT);
      applyScissor(currentDrawBounds, dpr);
      gl.useProgram(program);
      setUniform2("u_resolution", canvasWidth, canvasHeight);
      setUniform1("u_dpr", dpr);
      setUniform2("u_cursor", cursor.x, cursor.y);
      setUniform2("u_cursor_radii", cursorRadius * (1 + stretch), cursorRadius * (1 - stretch * 0.52));
      setUniform2("u_cursor_direction", directionX, directionY);
      if (activeTarget) {
        // The surface is translated from the button's cached layout box.
        // Reconstruct its rendered bounds instead of forcing a layout read
        // after transform writes on every animation frame.
        const renderedRect = renderedRectFor(activeTarget);
        const rect = {
          ...renderedRect,
          width: activeTarget.rect.width,
          height: activeTarget.rect.height,
        };
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
          const diagonalApproach = smootherstep(
            0.14,
            0.58,
            Math.min(Math.abs(normalX), Math.abs(normalY)),
          );
          const revealOverlap = 1.5 + diagonalApproach * 0.75;
          const revealDepth = revealOverlap + fullReach * 0.35 * revealProgress;
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
        setUniform1("u_target_red", activeTarget.isRed ? 1 : 0);
      } else {
        setUniform1("u_target_active", 0);
        setUniform2("u_target_center", 0, 0);
        setUniform2("u_projection_center", 0, 0);
        setUniform2("u_surface_normal", 0, -1);
        setUniform1("u_target_half_length", 0);
        setUniform1("u_target_radius", 0);
        setUniform1("u_cursor_absorption", 0);
        setUniform1("u_target_reveal", 0);
        setUniform1("u_target_red", 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      activeTarget?.element.setAttribute("data-liquid-rendered", "true");
      previousDrawBounds = currentDrawBounds;
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
        activeTarget?.element.removeAttribute("data-liquid-rendered");
        nextTarget?.element.setAttribute("data-liquid-active", "true");
        activeTarget = nextTarget;
      }
      targets.forEach((target) => {
        if (target !== activeTarget) {
          target.element.removeAttribute("data-liquid-rendered");
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
        if (magneticTranslationSuspended) {
          target.tx = 0;
          target.ty = 0;
          return;
        }
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
      const pointerNearTarget = isNearTarget(pointer.x, pointer.y);
      const speed = Math.min(Math.hypot(cursor.vx, cursor.vy), 28);
      stretch = Math.min(speed * 0.018, 0.42);
      angle = Math.atan2(cursor.vy, cursor.vx);
      // Ignore near-zero direction reversals so the ellipse does not flip its
      // axis while the pointer is making tiny corrective movements.
      if (speed > 0.08) {
        directionX = cursor.vx / speed;
        directionY = cursor.vy / speed;
      }

      let buttonsMoving = false;
      targets.forEach((target) => {
        const previousX = target.x;
        const previousY = target.y;
        target.vx = (target.vx + (target.tx - target.x) * 0.12) * 0.72;
        target.vy = (target.vy + (target.ty - target.y) * 0.12) * 0.72;
        target.x += target.vx;
        target.y += target.vy;
        if (Math.abs(target.x - previousX) + Math.abs(target.y - previousY) > 0.001) {
          // Keep the live HTML label in the same continuous motion as its
          // WebGL pill. Pixel snapping made the text sharper but introduced
          // visible stepping, which is worse for this interaction.
          target.surface.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
        }
        buttonsMoving ||= Math.abs(target.vx) + Math.abs(target.vy) +
          Math.abs(target.tx - target.x) + Math.abs(target.ty - target.y) > 0.025;
      });

      const shouldRenderLiquid = usingWebGL && (activeTarget !== null || pointerNearTarget);
      if (shouldRenderLiquid) {
        showLiquidRenderer();
        draw();
      } else {
        canvas?.classList.remove("is-visible");
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
      }
      const cursorMoving = Math.abs(cursor.vx) + Math.abs(cursor.vy) +
        Math.abs(pointer.x - cursor.x) + Math.abs(pointer.y - cursor.y) > 0.025;
      if (cursorMoving || buttonsMoving) settledFrames = 0;
      else settledFrames += 1;
      const insideIdleGrace = performance.now() - lastPointerMoveAt < cursorIdleGrace;
      const liquidWorkNeeded = activeTarget !== null || pointerNearTarget || buttonsMoving;
      if (cursorMoving || buttonsMoving || (liquidWorkNeeded && (insideIdleGrace || settledFrames < settledFrameLimit))) {
        frame = window.requestAnimationFrame(render);
      } else {
        running = false;
        if (pointer.active && !activeTarget) showFallbackAtPointer();
      }
    }

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      lastPointerMoveAt = performance.now();
      settledFrames = 0;
      if (!cursor.initialized) {
        cursor.initialized = true;
        cursor.x = pointer.x;
        cursor.y = pointer.y;
      }
      const pointerNearTarget = isNearTarget(pointer.x, pointer.y);
      if (!activeTarget && !pointerNearTarget) {
        canvas.classList.remove("is-visible");
        fallback.classList.add("fluid-cursor--visible");
      } else {
        // Keep the HTML cursor visible until render() has drawn the first
        // WebGL frame. The renderer then swaps both surfaces in one frame,
        // avoiding an opacity crossfade or a blank canvas flash.
        fallback.classList.add("fluid-cursor--visible");
      }
      startLoop();
    };

    const resetTargets = () => {
      activeTarget?.element.removeAttribute("data-liquid-active");
      activeTarget?.element.removeAttribute("data-liquid-rendered");
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
      if (isNearTarget(pointer.x, pointer.y) || activeTarget) {
        if (usingWebGL) showLiquidRenderer();
        else fallback.classList.add("fluid-cursor--visible");
        startLoop();
      } else {
        showFallbackAtPointer();
      }
    };
    const scheduleMeasurement = (resize = false) => {
      if (measurementFrame) return;
      measurementFrame = window.requestAnimationFrame(() => {
        measurementFrame = 0;
        measureTargets();
        if (resize) resizeCanvas();
        else startLoop();
      });
    };
    const handleResize = () => scheduleMeasurement(true);
    const handleScroll = () => {
      const currentScrollX = window.scrollX;
      const currentScrollY = window.scrollY;
      const deltaX = currentScrollX - lastScrollX;
      const deltaY = currentScrollY - lastScrollY;
      lastScrollX = currentScrollX;
      lastScrollY = currentScrollY;

      // Shift cached viewport coordinates by the scroll delta immediately.
      // Fusion can therefore remain active without waiting for layout reads.
      if (deltaX !== 0 || deltaY !== 0) {
        targets.forEach((target) => {
          target.rect = new DOMRect(
            target.rect.x - deltaX,
            target.rect.y - deltaY,
            target.rect.width,
            target.rect.height,
          );
        });
      }

      // Keep the liquid union, but prevent scrolling content from pulling the
      // real DOM button toward a stationary pointer.
      if (!magneticTranslationSuspended) {
        magneticTranslationSuspended = true;
        targets.forEach((target) => {
          target.x = 0;
          target.y = 0;
          target.vx = 0;
          target.vy = 0;
          target.tx = 0;
          target.ty = 0;
          target.surface.style.removeProperty("transform");
        });
      }
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        magneticTranslationSuspended = false;
        measureTargets();
        startLoop();
      }, scrollSettleDelay);
      startLoop();
    };
    const syncVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        running = false;
        fallback.classList.remove("fluid-cursor--visible");
        canvas.classList.remove("is-visible");
      } else if (pointer.active) enterWindow();
    };

    targetResizeObserver = new ResizeObserver(() => scheduleMeasurement());
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
      targetResizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measurementFrame);
      window.clearTimeout(scrollIdleTimer);
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      document.documentElement.removeEventListener("pointerleave", leaveWindow);
      document.documentElement.removeEventListener("pointerenter", enterWindow);
      document.removeEventListener("visibilitychange", syncVisibility);
      document.documentElement.classList.remove("liquid-webgl-ready");
      targets.forEach((target) => {
        target.element.removeAttribute("data-liquid-active");
        target.element.removeAttribute("data-liquid-rendered");
        target.surface.style.removeProperty("transform");
        target.surface.style.removeProperty("--liquid-ink-x");
        target.surface.style.removeProperty("--liquid-ink-y");
        target.surface.style.removeProperty("--liquid-ink-radius");
      });
    };
  }, [mounted, isEnabled]);

  if (!mounted) return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className="liquid-button-canvas" aria-hidden="true" />
      <div ref={fallbackRef} className="fluid-cursor" aria-hidden="true" />
      {import.meta.env.DEV ? (
        <button
          className="fluid-cursor-toggle"
          type="button"
          aria-pressed={isEnabled}
          onClick={() => setIsEnabled((enabled) => !enabled)}
        >
          Fluid cursor: {isEnabled ? "on" : "off"}
        </button>
      ) : null}
    </>,
    document.body,
  );
}
