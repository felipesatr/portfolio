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
  uniform float u_target_filled;
  uniform float u_target_neutral;
  uniform vec2 u_target_half_size;
  uniform float u_target_corner_radius;
  uniform float u_target_secondary;
  uniform float u_target_hover;
  uniform vec3 u_cursor_color;
  uniform vec3 u_primary_color;
  uniform vec3 u_primary_hover_color;
  uniform vec3 u_secondary_color;
  uniform vec3 u_secondary_hover_color;
  uniform vec3 u_neutral_target_color;

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

  float roundedRectDistance(vec2 point, vec2 center, vec2 halfSize, float radius) {
    vec2 innerHalfSize = max(halfSize - vec2(radius), vec2(0.0));
    vec2 delta = abs(point - center) - innerHalfSize;
    return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0) - radius;
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
    // Small neutral controls use the normal capsule merge with a restrained,
    // slimmer bridge so the orb does not overpower their compact geometry.
    float neutralBridgeScale = mix(1.0, 0.72, u_target_neutral);
    float kernelRadius = cursorMaximum * 3.2 * nearFactor * widthFactor * neutralBridgeScale;
    float kernelDistance = polynomialUnion(visibleCursorDistance, surfaceDistance, kernelRadius);
    float localShape = surfaceKernelShape(
      point,
      visibleCursorDistance,
      targetDistance,
      surfaceNormal,
      kernelDistance,
      cursorMaximum * 1.42 * nearFactor * widthFactor * neutralBridgeScale,
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
    float targetColorWeight = 0.0;
    if (u_target_active > 0.5) {
      float targetDistance = capsuleDistance(point, u_target_center, u_target_half_length, u_target_radius);
      float revealedTargetDistance = revealCapsuleFromCursor(point, targetDistance);
      float colorNearFactor = 0.0;
      float colorTargetDistance = targetDistance;
      float colorEnabled = max(u_target_filled, u_target_neutral);
      /* Play and Try Again keep their own target colour and no-magnetism
         behavior, but their physical merge is the exact same capsule union
         used by the regular buttons. */
      vec2 surfaceNormal = safeNormalize(u_surface_normal, vec2(0.0, -1.0));
      float cursorMaximum = max(u_cursor_radii.x, u_cursor_radii.y);
      float surfaceGap = max(length(u_cursor - u_projection_center) - u_target_radius, 0.0);
      float nearFactor = 1.0 - smoothstep(cursorMaximum * 0.55, cursorMaximum * 4.8, surfaceGap);
      // Neutral controls render the complete measured capsule so the liquid
      // never narrows the long Try Again pill; other buttons keep their reveal.
      float mergeTargetDistance = u_target_neutral > 0.5 ? targetDistance : revealedTargetDistance;
      finalDistance = polynomialFixedButtonUnion(
        point,
        cursorDistance,
        mergeTargetDistance,
        surfaceNormal,
        u_cursor_absorption,
        nearFactor
      );
      colorNearFactor = nearFactor;

      /* Buttons and neutral surfaces deliberately share this one colour-merge
         implementation. Their geometry and destination colour can differ;
         the radial colour behaviour cannot. */
      float cursorMinimum = min(u_cursor_radii.x, u_cursor_radii.y);
      float bridgeApproach = smoothstep(0.62, 0.995, colorNearFactor);
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
      float cursorTargetWeight = colorEnabled * shellVisibility * cursorShell;
      float targetOwnership = smoothstep(
        -16.0,
        16.0,
        cursorDistance - colorTargetDistance
      );
      targetColorWeight = mix(
        cursorTargetWeight,
        1.0,
        colorEnabled * targetOwnership
      );
    }

    /* Keep every liquid silhouette crisp. The browser still anti-aliases the
       physical SDF edge, but there is no added blur around the button or orb. */
    float edge = max(0.7, fwidth(finalDistance));
    float alpha = 1.0 - smoothstep(-edge, edge, finalDistance);
    /* Fully entering a CTA is a distinct, smooth state. It darkens the
       entire joined silhouette, so the rendered button and cursor never
       disagree about whether they are in their hover colour. */
    vec3 cursorInk = u_cursor_color;
    vec3 targetInk = mix(
      mix(u_primary_color, u_secondary_color, u_target_secondary),
      mix(u_primary_hover_color, u_secondary_hover_color, u_target_secondary),
      u_target_hover
    );
    targetInk = mix(targetInk, u_neutral_target_color, u_target_neutral);
    vec3 ink = mix(cursorInk, targetInk, targetColorWeight);
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
  isNeutralMerge: boolean;
  cornerRadius: number;
  isSecondary: boolean;
  hoverProgress: number;
}

interface NegativeMaskTarget {
  element: HTMLElement;
  rect: DOMRect;
}

interface DrawBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type Rgb = readonly [number, number, number];

interface ThemeColors {
  cursor: Rgb;
  primary: Rgb;
  primaryHover: Rgb;
  secondary: Rgb;
  secondaryHover: Rgb;
  neutralTarget: Rgb;
}

function hexToRgb(value: string, fallback: Rgb): Rgb {
  const hex = value.trim().replace("#", "");
  if (!/^[\da-f]{6}$/i.test(hex)) return fallback;

  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function mixRgb(first: Rgb, second: Rgb, secondWeight: number): Rgb {
  const firstWeight = 1 - secondWeight;
  return [
    first[0] * firstWeight + second[0] * secondWeight,
    first[1] * firstWeight + second[1] * secondWeight,
    first[2] * firstWeight + second[2] * secondWeight,
  ];
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
  const knobMaskRef = useRef<SVGSVGElement>(null);
  const knobMaskClipRef = useRef<SVGCircleElement>(null);
  const knobMaskPathRef = useRef<SVGPathElement>(null);
  const textMaskRef = useRef<HTMLDivElement>(null);
  const toolTitleRef = useRef<HTMLSpanElement>(null);
  const toolDescriptionRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const fallbackCursor = fallbackRef.current;
    const knobMask = knobMaskRef.current;
    const knobMaskClip = knobMaskClipRef.current;
    const knobMaskPath = knobMaskPathRef.current;
    const textMask = textMaskRef.current;
    const toolTitle = toolTitleRef.current;
    const toolDescription = toolDescriptionRef.current;
    if (!canvas || !fallbackCursor || !knobMask || !knobMaskClip || !knobMaskPath || !textMask || !toolTitle || !toolDescription) return;
    const fallback = fallbackCursor;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const readThemeColors = (): ThemeColors => {
      const styles = window.getComputedStyle(document.documentElement);
      const page = hexToRgb(styles.getPropertyValue("--page"), [1, 1, 1]);
      const soft = hexToRgb(styles.getPropertyValue("--soft"), [0.94, 0.94, 0.94]);
      return {
        cursor: hexToRgb(styles.getPropertyValue("--cursor"), [0.09, 0.09, 0.09]),
        primary: hexToRgb(styles.getPropertyValue("--primary"), [0.412, 0.282, 0.91]),
        primaryHover: hexToRgb(styles.getPropertyValue("--primary-hover"), [0.337, 0.212, 0.784]),
        secondary: hexToRgb(styles.getPropertyValue("--secondary"), [0.89, 0.2, 0.2]),
        secondaryHover: hexToRgb(styles.getPropertyValue("--secondary-hover"), [0.749, 0.141, 0.157]),
        // Neutral liquid stays white; the physical control owns its grey hover fade.
        neutralTarget: hexToRgb("#ffffff", [1, 1, 1]),
      };
    };

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
    let negativeMaskTargets: NegativeMaskTarget[] = [];
    let textMaskSource: HTMLElement | null = null;
    let activeTarget: LiquidTarget | null = null;
    let activeTool: HTMLElement | null = null;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let usingWebGL = false;
    let frame = 0;
    let running = false;
    let cursorSuppressed = false;
    let cursorResumeFallbackUntil = 0;
    let liquidWasRendering = false;
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
    let toolLeaveTimer = 0;
    let toolMorphing = false;
    let toolMorphDuration = 145;
    let toolMorphProgress = 0;
    let toolMorphLastTime = 0;
    let toolMorphStartWidth = 0;
    let toolMorphStartHeight = 0;
    let toolMorphStartRadius = 0;
    let toolMorphNearSquareSize = 0;
    let toolMorphLargeBallSize = 0;
    let toolExitPace = 0;
    let toolCopyTimer = 0;
    let toolCopyFrame = 0;
    let toolEntryTimer = 0;
    let lastPointerMoveAt = 0;
    let settledFrames = 0;
    let magneticTranslationSuspended = false;
    let lastScrollX = window.scrollX;
    let lastScrollY = window.scrollY;
    let themeColors = readThemeColors();
    const uniforms = new Map<string, WebGLUniformLocation | null>();

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const isHeroIntroLocked = () => {
      const state = document.documentElement.dataset.heroIntro;
      return state === "pending" || state === "ready";
    };
    const smootherstep = (start: number, end: number, value: number) => {
      const progress = clamp((value - start) / (end - start), 0, 1);
      return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    };

    const refreshTargets = () => {
      const previous = new Map(targets.map((target) => [target.element, target]));
      // Destination CTAs and a few explicitly marked neutral surfaces can use
      // the liquid field. Ordinary controls remain native.
      const next = Array.from(document.querySelectorAll<HTMLElement>("a.button, [data-fluid-cursor-surface]"))
        .map((element) => {
          const isNeutralMerge = element.hasAttribute("data-fluid-cursor-surface");
          const surface = isNeutralMerge
            ? element
            : element.querySelector<HTMLElement>(".liquid-button__surface");
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
            isOutline: element.classList.contains("button--outline") || isNeutralMerge,
            isNeutralMerge,
            cornerRadius: Number.parseFloat(window.getComputedStyle(element).borderTopLeftRadius) || 0,
            isSecondary: element.classList.contains("button--secondary") || element.classList.contains("button--red"),
            hoverProgress: 0,
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
      negativeMaskTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-fluid-cursor-negative-mask]"))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    };

    const measureTargets = () => {
      targets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
      negativeMaskTargets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
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

    const activationRangeFor = (target: LiquidTarget) => target.element.hasAttribute("data-fluid-cursor-tight") ? 34 : magneticRange;
    const isNearTarget = (x: number, y: number) => targets.some((target) => {
      return distanceToRect(x, y, renderedRectFor(target)) <= activationRangeFor(target);
    });

    const syncNegativeMask = (x: number, y: number) => {
      // Several text targets can overlap the orb at once (for example, the
      // Type Racer timer above the first words). Resolve that overlap by
      // proximity, not DOM order, so the text directly under the orb wins.
      let target: NegativeMaskTarget | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of negativeMaskTargets) {
        const { element, rect } = candidate;
        let distance: number;
        if (!element.classList.contains("lab-etch__knob")) {
          distance = distanceToRect(x, y, rect);
        } else {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          // Activate at the first visible contact with the orb, rather than
          // after its centre has crossed into the knob.
          distance = Math.max(0, Math.hypot(x - centerX, y - centerY) - rect.width / 2);
        }
        if (distance <= cursorRadius * 1.04 && distance < closestDistance) {
          target = candidate;
          closestDistance = distance;
        }
      }
      if (!target) {
        knobMask.style.opacity = "0";
        textMask.style.opacity = "0";
        textMaskSource = null;
        return;
      }
      if (!target.element.classList.contains("lab-etch__knob")) {
        knobMask.style.opacity = "0";
        if (textMaskSource !== target.element || textMask.textContent !== target.element.textContent) {
          const clone = target.element.cloneNode(true) as HTMLElement;
          const sourceStyle = window.getComputedStyle(target.element);
          clone.removeAttribute("data-fluid-cursor-negative-mask");
          clone.style.setProperty("position", "static");
          clone.style.setProperty("inset", "auto");
          clone.style.setProperty("display", sourceStyle.display);
          clone.style.setProperty("font", sourceStyle.font);
          clone.style.setProperty("letter-spacing", sourceStyle.letterSpacing);
          clone.style.setProperty("word-spacing", sourceStyle.wordSpacing);
          clone.style.setProperty("line-height", sourceStyle.lineHeight);
          clone.style.setProperty("text-transform", sourceStyle.textTransform);
          clone.style.setProperty("white-space", sourceStyle.whiteSpace);
          clone.style.setProperty("text-align", sourceStyle.textAlign);
          clone.style.setProperty("transform", "none");
          clone.style.setProperty("animation", "none");
          clone.style.setProperty("margin", "0");
          clone.style.setProperty("color", "var(--cursor-ink)", "important");
          clone.querySelectorAll<HTMLElement>("*").forEach((child) => child.style.setProperty("color", "var(--cursor-ink)", "important"));
          textMask.replaceChildren(clone);
          textMaskSource = target.element;
        }
        textMask.style.left = `${target.rect.left}px`;
        textMask.style.top = `${target.rect.top}px`;
        textMask.style.width = `${target.rect.width}px`;
        textMask.style.height = `${target.rect.height}px`;
        textMask.style.transform = "none";
        textMask.style.clipPath = `circle(${cursorRadius * 1.04}px at ${x - target.rect.left}px ${y - target.rect.top}px)`;
        textMask.style.opacity = "1";
        return;
      }
      textMask.style.opacity = "0";
      textMaskSource = null;
      const angle = Number.parseFloat(window.getComputedStyle(target.element).getPropertyValue("--knob-angle")) || 0;
      const maskX = ((x - target.rect.left) / target.rect.width) * 100;
      const maskY = ((y - target.rect.top) / target.rect.height) * 100;
      const maskRadius = ((cursorRadius * 1.04) / target.rect.width) * 100;
      knobMask.style.left = `${target.rect.left}px`;
      knobMask.style.top = `${target.rect.top}px`;
      knobMask.style.width = `${target.rect.width}px`;
      knobMask.style.height = `${target.rect.height}px`;
      // This is the knob equivalent of the text duplicate: the original SVG
      // stroke is reproduced in a fixed overlay. Rotate only that copied line,
      // never its clipping circle, so the mask remains under the orb.
      knobMask.style.transform = "none";
      knobMask.style.opacity = "1";
      knobMaskPath.setAttribute("transform", `rotate(${angle} 50 50)`);
      knobMaskClip.setAttribute("cx", `${maskX}`);
      knobMaskClip.setAttribute("cy", `${maskY}`);
      knobMaskClip.setAttribute("r", `${maskRadius}`);
    };

    const showFallbackAtPointer = () => {
      canvas.classList.remove("is-visible");
      syncNegativeMask(pointer.x, pointer.y);
      fallback.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      fallback.classList.add("fluid-cursor--visible");
    };

    const showFallbackAtCursor = (rotation = 0, elongation = 0) => {
      canvas.classList.remove("is-visible");
      syncNegativeMask(cursor.x, cursor.y);
      fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${rotation}rad) scale(${1 + elongation}, ${1 - elongation * 0.52})`;
      fallback.classList.add("fluid-cursor--visible");
    };

    const finishToolMorph = () => {
      toolMorphing = false;
      running = false;
      fallback.classList.remove("fluid-cursor--tool-morph");
      fallback.style.removeProperty("inline-size");
      fallback.style.removeProperty("block-size");
      fallback.style.removeProperty("border-radius");
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      startLoop();
    };

    // A nearby exit keeps the full timeline. A far-away pointer speeds up the
    // same continuous animation and spring instead of swapping phases.
    const updateToolExitPace = (distance: number) => {
      const nextPace = clamp((distance - 72) / 520, 0, 1);
      if (nextPace <= toolExitPace + 0.02) return;

      toolExitPace = nextPace;
    };

    const setToolCopy = (title: string, description: string, isChangingTool: boolean) => {
      window.clearTimeout(toolCopyTimer);
      window.cancelAnimationFrame(toolCopyFrame);

      const applyCopy = () => {
        toolTitle.textContent = title;
        /* An explanation-only popup should not reserve a blank heading line. */
        toolTitle.hidden = title.trim().length === 0;
        toolDescription.textContent = description;
      };

      if (!isChangingTool) {
        applyCopy();
        return;
      }

      fallback.classList.remove("fluid-cursor--tool-copy-entering");
      fallback.classList.add("fluid-cursor--tool-copy-changing");
      toolCopyTimer = window.setTimeout(() => {
        applyCopy();
        fallback.classList.remove("fluid-cursor--tool-copy-changing");
        fallback.classList.add("fluid-cursor--tool-copy-entering");
        fallback.getBoundingClientRect();
        toolCopyFrame = window.requestAnimationFrame(() => {
          fallback.classList.remove("fluid-cursor--tool-copy-entering");
        });
      }, 90);
    };

    const clearToolCursor = () => {
      if (!activeTool && !fallback.classList.contains("fluid-cursor--tool-popover") && !toolMorphing) return;
      activeTool = null;
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolCopyTimer);
      window.cancelAnimationFrame(toolCopyFrame);
      const currentRect = fallback.getBoundingClientRect();
      toolMorphDuration = 145;
      toolMorphProgress = 0;
      toolMorphLastTime = performance.now();
      toolMorphStartWidth = currentRect.width;
      toolMorphStartHeight = currentRect.height;
      toolMorphStartRadius = Number.parseFloat(window.getComputedStyle(fallback).borderRadius) || 13.6;
      toolMorphNearSquareSize = currentRect.height * 0.95;
      toolMorphLargeBallSize = toolMorphNearSquareSize * 0.95;
      toolExitPace = 0;
      fallback.classList.remove("fluid-cursor--tool-popover", "fluid-cursor--tool-text-ready", "fluid-cursor--tool-copy-changing", "fluid-cursor--tool-copy-entering", "fluid-cursor--tool-entering");
      fallback.classList.add("fluid-cursor--tool-morph");
      toolMorphing = true;
      fallback.style.removeProperty("--fluid-tool-width");
      fallback.style.removeProperty("--fluid-tool-height");
      fallback.style.inlineSize = `${toolMorphStartWidth}px`;
      fallback.style.blockSize = `${toolMorphStartHeight}px`;
      fallback.style.borderRadius = `${toolMorphStartRadius}px`;
      if (pointer.active) {
        cursor.x = currentRect.left + currentRect.width / 2;
        cursor.y = currentRect.top + currentRect.height / 2;
        cursor.vx = 0;
        cursor.vy = 0;
        showFallbackAtCursor();
        updateToolExitPace(Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y));
      }
      startLoop();
    };

    const setActiveTool = (nextTool: HTMLElement) => {
      if (nextTool === activeTool) return;

      const isChangingTool = activeTool !== null;
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolEntryTimer);
      toolMorphing = false;
      fallback.classList.remove("fluid-cursor--tool-morph", "fluid-cursor--tool-text-ready", "fluid-cursor--tool-entering");
      fallback.style.removeProperty("inline-size");
      fallback.style.removeProperty("block-size");
      fallback.style.removeProperty("border-radius");
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      activeTool = nextTool;

      const title = nextTool.dataset.cursorTitle ?? "Tool";
      const description = nextTool.dataset.cursorDescription ?? "Used in this part of the workflow.";
      const hasTitle = title.trim().length > 0;
      // Action-only controls should feel like a cursor-sized label, while
      // richer tool descriptions retain enough room to read comfortably.
      const width = hasTitle
        ? clamp(156 + description.length * 0.72, 172, 220)
        : clamp(116 + description.length * 0.82, 148, 220);
      const height = hasTitle
        ? (description.length > 62 ? 96 : 82)
        : (description.length > 68 ? 78 : description.length > 36 ? 62 : 48);
      const rect = nextTool.getBoundingClientRect();
      const side = nextTool.dataset.cursorSide;
      const placeLeft = side === "left" && rect.left >= width + 12;
      const anchorX = placeLeft
        ? rect.left - 12
        : clamp(rect.left + rect.width / 2, width / 2 + 12, window.innerWidth - width / 2 - 12);
      const placeAbove = rect.top >= height + 12;
      const anchorY = placeLeft
        ? clamp(rect.top + rect.height / 2, height / 2 + 12, window.innerHeight - height / 2 - 12)
        : placeAbove ? rect.top - 12 : rect.bottom + 4;
      setToolCopy(title, description, isChangingTool);
      fallback.style.setProperty("--fluid-tool-width", `${width}px`);
      fallback.style.setProperty("--fluid-tool-height", `${height}px`);

      // The standard cursor can be stretched and rotated while moving. Before
      // its first tool morph, normalize it to a genuine circle so the shape
      // interpolates evenly instead of corkscrewing into the rectangle.
      if (!isChangingTool) {
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
        fallback.getBoundingClientRect();
        fallback.classList.add("fluid-cursor--tool-entering");
        toolEntryTimer = window.setTimeout(() => fallback.classList.remove("fluid-cursor--tool-entering"), 460);
      }
      fallback.classList.add("fluid-cursor--tool-popover", "fluid-cursor--visible");
      fallback.style.transform = placeLeft
        ? `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-100%, -50%)`
        : placeAbove
        ? `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-50%, -100%)`
        : `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-50%, 0)`;
      canvas.classList.remove("is-visible");
    };

    const scheduleToolClear = () => {
      window.clearTimeout(toolLeaveTimer);
      toolLeaveTimer = window.setTimeout(() => {
        if (!activeTool?.matches(":hover")) clearToolCursor();
      }, 0);
    };

    const handleStackToolEnter = (event: Event) => {
      const tool = (event as CustomEvent<HTMLElement>).detail;
      if (tool instanceof HTMLElement) setActiveTool(tool);
    };

    const handleStackToolLeave = (event: Event) => {
      const tool = (event as CustomEvent<HTMLElement>).detail;
      if (tool === activeTool) {
        scheduleToolClear();
      }
    };

    const showLiquidRenderer = () => {
      liquidWasRendering = true;
      // The markup stays painted during the headline-only state. Do not let a
      // queued pointer event expose the canvas before it is allowed to draw.
      if (isHeroIntroLocked()) {
        canvas.classList.remove("is-visible");
        showFallbackAtPointer();
        return;
      }
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
    const setUniform3 = (name: string, color: Rgb) => {
      if (gl) gl.uniform3f(uniform(name), color[0], color[1], color[2]);
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
      syncNegativeMask(cursor.x, cursor.y);
      setUniform3("u_cursor_color", themeColors.cursor);
      setUniform3("u_primary_color", themeColors.primary);
      setUniform3("u_primary_hover_color", themeColors.primaryHover);
      setUniform3("u_secondary_color", themeColors.secondary);
      setUniform3("u_secondary_hover_color", themeColors.secondaryHover);
      setUniform3("u_neutral_target_color", themeColors.neutralTarget);
      if (activeTarget) {
        // Retry enters with a scale animation. Keep neutral targets measured so
        // their liquid capsule always reaches the final DOM button width.
        if (activeTarget.isNeutralMerge) activeTarget.rect = activeTarget.element.getBoundingClientRect();
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
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        const cornerRadius = activeTarget.isNeutralMerge
          ? Math.min(activeTarget.cornerRadius, halfWidth, halfHeight)
          : radius;
        const rectDeltaX = Math.abs(cursor.x - centerX) - Math.max(halfWidth - cornerRadius, 0);
        const rectDeltaY = Math.abs(cursor.y - centerY) - Math.max(halfHeight - cornerRadius, 0);
        const cursorToRectangle = Math.hypot(Math.max(rectDeltaX, 0), Math.max(rectDeltaY, 0)) +
          Math.min(Math.max(rectDeltaX, rectDeltaY), 0) - cornerRadius;
        const targetSeparation = activeTarget.isNeutralMerge ? cursorToRectangle : cursorToCapsule;
        const absorption = activeTarget.isNeutralMerge
          // Begin drawing the cursor into the screen before its centre reaches
          // the edge, then finish only after it has travelled inside.
          ? 1 - smootherstep(activeTarget.element.hasAttribute("data-fluid-cursor-tight") ? cursorRadius * 0.2 : -cursorRadius * 1.2, activeTarget.element.hasAttribute("data-fluid-cursor-tight") ? cursorRadius * 1.12 : cursorRadius * 1.8, targetSeparation)
          : 1 - smootherstep(-cursorRadius, cursorRadius, targetSeparation);
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
        const separation = targetSeparation - cursorRadius;
        const approachingConnection = 1 - smootherstep(0, 12, separation);
        const earlyCreep = Math.pow(magneticProgress, 8) * 0.06;
        const revealProgress = activeTarget.isNeutralMerge
          ? magneticProgress
          : activeTarget.isOutline
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
        activeTarget.element.toggleAttribute("data-liquid-absorbed", activeTarget.isNeutralMerge && absorption > 0.985);
        setUniform1("u_target_active", 1);
        setUniform2("u_target_center", centerX, centerY);
        setUniform2("u_projection_center", skeletonX, skeletonY);
        setUniform2("u_surface_normal", distance > 0.001 ? dx / distance : 0, distance > 0.001 ? dy / distance : -1);
        setUniform1("u_target_half_length", halfLength);
        setUniform1("u_target_radius", radius);
        setUniform1("u_cursor_absorption", absorption);
        setUniform1("u_target_reveal", revealProgress);
        setUniform1("u_target_filled", activeTarget.isOutline ? 0 : 1);
        setUniform1("u_target_neutral", activeTarget.isNeutralMerge ? 1 : 0);
        setUniform2("u_target_half_size", halfWidth, halfHeight);
        setUniform1("u_target_corner_radius", cornerRadius);
        setUniform1("u_target_secondary", activeTarget.isSecondary ? 1 : 0);
        setUniform1("u_target_hover", activeTarget.hoverProgress);
      } else {
        setUniform1("u_target_active", 0);
        setUniform2("u_target_center", 0, 0);
        setUniform2("u_projection_center", 0, 0);
        setUniform2("u_surface_normal", 0, -1);
        setUniform1("u_target_half_length", 0);
        setUniform1("u_target_radius", 0);
        setUniform1("u_cursor_absorption", 0);
        setUniform1("u_target_reveal", 0);
        setUniform1("u_target_filled", 0);
        setUniform1("u_target_neutral", 0);
        setUniform2("u_target_half_size", 0, 0);
        setUniform1("u_target_corner_radius", 0);
        setUniform1("u_target_secondary", 0);
        setUniform1("u_target_hover", 0);
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
        const activationRange = activationRangeFor(target);
        if (distance <= activationRange && distance < closestDistance) {
          closest = target;
          closestDistance = distance;
        }
      }
      const nextTarget = closest;
      if (nextTarget !== activeTarget) {
        activeTarget?.element.removeAttribute("data-liquid-active");
        activeTarget?.element.removeAttribute("data-liquid-rendered");
        activeTarget?.element.removeAttribute("data-liquid-absorbed");
        nextTarget?.element.setAttribute("data-liquid-active", "true");
        activeTarget = nextTarget;
      }
      targets.forEach((target) => {
        if (target !== activeTarget) {
          target.element.removeAttribute("data-liquid-rendered");
          target.element.removeAttribute("data-liquid-absorbed");
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
        if (magneticTranslationSuspended || target.isNeutralMerge) {
          target.tx = 0;
          target.ty = 0;
          return;
        }
        const proximity = 1 - clamp(closestDistance / activationRangeFor(target), 0, 1);
        const desiredShift = Math.min(distance * magnetStrength * proximity * proximity, maxButtonShift);
        target.tx = (dx / distance) * desiredShift;
        target.ty = (dy / distance) * desiredShift;
      });
    };

    function render() {
      if (cursorSuppressed) {
        canvas?.classList.remove("is-visible");
        fallback.classList.remove("fluid-cursor--visible");
        running = false;
        return;
      }
      if (performance.now() < cursorResumeFallbackUntil) {
        canvas?.classList.remove("is-visible");
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
        frame = window.requestAnimationFrame(render);
        return;
      }
      // During the initial reveal, the cursor itself follows immediately, but
      // target selection, liquid drawing, and magnetic button motion remain
      // disabled until the page has finished fading in.
      if (isHeroIntroLocked()) {
        canvas?.classList.remove("is-visible");
        activeTarget?.element.removeAttribute("data-liquid-active");
        activeTarget?.element.removeAttribute("data-liquid-rendered");
        activeTarget = null;
        targets.forEach((target) => {
          target.tx = 0;
          target.ty = 0;
          target.hoverProgress = 0;
          target.surface.style.removeProperty("transform");
          target.element.removeAttribute("data-liquid-rendered");
        });
        if (!pointer.active) {
          running = false;
          return;
        }
        cursor.vx = (cursor.vx + (pointer.x - cursor.x) * 0.12) * 0.7;
        cursor.vy = (cursor.vy + (pointer.y - cursor.y) * 0.12) * 0.7;
        cursor.x += cursor.vx;
        cursor.y += cursor.vy;
        const speed = Math.min(Math.hypot(cursor.vx, cursor.vy), 28);
        stretch = Math.min(speed * 0.018, 0.42);
        angle = Math.atan2(cursor.vy, cursor.vx);
        if (speed > 0.08) {
          directionX = cursor.vx / speed;
          directionY = cursor.vy / speed;
        }
        syncNegativeMask(cursor.x, cursor.y);
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
        frame = window.requestAnimationFrame(render);
        return;
      }
      // Tool popups are anchored to their own controls. Once the cursor has
      // handed off to that static shape, there is no cursor animation work to
      // perform until the pointer leaves the tool.
      if (activeTool) {
        canvas?.classList.remove("is-visible");
        running = false;
        return;
      }
      if (toolMorphing) {
        canvas?.classList.remove("is-visible");
        const distance = Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y);
        updateToolExitPace(distance);
        const pace = clamp((distance - 72) / 520, 0, 1);
        const stiffness = 0.12 + pace * 0.3;
        const damping = 0.7 + pace * 0.06;
        cursor.vx = (cursor.vx + (pointer.x - cursor.x) * stiffness) * damping;
        cursor.vy = (cursor.vy + (pointer.y - cursor.y) * stiffness) * damping;
        cursor.x += cursor.vx;
        cursor.y += cursor.vy;

        const now = performance.now();
        const deltaTime = Math.min(Math.max(now - toolMorphLastTime, 0), 32);
        toolMorphLastTime = now;
        toolMorphProgress = clamp(
          toolMorphProgress + (deltaTime / toolMorphDuration) * (1 + toolExitPace * 1.45),
          0,
          1,
        );

        // One cubic geometry curve replaces sequential rectangle/square/ball
        // phases. The two 5%-smaller sizes act as control points, so they shape
        // one uninterrupted path without becoming visible stops.
        const cursorDiameter = cursorRadius * 2;
        const geometryProgress = toolMorphProgress;
        const inverseProgress = 1 - geometryProgress;
        const startWeight = inverseProgress ** 3;
        const nearSquareWeight = 3 * inverseProgress ** 2 * geometryProgress;
        const largeBallWeight = 3 * inverseProgress * geometryProgress ** 2;
        const cursorWeight = geometryProgress ** 3;
        const morphWidth =
          startWeight * toolMorphStartWidth +
          nearSquareWeight * toolMorphNearSquareSize +
          largeBallWeight * toolMorphLargeBallSize +
          cursorWeight * cursorDiameter;
        const morphHeight =
          startWeight * toolMorphStartHeight +
          nearSquareWeight * toolMorphNearSquareSize +
          largeBallWeight * toolMorphLargeBallSize +
          cursorWeight * cursorDiameter;

        const smallerSide = Math.max(Math.min(morphWidth, morphHeight), 1);
        const largerSide = Math.max(morphWidth, morphHeight);
        const aspectRatio = largerSide / smallerSide;
        const aspectCloseness = clamp((1.42 - aspectRatio) / 0.42, 0, 1);
        const roundness = aspectCloseness * aspectCloseness * (3 - 2 * aspectCloseness);
        const morphRadius = toolMorphStartRadius +
          (smallerSide / 2 - toolMorphStartRadius) * roundness;

        fallback.style.inlineSize = `${morphWidth}px`;
        fallback.style.blockSize = `${morphHeight}px`;
        fallback.style.borderRadius = `${Math.min(morphRadius, smallerSide / 2)}px`;

        const surfaceProgress = toolMorphProgress;
        fallback.style.padding = `${0.75 * (1 - surfaceProgress)}rem ${0.85 * (1 - surfaceProgress)}rem`;
        fallback.style.boxShadow = `0 ${0.5 - surfaceProgress * 0.32}rem ${1.4 - surfaceProgress * 0.9}rem color-mix(in srgb, var(--cursor) ${Math.round(26 * (1 - surfaceProgress))}%, transparent)`;

        // Spring position starts immediately. Once both axes are genuinely
        // circular, blend in the normal cursor's velocity-based deformation;
        // the rectangular portion remains level and cannot twist.
        const speed = Math.min(Math.hypot(cursor.vx, cursor.vy), 28);
        const stretchReadiness = smootherstep(
          0,
          1,
          clamp((1.12 - aspectRatio) / 0.1, 0, 1),
        );
        const motionBlend = smootherstep(0.32, 0.58, toolMorphProgress);
        const stretchBlend = stretchReadiness * motionBlend;
        angle = Math.atan2(cursor.vy, cursor.vx);
        stretch = Math.min(speed * 0.018, 0.42) * stretchBlend;
        showFallbackAtCursor(angle * stretchBlend, stretch);

        if (toolMorphProgress >= 1) {
          finishToolMorph();
          return;
        }
        frame = window.requestAnimationFrame(render);
        return;
      }
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
        const wantedHover = target === activeTarget && target.element.matches(":hover") ? 1 : 0;
        target.hoverProgress += (wantedHover - target.hoverProgress) * 0.16;
        if (Math.abs(wantedHover - target.hoverProgress) < 0.002) {
          target.hoverProgress = wantedHover;
        }
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
          Math.abs(target.tx - target.x) + Math.abs(target.ty - target.y) +
          Math.abs(wantedHover - target.hoverProgress) > 0.025;
      });

      const shouldRenderLiquid = usingWebGL && (activeTarget !== null || pointerNearTarget);
      if (shouldRenderLiquid) {
        showLiquidRenderer();
        draw();
      } else {
        const exitingLiquid = liquidWasRendering;
        if (exitingLiquid) fallback.style.transition = "none";
        syncNegativeMask(cursor.x, cursor.y);
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
        canvas?.classList.remove("is-visible");
        liquidWasRendering = false;
        if (exitingLiquid) window.requestAnimationFrame(() => fallback.style.removeProperty("transition"));
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
      const now = performance.now();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      lastPointerMoveAt = now;
      settledFrames = 0;
      if (!cursor.initialized) {
        cursor.initialized = true;
        cursor.x = pointer.x;
        cursor.y = pointer.y;
      }
      if (activeTool) return;
      if (toolMorphing) {
        // render() runs the exit spring immediately; no still-pointer bridge
        // is needed, and a distant move increases its pace on the next frame.
        startLoop();
        return;
      }
      const pointerNearTarget = isNearTarget(pointer.x, pointer.y);
      if (!activeTarget && !pointerNearTarget) {
        canvas.classList.remove("is-visible");
        syncNegativeMask(pointer.x, pointer.y);
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
      activeTarget?.element.removeAttribute("data-liquid-absorbed");
      activeTarget = null;
      targets.forEach((target) => {
        target.element.removeAttribute("data-liquid-absorbed");
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

    const suspendFluidCursor = () => {
      cursorSuppressed = true;
      liquidWasRendering = false;
      cursorResumeFallbackUntil = 0;
      canvas.classList.remove("is-visible");
      fallback.classList.remove("fluid-cursor--visible");
      resetTargets();
      running = false;
    };

    const resumeFluidCursor = () => {
      cursorSuppressed = false;
      if (!pointer.active || !cursor.initialized) return;
      cursor.x = pointer.x;
      cursor.y = pointer.y;
      cursor.vx = 0;
      cursor.vy = 0;
      cursorResumeFallbackUntil = performance.now() + 140;
      canvas.classList.remove("is-visible");
      fallback.classList.add("fluid-cursor--visible");
      fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
      startLoop();
    };

    const leaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointer.active = false;
      clearToolCursor();
      fallback.classList.remove("fluid-cursor--visible");
      canvas.classList.remove("is-visible");
      resetTargets();
    };
    const enterWindow = () => {
      if (!cursor.initialized) return;
      if (activeTool) {
        canvas.classList.remove("is-visible");
        fallback.classList.add("fluid-cursor--visible");
      } else if (isNearTarget(pointer.x, pointer.y) || activeTarget) {
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
    const handleResize = () => {
      clearToolCursor();
      scheduleMeasurement(true);
    };
    const handleScroll = () => {
      clearToolCursor();
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
    const syncThemeColors = () => {
      themeColors = readThemeColors();
      startLoop();
    };
    const resumeAfterHeroIntro = () => startLoop();
    const resyncCursor = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (!detail) return;
      pointer.x = detail.x;
      pointer.y = detail.y;
      cursor.x = detail.x;
      cursor.y = detail.y;
      cursor.vx = 0;
      cursor.vy = 0;
      syncNegativeMask(detail.x, detail.y);
      startLoop();
    };

    targetResizeObserver = new ResizeObserver(() => scheduleMeasurement());
    refreshTargets();
    initializeWebGL();
    const observer = new MutationObserver(() => {
      refreshTargets();
      if (!activeTool) startLoop();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    /* The fallback reads --cursor directly from CSS, while WebGL receives a
       numeric uniform. Observe stylesheet replacement too (including Vite
       hot updates) so both rendering paths always use the same token. */
    const themeStylesObserver = new MutationObserver(syncThemeColors);
    themeStylesObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "href", "media"],
    });
    syncThemeColors();
    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leaveWindow);
    document.documentElement.addEventListener("pointerenter", enterWindow);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("portfolio-theme-change", syncThemeColors);
    window.addEventListener("portfolio-hero-intro-complete", resumeAfterHeroIntro);
    window.addEventListener("portfolio-fluid-cursor-resync", resyncCursor);
    window.addEventListener("portfolio-fluid-cursor-suspend", suspendFluidCursor);
    window.addEventListener("portfolio-fluid-cursor-resume", resumeFluidCursor);
    window.addEventListener("portfolio-stack-tool-enter", handleStackToolEnter);
    window.addEventListener("portfolio-stack-tool-leave", handleStackToolLeave);

    return () => {
      observer.disconnect();
      themeStylesObserver.disconnect();
      targetResizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measurementFrame);
      window.cancelAnimationFrame(toolCopyFrame);
      window.clearTimeout(scrollIdleTimer);
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolCopyTimer);
      window.clearTimeout(toolEntryTimer);
      clearToolCursor();
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      document.documentElement.removeEventListener("pointerleave", leaveWindow);
      document.documentElement.removeEventListener("pointerenter", enterWindow);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("portfolio-theme-change", syncThemeColors);
      window.removeEventListener("portfolio-hero-intro-complete", resumeAfterHeroIntro);
      window.removeEventListener("portfolio-fluid-cursor-resync", resyncCursor);
    window.removeEventListener("portfolio-fluid-cursor-suspend", suspendFluidCursor);
    window.removeEventListener("portfolio-fluid-cursor-resume", resumeFluidCursor);
      window.removeEventListener("portfolio-stack-tool-enter", handleStackToolEnter);
      window.removeEventListener("portfolio-stack-tool-leave", handleStackToolLeave);
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
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <>
      <canvas ref={canvasRef} className="liquid-button-canvas" aria-hidden="true" />
      <svg ref={knobMaskRef} className="fluid-cursor__knob-mask" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <clipPath id="fluid-cursor-knob-mask-clip"><circle ref={knobMaskClipRef} /></clipPath>
        </defs>
        <g clipPath="url(#fluid-cursor-knob-mask-clip)">
          <path ref={knobMaskPathRef} d="M50 7V50 M50 7A43 43 0 1 1 22 17" />
        </g>
      </svg>
      <div ref={textMaskRef} className="fluid-cursor__text-mask" aria-hidden="true" />
      <div ref={fallbackRef} className="fluid-cursor" aria-hidden="true">
        <div className="fluid-cursor__tool-copy">
          <strong ref={toolTitleRef} />
          <span ref={toolDescriptionRef} />
        </div>
      </div>
    </>,
    document.body,
  );
}
