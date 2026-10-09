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
  uniform float u_target_dark;
  uniform vec2 u_target_half_size;
  uniform float u_target_corner_radius;
  uniform float u_target_secondary;
  uniform float u_target_hover;
  uniform float u_target_pressed;
  uniform vec3 u_cursor_color;
  uniform vec3 u_primary_color;
  uniform vec3 u_primary_hover_color;
  uniform vec3 u_primary_active_color;
  uniform vec3 u_secondary_color;
  uniform vec3 u_secondary_hover_color;
  uniform vec3 u_secondary_active_color;
  uniform vec3 u_neutral_target_color;
  uniform vec3 u_dark_target_color;

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
    // Compact neutral controls have no magnetic displacement. Keep their orb
    // at its actual spring position during the DOM/canvas handoff as well.
    float visibleCursorDistance = u_target_neutral > 0.5
      ? cursorDistance : resistedCursorDistance(point, surfaceNormal, absorption);
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
      if (u_target_neutral > 0.5) {
        // Zero deformation at the neutral activation boundary (34px). The
        // old wide kernel was already expanded when the renderer activated.
        nearFactor *= 1.0 - smoothstep(0.0, 34.0, surfaceGap);
      }
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
      float colourProgress = pow(bridgeApproach, 2.7);
      float easedColourProgress = smoothstep(0.0, 1.0, colourProgress);
      float shellDepth = mix(0.7, cursorMinimum * 1.75, easedColourProgress);
      float shellFeather = cursorMinimum * 0.72;
      float shellVisibility = smoothstep(0.0, 0.18, colourProgress);
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
    targetInk = mix(
      targetInk,
      mix(u_primary_active_color, u_secondary_active_color, u_target_secondary),
      u_target_pressed
    );
    targetInk = mix(targetInk, u_neutral_target_color, u_target_neutral);
    targetInk = mix(targetInk, u_dark_target_color, u_target_dark);
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
  isDarkMerge: boolean;
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
  primaryActive: Rgb;
  secondary: Rgb;
  secondaryHover: Rgb;
  secondaryActive: Rgb;
  neutralTarget: Rgb;
  darkTarget: Rgb;
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
    // Older versions positioned one reflowing clone over the full source
    // element. Clear those dimensions before using the viewport paint layer.
    textMask.style.removeProperty("left");
    textMask.style.removeProperty("top");
    textMask.style.removeProperty("width");
    textMask.style.removeProperty("height");
    textMask.style.removeProperty("transform");
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const readThemeColors = (): ThemeColors => {
      const styles = window.getComputedStyle(document.documentElement);
      const page = hexToRgb(styles.getPropertyValue("--page"), [1, 1, 1]);
      return {
        cursor: hexToRgb(styles.getPropertyValue("--text"), [0.91, 0.91, 0.91]),
        primary: hexToRgb(styles.getPropertyValue("--cta"), hexToRgb(styles.getPropertyValue("--primary"), [0.412, 0.282, 0.91])),
        primaryHover: hexToRgb(styles.getPropertyValue("--cta-hover"), hexToRgb(styles.getPropertyValue("--primary-hover"), [0.337, 0.212, 0.784])),
        primaryActive: hexToRgb(styles.getPropertyValue("--cta-active"), hexToRgb(styles.getPropertyValue("--primary-active"), [0.337, 0.212, 0.784])),
        secondary: hexToRgb(styles.getPropertyValue("--secondary"), [0.89, 0.2, 0.2]),
        secondaryHover: hexToRgb(styles.getPropertyValue("--secondary-hover"), [0.749, 0.141, 0.157]),
        secondaryActive: hexToRgb(styles.getPropertyValue("--secondary-active"), [0.749, 0.141, 0.157]),
        // Play and retry fluid shares the same white token as the display titles.
        neutralTarget: hexToRgb(styles.getPropertyValue("--text"), [0.91, 0.91, 0.91]),
        darkTarget: page,
      };
    };

    const magneticRange = 56;
    const maxButtonShift = 16;
    const magnetStrength = 0.14;
    const cursorRadius = 10.8;
    let paintedCursorRadius = cursorRadius;
    let datePull = 0;
    let activeDate: HTMLElement | null = null;
    let dateTargets: NegativeMaskTarget[] = [];
    // Keep the liquid renderer alive through very small, slow pointer changes
    // near a CTA. This avoids stopping and restarting between adjacent frames.
    const cursorIdleGrace = 220;
    const settledFrameLimit = 12;
    const scrollSettleDelay = 220;
    const magneticResumeDuration = 420;
    const toolMorphDuration = 180;
    const pointer = { x: 0, y: 0, active: false };
    const cursor = { x: 0, y: 0, vx: 0, vy: 0, initialized: false };
    let targets: LiquidTarget[] = [];
    let negativeMaskTargets: NegativeMaskTarget[] = [];
    let textMaskSource: HTMLElement | null = null;
    let textMaskSignature = "";
    let nativeInkSource: HTMLElement | null = null;
    let nativeInkRuns: HTMLElement[] = [];
    let nativePaintRuns = new Set<HTMLElement>();
    let nativeInkLayerHosts: HTMLElement[] = [];
    let activeTarget: LiquidTarget | null = null;
    let activeTool: HTMLElement | null = null;
    let updateToolAnchor: (() => void) | null = null;
    let activePill: HTMLElement | null = null;
    let activePillTransform = "";
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let usingWebGL = false;
    let frame = 0;
    let running = false;
    let scrollFrameDriven = false;
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
    let pillLeaveTimer = 0;
    let pillPressReleaseTimer = 0;
    let toolMorphing = false;
    let toolMorphProgress = 0;
    let toolMorphLastTime = 0;
    let toolMorphStartWidth = 0;
    let toolMorphStartHeight = 0;
    let toolMorphStartRadius = 0;
    let toolMorphNearSquareSize = 0;
    let toolMorphLargeBallSize = 0;
    let toolCopyTimer = 0;
    let toolCopyFrame = 0;
    let toolEntryFrame = 0;
    let toolEntryTimer = 0;
    let pendingToolActivation = false;
    let pendingPillActivation = false;
    let lastPointerMoveAt = 0;
    let settledFrames = 0;
    let magneticTranslationSuspended = false;
    let magneticResumeStartedAt = 0;
    let magneticResumeProgress = 1;
    let isScrolling = false;
    let lenisIsScrolling = false;
    let lastScrollX = window.scrollX;
    let lastScrollY = window.scrollY;
    let themeColors = readThemeColors();
    const uniforms = new Map<string, WebGLUniformLocation | null>();

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const isHeroIntroLocked = () => {
      const state = document.documentElement.dataset.documentIntro;
      return state === "pending" || state === "ready";
    };
    const smootherstep = (start: number, end: number, value: number) => {
      const progress = clamp((value - start) / (end - start), 0, 1);
      return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    };

    const refreshTargets = () => {
      dateTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-cursor-date]")).map((element) => ({ element, rect: element.getBoundingClientRect() }));
      const previous = new Map(targets.map((target) => [target.element, target]));
      // Destination CTAs and a few explicitly marked neutral surfaces can use
      // the liquid field. Ordinary controls remain native.
      const next = Array.from(document.querySelectorAll<HTMLElement>("a.button, [data-fluid-cursor-surface]"))
        .filter((element) => !element.matches(":disabled"))
        // The negative-ink overlay contains visual clones. They must never be
        // rediscovered as real interactive targets or they can disturb the
        // liquid-button state while the overlay is being refreshed.
        .filter((element) => !textMask.contains(element))
        .map((element) => {
          const isNeutralMerge = element.hasAttribute("data-fluid-cursor-surface");
          const isDarkMerge = element.hasAttribute("data-fluid-cursor-dark-surface");
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
            isDarkMerge,
            cornerRadius: Number.parseFloat(window.getComputedStyle(element).borderTopLeftRadius) || 0,
            // Every regular button shares the Learn more primary role. Only
            // Let's talk opts into the secondary colour role.
            isSecondary: element.classList.contains("button--red"),
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
      const previousNegativeElements = new Set(negativeMaskTargets.map(({ element }) => element));
      const negativeMaskSelector = [
        "[data-fluid-cursor-negative-mask]",
        "[data-fluid-cursor-native-ink]",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        ".section-index",
      ].join(", ");
      const nextNegativeMaskTargets = Array.from(document.querySelectorAll<HTMLElement>(negativeMaskSelector))
        .filter((element) => {
          if (textMask.contains(element)) return false;
          if (element.matches("button, .button")) return false;
          if (
            element.hasAttribute("data-fluid-cursor-negative-mask") ||
            element.hasAttribute("data-fluid-cursor-native-ink")
          ) return true;
          return !element.closest("button, .button");
        })
        .map((element) => ({ element, rect: element.getBoundingClientRect() }));
      const nextNegativeElements = new Set(nextNegativeMaskTargets.map(({ element }) => element));
      previousNegativeElements.forEach((element) => {
        if (!nextNegativeElements.has(element)) targetResizeObserver?.unobserve(element);
      });
      negativeMaskTargets = nextNegativeMaskTargets;
      negativeMaskTargets.forEach(({ element }) => targetResizeObserver?.observe(element));

      // Keep native-ink targets on the same background-clipped text rendering
      // path both at rest and under the cursor. Chromium antialiases normal
      // color text and background-clipped text differently; switching between
      // those paths made the letters appear to change weight on hover.
      const nextNativePaintRuns = new Set<HTMLElement>();
      negativeMaskTargets.forEach(({ element }) => {
        if (!usesNativeTextInk(element)) return;
        nativeTextPaintRunsFor(element).forEach((run) => nextNativePaintRuns.add(run));
      });
      nativePaintRuns.forEach((run) => {
        if (!nextNativePaintRuns.has(run)) run.removeAttribute("data-fluid-cursor-native-paint");
      });
      nextNativePaintRuns.forEach((run) => run.setAttribute("data-fluid-cursor-native-paint", ""));
      nativePaintRuns = nextNativePaintRuns;
    };

    const measureTargets = () => {
      dateTargets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
      targets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
      negativeMaskTargets.forEach((target) => { target.rect = target.element.getBoundingClientRect(); });
    };

    const renderedRectFor = (target: LiquidTarget) => ({
      left: target.rect.left + (target.isNeutralMerge ? 0 : target.x),
      right: target.rect.right + (target.isNeutralMerge ? 0 : target.x),
      top: target.rect.top + (target.isNeutralMerge ? 0 : target.y),
      bottom: target.rect.bottom + (target.isNeutralMerge ? 0 : target.y),
    });

    // The WebGL overlay is outside the revealing subtree. Never repaint a
    // hidden/delayed button at full opacity before its DOM entrance finishes.
    const targetIsPainted = (target: LiquidTarget) => {
      const element = target.element;
      if (!element.isConnected || element.matches(":disabled") || element.closest('[aria-hidden="true"], [inert]')) return false;
      if (element.closest('.soft-reveal-target:not(.is-soft-revealed), .reveal-following-action:not(.is-revealed), .lab-preview:not(.lab-preview--title-revealed)')) return false;
      for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
        if (node !== element && !node.matches('.soft-reveal-target, .reveal-following-action, .page-transition-content')) continue;
        const style = getComputedStyle(node);
        if (style.visibility !== "visible" || style.display === "none" || Number(style.opacity) < 0.999 || style.pointerEvents === "none") return false;
        if (style.filter !== "none" && /blur\((?!0px\))/u.test(style.filter)) return false;
      }
      return true;
    };

    const distanceToRect = (x: number, y: number, rect: ReturnType<typeof renderedRectFor>) => {
      const nearestX = clamp(x, rect.left, rect.right);
      const nearestY = clamp(y, rect.top, rect.bottom);
      return Math.hypot(x - nearestX, y - nearestY);
    };

    const activationRangeFor = (target: LiquidTarget) => target.isNeutralMerge || target.element.hasAttribute("data-fluid-cursor-tight") ? 34 : magneticRange;
    const isNearTarget = (x: number, y: number) => targets.some((target) => {
      return distanceToRect(x, y, renderedRectFor(target)) <= activationRangeFor(target) && targetIsPainted(target);
    });

    const textPaintRunsFor = (element: HTMLElement) => {
      const animatedRuns = Array.from(element.querySelectorAll<HTMLElement>(
        ".reveal-title__word-inner, .hero-code-indent",
      )).filter((run) => run.textContent?.trim());
      return animatedRuns.length > 0 ? animatedRuns : [element];
    };

    const usesNativeTextInk = (element: HTMLElement) => (
      element.hasAttribute("data-fluid-cursor-native-ink") ||
      element.matches("h1, h2, h3, h4, h5, h6, .section-index")
    );

    const nativeTextPaintRunsFor = (element: HTMLElement) => {
      const animatedRuns = Array.from(element.querySelectorAll<HTMLElement>(
        ".reveal-title__word-inner, .hero-code-indent",
      )).filter((run) => run.textContent?.trim());
      if (animatedRuns.length > 0) return animatedRuns;

      const candidates = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
      return candidates.filter((candidate) => Array.from(candidate.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      ));
    };

    const clearNativeTextInk = () => {
      nativeInkRuns.forEach((run) => {
        run.removeAttribute("data-fluid-cursor-live-ink");
        run.style.removeProperty("--fluid-cursor-native-color");
        run.style.removeProperty("--fluid-cursor-native-x");
        run.style.removeProperty("--fluid-cursor-native-y");
        run.style.removeProperty("--fluid-cursor-native-radius-x");
        run.style.removeProperty("--fluid-cursor-native-radius-y");
        run.style.removeProperty("--fluid-cursor-native-position");
      });
      nativeInkRuns = [];
      nativeInkSource = null;
      nativeInkLayerHosts.forEach((host) => {
        host.classList.remove("is-fluid-cursor-ink-layer");
        host.classList.remove("is-fluid-cursor-ink-card");
      });
      nativeInkLayerHosts = [];
    };

    const syncNativeTextInk = (
      element: HTMLElement,
      x: number,
      y: number,
      elongation: number,
    ) => {
      if (nativeInkSource !== element) {
        clearNativeTextInk();
        nativeInkSource = element;
        nativeInkRuns = nativeTextPaintRunsFor(element);
        nativeInkRuns.forEach((run) => {
          const runStyle = window.getComputedStyle(run);
          run.style.setProperty("--fluid-cursor-native-color", runStyle.color);
          if (runStyle.position !== "static") {
            run.style.setProperty("--fluid-cursor-native-position", runStyle.position);
          }
          run.setAttribute("data-fluid-cursor-live-ink", "");
        });
        const layerHosts = new Set<HTMLElement>();
        const pageLayerHost = element.closest<HTMLElement>(".desktop-rail, .hero-audience");
        if (pageLayerHost) {
          pageLayerHost.classList.add("is-fluid-cursor-ink-layer");
          layerHosts.add(pageLayerHost);
        }

        // Lab labels sit inside local z-index layers used to keep their card
        // content above each coloured ::before surface. Lift that transparent
        // content row while the real glyphs are being recoloured. Type Racer
        // also needs its card isolation opened so the glyph can reach the
        // global layer above the fixed cursor canvas.
        const labContentLayer = element.closest<HTMLElement>(
          ".lab-visual-memory__topline, .lab-type-racer__high-score, .lab-type-racer__prompt, .lab-snake__topline",
        );
        if (labContentLayer) {
          labContentLayer.classList.add("is-fluid-cursor-ink-layer");
          layerHosts.add(labContentLayer);
        }
        const labCard = element.closest<HTMLElement>(".lab-visual-memory, .lab-type-racer, .lab-snake");
        if (labCard) {
          labCard.classList.add("is-fluid-cursor-ink-card");
          layerHosts.add(labCard);
        }
        nativeInkLayerHosts = Array.from(layerHosts);
      }

      const radius = paintedCursorRadius * 1.04;
      const radiusX = `${radius * (1 + elongation)}px`;
      const radiusY = `${radius * (1 - elongation * 0.52)}px`;
      // Chromium paints a background-clipped gradient in each text run's
      // local box even when background-attachment is fixed. Read every box
      // first, then write, so the gradient follows the cursor without causing
      // alternating layout reads and style recalculations.
      const runRects = nativeInkRuns.map((run) => ({ run, rect: run.getBoundingClientRect() }));
      runRects.forEach(({ run, rect }) => {
        run.style.setProperty("--fluid-cursor-native-x", `${x - rect.left}px`);
        run.style.setProperty("--fluid-cursor-native-y", `${y - rect.top}px`);
        run.style.setProperty("--fluid-cursor-native-radius-x", radiusX);
        run.style.setProperty("--fluid-cursor-native-radius-y", radiusY);
      });
    };

    const cursorClipPolygon = (x: number, y: number, rotation: number, elongation: number) => {
      const radius = paintedCursorRadius * 1.04;
      const radiusX = radius * (1 + elongation);
      const radiusY = radius * (1 - elongation * 0.52);
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const points = Array.from({ length: 32 }, (_, index) => {
        const theta = (index / 32) * Math.PI * 2;
        const localX = Math.cos(theta) * radiusX;
        const localY = Math.sin(theta) * radiusY;
        const pointX = x + localX * cosine - localY * sine;
        const pointY = y + localX * sine + localY * cosine;
        return `${pointX.toFixed(2)}px ${pointY.toFixed(2)}px`;
      });
      return `polygon(${points.join(", ")})`;
    };

    const syncNegativeMask = (x: number, y: number, rotation = 0, elongation = 0) => {
      // These clones belong only to the mouse ball. A tooltip/pill, its
      // reverse morph, or a native-cursor dialog must never retain old ink.
      if (activeTool || activePill || toolMorphing || cursorSuppressed || document.documentElement.classList.contains("calendar-overlay-open") || !pointer.active) {
        clearNativeTextInk();
        knobMask.style.opacity = "0";
        textMask.style.opacity = "0";
        return;
      }
      // Several text targets can overlap the orb at once (for example, the
      // Type Racer timer above the first words). Resolve that overlap by
      // proximity, not DOM order, so the text directly under the orb wins.
      let target: NegativeMaskTarget | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      const calendarContacts: NegativeMaskTarget[] = [];
      for (const candidate of negativeMaskTargets) {
        const { element } = candidate;
        // Collapsed calendar rows keep their DOM for the reverse animation.
        // Their glyphs must not be cloned over the visible selected week.
        if (element.closest("[inert]")) continue;
        // Scroll/resize already refresh the cache. Only nearby text needs a
        // live transform read; don't measure every heading on pointer frames.
        if (distanceToRect(x, y, candidate.rect) > cursorRadius + 64) continue;
        const calendarAgenda = element.closest<HTMLElement>(".calendar-agenda");
        if (calendarAgenda) {
          const clip = calendarAgenda.getBoundingClientRect();
          // Scrolled-out hour labels/rules have valid DOM rectangles but are
          // clipped by the agenda. Do not resurrect them over the week strip.
          if (x + paintedCursorRadius < clip.left || x - paintedCursorRadius > clip.right || y + paintedCursorRadius < clip.top || y - paintedCursorRadius > clip.bottom) continue;
        }
        // Titles and navigation enter through transforms during the page
        // reveal. ResizeObserver does not report positional transform changes,
        // so cached rectangles can point at a completely different label.
        // Read the live painted box before resolving the closest mask target.
        const rect = element.getBoundingClientRect();
        candidate.rect = rect;
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
        if (distance <= paintedCursorRadius * 1.04) {
          if (element.closest(".lab-calendar")) calendarContacts.push(candidate);
          if (distance < closestDistance) {
            target = candidate;
            closestDistance = distance;
          }
        }
      }
      if (!target) {
        clearNativeTextInk();
        knobMask.style.opacity = "0";
        textMask.style.opacity = "0";
        return;
      }
      if (!target.element.classList.contains("lab-etch__knob")) {
        knobMask.style.opacity = "0";
        if (usesNativeTextInk(target.element)) {
          textMask.style.opacity = "0";
          syncNativeTextInk(target.element, x, y, elongation);
          return;
        }
        clearNativeTextInk();
        const contacts = target.element.closest(".lab-calendar") ? calendarContacts : [target];
        const paintRuns = contacts.flatMap((contact) => textPaintRunsFor(contact.element)).map((source) => ({
          source,
          rect: source.getBoundingClientRect(),
        }));
        const sourceSignature = paintRuns.map(({ source, rect }) => [
          source.hasAttribute("data-fluid-cursor-svg-mask") ? source.innerHTML : source.textContent ?? "",
          source.className,
          source.getAttribute("style") ?? "",
          rect.left.toFixed(3),
          rect.top.toFixed(3),
          rect.width.toFixed(3),
          rect.height.toFixed(3),
        ].join("|")).join("||");
        if (textMaskSource !== target.element || textMaskSignature !== sourceSignature) {
          const fragment = document.createDocumentFragment();
          paintRuns.forEach(({ source, rect }) => {
            const sourceStyle = window.getComputedStyle(source);
            const run = document.createElement("span");
            run.className = "fluid-cursor__text-mask-run";
            if (source.matches("[data-fluid-cursor-svg-mask]")) {
              run.append(...Array.from(source.children, (child) => child.cloneNode(true)));
              run.style.display = "inline-flex";
              run.style.alignItems = "center";
              run.style.gap = window.getComputedStyle(source).gap;
              Array.from(run.children).forEach((child, index) => {
                const size = source.children[index]?.getBoundingClientRect();
                if (!(child instanceof SVGElement) || !size) return;
                child.style.width = `${size.width}px`;
                child.style.height = `${size.height}px`;
                child.style.fill = "currentColor";
                child.style.color = "inherit";
              });
            } else run.textContent = source.textContent;
            run.style.left = `${rect.left}px`;
            run.style.top = `${rect.top}px`;
            run.style.width = `${rect.width}px`;
            run.style.height = `${rect.height}px`;
            run.style.font = sourceStyle.font;
            run.style.fontFamily = sourceStyle.fontFamily;
            run.style.fontSize = sourceStyle.fontSize;
            run.style.fontStyle = sourceStyle.fontStyle;
            run.style.fontWeight = sourceStyle.fontWeight;
            run.style.fontSynthesis = sourceStyle.fontSynthesis;
            run.style.fontStretch = sourceStyle.fontStretch;
            run.style.letterSpacing = sourceStyle.letterSpacing;
            run.style.wordSpacing = sourceStyle.wordSpacing;
            run.style.lineHeight = sourceStyle.lineHeight;
            run.style.textAlign = sourceStyle.textAlign;
            run.style.textTransform = sourceStyle.textTransform;
            run.style.whiteSpace = sourceStyle.whiteSpace;
            run.style.direction = sourceStyle.direction;
            run.style.writingMode = sourceStyle.writingMode;
            run.style.opacity = sourceStyle.opacity;
            if (source.matches(".calendar-hour-divider, .calendar-week-divider") || source.closest(".calendar-scrollbar")) {
              run.style.setProperty("color", "#55575a", "important");
              run.style.opacity = "1";
            }
            run.style.setProperty("font-kerning", sourceStyle.getPropertyValue("font-kerning"));
            run.style.setProperty("font-feature-settings", sourceStyle.getPropertyValue("font-feature-settings"));
            run.style.setProperty("font-variation-settings", sourceStyle.getPropertyValue("font-variation-settings"));
            run.style.setProperty("font-optical-sizing", sourceStyle.getPropertyValue("font-optical-sizing"));
            run.style.setProperty("text-rendering", sourceStyle.getPropertyValue("text-rendering"));
            const agenda = source.closest<HTMLElement>(".calendar-agenda");
            if (agenda) {
              // Each contact retains its own viewport mask. A global agenda
              // mask would incorrectly cut off the adjacent scrollbar.
              const r = agenda.getBoundingClientRect();
              const clip = document.createElement("span");
              clip.style.cssText = "position:absolute;inset:0;pointer-events:none";
              clip.style.maskImage = "linear-gradient(transparent, #000 12px, #000 calc(100% - 5px), transparent)";
              clip.style.maskSize = `${r.width}px ${r.height}px`;
              clip.style.maskPosition = `${r.left}px ${r.top}px`;
              clip.style.maskRepeat = "no-repeat";
              clip.append(run); fragment.append(clip);
            } else fragment.append(run);
          });
          textMask.replaceChildren(fragment);
          textMaskSource = target.element;
          textMaskSignature = sourceSignature;
        }
        // Intersect with the real scroll viewport; mask contact is based on the
        // painted orb, including contact when its centre is outside the box.
        textMask.style.clipPath = cursorClipPolygon(x, y, rotation, elongation);
        textMask.style.maskImage = "none";
        textMask.style.opacity = "1";
        return;
      }
      clearNativeTextInk();
      textMask.style.opacity = "0";
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
      syncNegativeMask(cursor.x, cursor.y, rotation, elongation);
      fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${rotation}rad) scale(${1 + elongation}, ${1 - elongation * 0.52})`;
      fallback.classList.add("fluid-cursor--visible");
    };

    const finishToolMorph = () => {
      toolMorphing = false;
      running = false;
      fallback.classList.remove("fluid-cursor--tool-morph");
      if (!activeTool) fallback.classList.remove("fluid-cursor--tool-compact");
      fallback.style.removeProperty("inline-size");
      fallback.style.removeProperty("block-size");
      fallback.style.removeProperty("border-radius");
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      // Preserve the final morph frame's position, velocity, rotation, and
      // stretch. The ordinary cursor loop continues from this exact state;
      // snapping to the pointer here would break the physics handoff.
      startLoop();
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

    const releaseLiquidTargets = () => {
      activeTarget = null;
      liquidWasRendering = false;
      canvas.classList.remove("is-visible");
      targets.forEach((target) => {
        target.element.removeAttribute("data-liquid-active");
        target.element.removeAttribute("data-liquid-rendered");
        target.element.removeAttribute("data-liquid-absorbed");
        target.tx = 0;
        target.ty = 0;
        target.surface.style.removeProperty("--liquid-ink-x");
        target.surface.style.removeProperty("--liquid-ink-y");
        target.surface.style.removeProperty("--liquid-ink-radius");
      });
      startLoop();
    };

    const clearToolCursor = () => {
      if (!activeTool && !fallback.classList.contains("fluid-cursor--tool-popover") && !toolMorphing) return;
      if (toolMorphing) return;
      activeTool = null;
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolCopyTimer);
      window.cancelAnimationFrame(toolCopyFrame);
      window.cancelAnimationFrame(toolEntryFrame);
      // Read the live tooltip geometry before removing its class. Reading it
      // afterward collapses to the ordinary 21px cursor first, making the
      // reverse animation appear instant because it has no rectangle to lose.
      const currentRect = fallback.getBoundingClientRect();
      const currentStyle = window.getComputedStyle(fallback);
      const currentRadius = currentStyle.borderRadius;
      const currentPadding = currentStyle.padding;
      // Pin the exact live popup geometry. The next frame changes only to the
      // standard cursor values, so this is literally the entry transition in
      // reverse rather than a separate, approximate exit animation.
      fallback.style.inlineSize = `${currentRect.width}px`;
      fallback.style.blockSize = `${currentRect.height}px`;
      fallback.style.borderRadius = currentRadius;
      fallback.style.padding = currentPadding;
      fallback.style.boxShadow = "none";
      fallback.classList.remove("fluid-cursor--tool-popover", "fluid-cursor--tool-text-ready", "fluid-cursor--tool-copy-changing", "fluid-cursor--tool-copy-entering", "fluid-cursor--tool-entering");
      fallback.style.removeProperty("--fluid-tool-width");
      fallback.style.removeProperty("--fluid-tool-height");
      toolMorphProgress = 0;
      toolMorphLastTime = performance.now();
      toolMorphStartWidth = currentRect.width;
      toolMorphStartHeight = currentRect.height;
      toolMorphStartRadius = Number.parseFloat(currentRadius) || 13.6;
      toolMorphNearSquareSize = currentRect.height * 0.95;
      toolMorphLargeBallSize = toolMorphNearSquareSize * 0.95;
      toolMorphing = true;
      fallback.classList.add("fluid-cursor--tool-morph");
      if (pointer.active) {
        cursor.x = currentRect.left + currentRect.width / 2;
        cursor.y = currentRect.top + currentRect.height / 2;
        cursor.vx = 0;
        cursor.vy = 0;
        showFallbackAtCursor();
        startLoop();
      } else {
        finishToolMorph();
      }
    };

    const pillRectFor = (element: HTMLElement) => {
      const label = element.querySelector<HTMLElement>("[data-cursor-pill-label]");
      const rect = (label ?? element).getBoundingClientRect();
      const isAudienceLabel = element.matches(".hero-audience button");
      const paddingInline = isAudienceLabel ? 13 : 9;
      const paddingBlock = 5;
      // The audience label's line box carries slightly more invisible ascent
      // than descent. Offset its fill to the visible glyphs, not the font box.
      const opticalBlockOffset = isAudienceLabel ? 1 : 0;
      const height = rect.height + paddingBlock * 2;
      return {
        left: rect.left - paddingInline,
        // Match the working rail behavior: derive both axes from the real
        // glyph line box, rather than the audience row's larger layout box.
        top: rect.top - paddingBlock + opticalBlockOffset,
        width: rect.width + paddingInline * 2,
        height,
      };
    };

    const setPillLayer = (element: HTMLElement, active: boolean) => {
      element.toggleAttribute("data-cursor-pill-active", active);
      const layerHost = element.closest<HTMLElement>(".desktop-rail, .hero-audience, .lab-calendar");
      layerHost?.classList.toggle("is-fluid-cursor-pill-layer", active);
    };

    const setPillPressed = (pressed: boolean) => {
      if (!activePill || !activePillTransform) return;
      fallback.classList.toggle("is-fluid-cursor-pill-pressed", pressed);
      fallback.style.transform = pressed
        ? `${activePillTransform} scale(1.05)`
        : activePillTransform;
    };

    const clearPillCursor = () => {
      if (!activePill && !fallback.classList.contains("fluid-cursor--pill-highlight")) return;
      if (toolMorphing) return;

      window.clearTimeout(pillLeaveTimer);
      window.clearTimeout(pillPressReleaseTimer);
      window.clearTimeout(toolEntryTimer);
      window.cancelAnimationFrame(toolEntryFrame);
      setPillPressed(false);
      const currentRect = fallback.getBoundingClientRect();
      const currentStyle = window.getComputedStyle(fallback);
      if (activePill) setPillLayer(activePill, false);
      activePill = null;
      activePillTransform = "";

      fallback.style.inlineSize = `${currentRect.width}px`;
      fallback.style.blockSize = `${currentRect.height}px`;
      fallback.style.borderRadius = currentStyle.borderRadius;
      fallback.style.padding = currentStyle.padding;
      fallback.style.boxShadow = "none";
      fallback.classList.remove("fluid-cursor--pill-highlight", "fluid-cursor--tool-entering", "is-fluid-cursor-pill-pressed");
      fallback.style.removeProperty("--fluid-pill-width");
      fallback.style.removeProperty("--fluid-pill-height");

      toolMorphProgress = 0;
      toolMorphLastTime = performance.now();
      toolMorphStartWidth = currentRect.width;
      toolMorphStartHeight = currentRect.height;
      toolMorphStartRadius = Number.parseFloat(currentStyle.borderRadius) || currentRect.height / 2;
      toolMorphNearSquareSize = currentRect.height * 0.95;
      toolMorphLargeBallSize = toolMorphNearSquareSize * 0.95;
      toolMorphing = true;
      fallback.classList.add("fluid-cursor--tool-morph");
      if (pointer.active) {
        cursor.x = currentRect.left + currentRect.width / 2;
        cursor.y = currentRect.top + currentRect.height / 2;
        cursor.vx = 0;
        cursor.vy = 0;
        showFallbackAtCursor();
        startLoop();
      } else {
        finishToolMorph();
      }
    };

    const setActivePill = (nextPill: HTMLElement) => {
      if (isScrolling || document.documentElement.classList.contains("calendar-overlay-open") || nextPill === activePill) return;

      datePull = 0; paintedCursorRadius = cursorRadius;
      activeDate?.removeAttribute("data-cursor-date-active"); activeDate = null;
      fallback.classList.remove("fluid-cursor--date-attraction");
      pendingPillActivation = false;
      window.clearTimeout(pillLeaveTimer);
      window.clearTimeout(pillPressReleaseTimer);
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolEntryTimer);
      window.cancelAnimationFrame(toolEntryFrame);
      releaseLiquidTargets();
      clearNativeTextInk();
      textMask.style.opacity = "0";
      // The cursor element is shared with tooltips. Cancel a departing
      // tooltip in-place before this text-only interaction takes it over.
      activeTool = null;
      const isChangingPill = activePill !== null;
      activePillTransform = "";
      toolMorphing = false;
      fallback.classList.remove("fluid-cursor--tool-morph", "fluid-cursor--tool-entering", "is-fluid-cursor-pill-pressed");
      fallback.style.removeProperty("inline-size");
      fallback.style.removeProperty("block-size");
      fallback.style.removeProperty("border-radius");
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      if (activePill) setPillLayer(activePill, false);
      activePill = nextPill;
      setPillLayer(nextPill, true);

      const rect = pillRectFor(nextPill);
      fallback.classList.remove(
        "fluid-cursor--tool-popover",
        "fluid-cursor--tool-text-ready",
        "fluid-cursor--tool-copy-changing",
        "fluid-cursor--tool-copy-entering",
        "fluid-cursor--tool-entering",
      );
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      fallback.style.setProperty("--fluid-pill-width", `${rect.width}px`);
      fallback.style.setProperty("--fluid-pill-height", `${rect.height}px`);
      const applyPill = () => {
        if (activePill !== nextPill) return;
        fallback.classList.add("fluid-cursor--pill-highlight", "fluid-cursor--visible");
        activePillTransform = `translate3d(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px, 0) translate(-50%, -50%)`;
        fallback.style.transform = activePillTransform;
      };
      // Use the same cursor-to-tooltip handoff: first draw one unrotated ball,
      // then morph it into the anchored destination on the next paint.
      if (!isChangingPill) {
        cursor.x = pointer.x;
        cursor.y = pointer.y;
        cursor.vx = 0;
        cursor.vy = 0;
        fallback.classList.add("fluid-cursor--visible", "fluid-cursor--liquid-handoff");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
        fallback.getBoundingClientRect();
        toolEntryFrame = window.requestAnimationFrame(() => {
          fallback.classList.remove("fluid-cursor--liquid-handoff");
          fallback.classList.add("fluid-cursor--tool-entering");
          applyPill();
          toolEntryTimer = window.setTimeout(() => fallback.classList.remove("fluid-cursor--tool-entering"), 460);
        });
      } else {
        applyPill();
      }
      canvas.classList.remove("is-visible");
    };

    const setActiveTool = (nextTool: HTMLElement) => {
      if (isScrolling || document.documentElement.classList.contains("calendar-overlay-open") || nextTool === activeTool) return;

      datePull = 0; paintedCursorRadius = cursorRadius;
      activeDate?.removeAttribute("data-cursor-date-active"); activeDate = null;
      fallback.classList.remove("fluid-cursor--date-attraction");
      pendingToolActivation = false;
      const isChangingTool = activeTool !== null;
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(toolEntryTimer);
      window.cancelAnimationFrame(toolEntryFrame);
      window.clearTimeout(pillLeaveTimer);
      window.clearTimeout(pillPressReleaseTimer);
      if (activePill) setPillLayer(activePill, false);
      activePill = null;
      activePillTransform = "";
      // A tooltip takes over the fallback cursor. Release the liquid button
      // before hiding its canvas so a fast button-to-tool handoff cannot leave
      // that button transparent.
      releaseLiquidTargets();
      toolMorphing = false;
      fallback.classList.remove("fluid-cursor--tool-morph", "fluid-cursor--tool-text-ready", "fluid-cursor--tool-entering");
      fallback.classList.remove("fluid-cursor--pill-highlight");
      fallback.classList.remove("is-fluid-cursor-pill-pressed");
      fallback.style.removeProperty("inline-size");
      fallback.style.removeProperty("block-size");
      fallback.style.removeProperty("border-radius");
      fallback.style.removeProperty("padding");
      fallback.style.removeProperty("box-shadow");
      fallback.style.removeProperty("--fluid-pill-width");
      fallback.style.removeProperty("--fluid-pill-height");
      activeTool = nextTool;
      clearNativeTextInk();
      knobMask.style.opacity = "0";
      textMask.style.opacity = "0";

      const title = nextTool.dataset.cursorTitle ?? "Tool";
      const description = nextTool.dataset.cursorDescription ?? "Used in this part of the workflow.";
      const hasTitle = title.trim().length > 0;
      // Action-only controls should feel like a cursor-sized label, while
      // richer tool descriptions retain enough room to read comfortably.
      const compact = nextTool.hasAttribute("data-cursor-compact");
      fallback.classList.toggle("fluid-cursor--tool-compact", compact);
      const width = Number(nextTool.dataset.cursorWidth) || (compact ? (description.length > 9 ? 108 : 88) : hasTitle
        ? clamp(156 + description.length * 0.72, 172, 220)
        : clamp(116 + description.length * 0.82, 148, 220));
      const height = Number(nextTool.dataset.cursorHeight) || (compact ? 34 : hasTitle
        ? (description.length > 62 ? 96 : 82)
        : (description.length > 68 ? 78 : description.length > 36 ? 62 : 48));
      setToolCopy(title, description, isChangingTool);
      fallback.style.setProperty("--fluid-tool-width", `${width}px`);
      fallback.style.setProperty("--fluid-tool-height", `${height}px`);

      const applyToolPopover = () => {
        if (activeTool !== nextTool) return;
        const rect = nextTool.getBoundingClientRect();
        const side = nextTool.dataset.cursorSide;
        const placeLeft = side === "left" && rect.left >= width + 12;
        const anchorX = Math.round((placeLeft
          ? rect.left - 12
          : clamp(rect.left + rect.width / 2, width / 2 + 12, window.innerWidth - width / 2 - 12)) * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
        const placeAbove = rect.top >= height + 12;
        const anchorY = Math.round((placeLeft
          ? clamp(rect.top + rect.height / 2, height / 2 + 12, window.innerHeight - height / 2 - 12)
          : placeAbove ? rect.top - 12 : rect.bottom + 4) * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
        fallback.classList.add("fluid-cursor--tool-popover", "fluid-cursor--visible");
        fallback.style.transform = placeLeft
          ? `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-100%, -50%)`
          : placeAbove
          ? `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-50%, -100%)`
          : `translate3d(${anchorX}px, ${anchorY}px, 0) translate(-50%, 0)`;
        canvas.classList.remove("is-visible");
      };
      updateToolAnchor = applyToolPopover;

      // The standard cursor can be stretched and rotated while moving. Before
      // its first tool morph, give the fallback one painted frame as a real
      // ball. That makes a liquid-button-to-tool handoff visibly morph instead
      // of replacing the mouse with an already-expanded tooltip.
      if (!isChangingTool) {
        cursor.x = pointer.x;
        cursor.y = pointer.y;
        cursor.vx = 0;
        cursor.vy = 0;
        fallback.classList.add("fluid-cursor--visible", "fluid-cursor--liquid-handoff");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
        fallback.getBoundingClientRect();
        toolEntryFrame = window.requestAnimationFrame(() => {
          fallback.classList.remove("fluid-cursor--liquid-handoff");
          fallback.classList.add("fluid-cursor--tool-entering");
          applyToolPopover();
          toolEntryTimer = window.setTimeout(() => fallback.classList.remove("fluid-cursor--tool-entering"), 460);
        });
        return;
      }
      applyToolPopover();
    };

    const scheduleToolClear = () => {
      window.clearTimeout(toolLeaveTimer);
      toolLeaveTimer = window.setTimeout(() => {
        if (!activeTool?.matches(":hover")) clearToolCursor();
      }, 0);
    };

    const schedulePillClear = () => {
      window.clearTimeout(pillLeaveTimer);
      pillLeaveTimer = window.setTimeout(() => {
        if (!activePill?.matches(":hover")) clearPillCursor();
      }, 0);
    };

    const handlePillPointerOver = (event: PointerEvent) => {
      const nextPill = (event.target as Element | null)?.closest<HTMLElement>("[data-cursor-pill]");
      if (!nextPill) return;
      const from = event.relatedTarget;
      if (from instanceof Node && nextPill.contains(from)) return;
      setActivePill(nextPill);
    };

    const handlePillPointerOut = (event: PointerEvent) => {
      const leavingPill = (event.target as Element | null)?.closest<HTMLElement>("[data-cursor-pill]");
      if (!leavingPill || leavingPill !== activePill) return;
      setPillPressed(false);
      const to = event.relatedTarget;
      if (to instanceof Node && leavingPill.contains(to)) return;
      schedulePillClear();
    };

    const handlePillPointerDown = (event: PointerEvent) => {
      const pill = (event.target as Element | null)?.closest<HTMLElement>("[data-cursor-pill]");
      if (pill === activePill) setPillPressed(true);
    };

    const releasePillPress = () => {
      window.clearTimeout(pillPressReleaseTimer);
      pillPressReleaseTimer = window.setTimeout(() => {
        setPillPressed(false);
      }, 50);
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

    const activateToolUnderPointer = () => {
      if (isScrolling || !pointer.active) return;
      // The tooltip under a stopped scroll begins only after its prior exit
      // finishes. Otherwise the new popup replaces a shrinking rectangle and
      // reads as a snap instead of a second, normal cursor-to-tooltip morph.
      if (toolMorphing) {
        pendingToolActivation = true;
        return;
      }
      const tool = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-cursor-tool]");
      if (tool?.matches(":hover")) setActiveTool(tool);
    };

    const activatePillUnderPointer = () => {
      if (isScrolling || !pointer.active) return;
      // Just like tooltips, a pill revealed under a stationary cursor after
      // scroll waits for the previous reverse morph to finish. This prevents
      // it from replacing a shrinking shape mid-frame.
      if (toolMorphing) {
        pendingPillActivation = true;
        return;
      }
      const pill = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-cursor-pill]");
      if (pill?.matches(":hover")) setActivePill(pill);
    };

    const clearLiquidFrame = () => {
      if (!gl) return;
      gl.disable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      previousDrawBounds = null;
    };

    const showLiquidRenderer = () => {
      const wasRendering = liquidWasRendering;
      liquidWasRendering = true;
      // The markup stays painted during the headline-only state. Do not let a
      // queued pointer event expose the canvas before it is allowed to draw.
      if (isHeroIntroLocked()) {
        canvas.classList.remove("is-visible");
        showFallbackAtPointer();
        return;
      }
      // Entering a liquid field is a direct one-frame swap, not an opacity
      // crossfade. A crossfade leaves the previous cursor silhouette behind.
      if (!wasRendering) clearLiquidFrame();
      fallback.classList.add("fluid-cursor--liquid-handoff");
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
      if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
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
      const cursorExtent = paintedCursorRadius * (1 + stretch) + 8;
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
      setUniform2("u_cursor_radii", paintedCursorRadius * (1 + stretch), paintedCursorRadius * (1 - stretch * 0.52));
      setUniform2("u_cursor_direction", directionX, directionY);
      syncNegativeMask(cursor.x, cursor.y, angle, stretch);
      setUniform3("u_cursor_color", themeColors.cursor);
      setUniform3("u_primary_color", themeColors.primary);
      setUniform3("u_primary_hover_color", themeColors.primaryHover);
      setUniform3("u_primary_active_color", themeColors.primaryActive);
      setUniform3("u_secondary_color", themeColors.secondary);
      setUniform3("u_secondary_hover_color", themeColors.secondaryHover);
      setUniform3("u_secondary_active_color", themeColors.secondaryActive);
      const neutralColor = activeTarget?.element.matches("[data-fluid-cursor-theme-fill], [data-fluid-cursor-calendar-fill]")
        ? hexToRgb(getComputedStyle(activeTarget.element).getPropertyValue(activeTarget.element.hasAttribute("data-fluid-cursor-theme-fill") ? "--calendar-today" : "--calendar-fluid-fill"), themeColors.neutralTarget)
        : themeColors.neutralTarget;
      setUniform3("u_neutral_target_color", neutralColor);
      setUniform3("u_dark_target_color", themeColors.darkTarget);
      if (activeTarget) {
        // Retry enters with a scale animation. Keep neutral targets measured so
        // their liquid capsule always reaches the final DOM button width.
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
        const shouldAbsorb = activeTarget.isNeutralMerge && absorption > 0.985;
        if (activeTarget.element.hasAttribute("data-liquid-absorbed") !== shouldAbsorb) {
          activeTarget.element.toggleAttribute("data-liquid-absorbed", shouldAbsorb);
        }
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
        setUniform1("u_target_dark", activeTarget.isDarkMerge ? 1 : 0);
        setUniform2("u_target_half_size", halfWidth, halfHeight);
        setUniform1("u_target_corner_radius", cornerRadius);
        setUniform1("u_target_secondary", activeTarget.isSecondary ? 1 : 0);
        setUniform1("u_target_hover", activeTarget.hoverProgress);
        setUniform1("u_target_pressed", !activeTarget.isOutline && activeTarget.element.matches(":active") ? 1 : 0);
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
        setUniform1("u_target_dark", 0);
        setUniform2("u_target_half_size", 0, 0);
        setUniform1("u_target_corner_radius", 0);
        setUniform1("u_target_secondary", 0);
        setUniform1("u_target_hover", 0);
        setUniform1("u_target_pressed", 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (activeTarget && !activeTarget.element.hasAttribute("data-liquid-rendered")) {
        activeTarget.element.setAttribute("data-liquid-rendered", "true");
      }
      previousDrawBounds = currentDrawBounds;
    };

    const setActiveTarget = (x: number, y: number) => {
      let closest: LiquidTarget | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const target of targets) {
        const distance = distanceToRect(x, y, renderedRectFor(target));
        const activationRange = activationRangeFor(target);
        if (distance <= activationRange && distance < closestDistance && targetIsPainted(target)) {
          closest = target;
          closestDistance = distance;
        }
      }
      const nextTarget = closest;
      if (nextTarget !== activeTarget) {
        activeTarget?.element.removeAttribute("data-liquid-active");
        activeTarget?.element.removeAttribute("data-liquid-rendered");
        activeTarget?.element.removeAttribute("data-liquid-absorbed");
        if (nextTarget) {
          nextTarget.rect = nextTarget.element.getBoundingClientRect();
          nextTarget.element.setAttribute("data-liquid-active", "true");
        }
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
        const desiredShift = Math.min(distance * magnetStrength * proximity * proximity, maxButtonShift) * magneticResumeProgress;
        target.tx = (dx / distance) * desiredShift;
        target.ty = (dy / distance) * desiredShift;
      });
    };

    const advanceButtons = () => {
      let moving = false;
      targets.forEach((target) => {
        const wantedHover = target === activeTarget && target.element.matches(":hover") ? 1 : 0;
        target.hoverProgress += (wantedHover - target.hoverProgress) * 0.16;
        if (Math.abs(wantedHover - target.hoverProgress) < 0.002) target.hoverProgress = wantedHover;
        target.vx = (target.vx + (target.tx - target.x) * 0.12) * 0.72;
        target.vy = (target.vy + (target.ty - target.y) * 0.12) * 0.72;
        target.x += target.vx;
        target.y += target.vy;
        // Write the exact offset consumed by draw(), including subpixel motion.
        // Neutral surfaces do not magnetically translate. Their transform
        // belongs to layout, e.g. the centered Play/Retry controls.
        if (!target.isNeutralMerge) target.surface.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
        moving ||= Math.abs(target.vx) + Math.abs(target.vy) +
          Math.abs(target.tx - target.x) + Math.abs(target.ty - target.y) +
          Math.abs(wantedHover - target.hoverProgress) > 0.025;
      });
      return moving;
    };

    function render() {
      // Once Lenis supplies the frame clock, an already queued standalone
      // callback must not integrate the same physics a second time.
      if (scrollFrameDriven && !drawingScrollFrame) return;
      // Read layout before writing transforms. No scroll-event delta cache:
      // the shader and DOM now use the document's current viewport position.
      if (isScrolling || window.scrollX !== lastScrollX || window.scrollY !== lastScrollY) {
        if (window.scrollX !== lastScrollX || window.scrollY !== lastScrollY) handleScroll();
        measureTargets();
      }
      if (document.documentElement.classList.contains("calendar-overlay-open")) {
        canvas?.classList.remove("is-visible");
        fallback.classList.remove("fluid-cursor--visible");
        syncNegativeMask(cursor.x, cursor.y);
        if (advanceButtons()) {
          if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
        } else running = false;
        return;
      }
      if (cursorSuppressed) {
        canvas?.classList.remove("is-visible");
        fallback.classList.remove("fluid-cursor--visible");
        running = false;
        return;
      }
      if (!activeTool && !activePill && performance.now() < cursorResumeFallbackUntil) {
        canvas?.classList.remove("is-visible");
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`;
        if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
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
        syncNegativeMask(cursor.x, cursor.y, angle, stretch);
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
        if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
        return;
      }
      // Tool popups are anchored to their own controls. Once the cursor has
      // handed off to that static shape, there is no cursor animation work to
      // perform until the pointer leaves the tool.
      if (activeTool || activePill) {
        syncNegativeMask(cursor.x, cursor.y);
        if (activeTool) updateToolAnchor?.();
        canvas?.classList.remove("is-visible");
        if (advanceButtons()) {
          if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
        } else running = false;
        return;
      }
      if (toolMorphing) {
        advanceButtons();
        canvas?.classList.remove("is-visible");
        // Use the same spring and velocity deformation as the normal cursor.
        // The shape follows one continuous rectangle -> square -> ball curve;
        // there is no extra end acceleration or staged pause.
        cursor.vx = (cursor.vx + (pointer.x - cursor.x) * 0.12) * 0.7;
        cursor.vy = (cursor.vy + (pointer.y - cursor.y) * 0.12) * 0.7;
        cursor.x += cursor.vx;
        cursor.y += cursor.vy;

        const now = performance.now();
        const deltaTime = Math.min(Math.max(now - toolMorphLastTime, 0), 32);
        toolMorphLastTime = now;
        toolMorphProgress = clamp(toolMorphProgress + deltaTime / toolMorphDuration, 0, 1);

        const cursorDiameter = cursorRadius * 2;
        const inverseProgress = 1 - toolMorphProgress;
        const startWeight = inverseProgress ** 3;
        const nearSquareWeight = 3 * inverseProgress ** 2 * toolMorphProgress;
        const largeBallWeight = 3 * inverseProgress * toolMorphProgress ** 2;
        const cursorWeight = toolMorphProgress ** 3;
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
        fallback.style.padding = `${0.75 * inverseProgress}rem ${0.85 * inverseProgress}rem`;
        fallback.style.boxShadow = "none";

        // A rectangle stays level. As it becomes circular, blend in the same
        // directional stretch and rotation used by the ordinary mouse ball.
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
        if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
        return;
      }
      // Ordinary dates attract only the orb. They are never liquid surfaces,
      // never reset position/velocity, and never animate the label itself.
      let nearestDate: NegativeMaskTarget | null = null;
      let dateDistance = Infinity;
      if (!isScrolling && !document.documentElement.classList.contains("calendar-overlay-open")) {
        for (const target of dateTargets) {
          if (target.element.closest("[inert]")) continue;
          const distance = distanceToRect(pointer.x, pointer.y, target.rect);
          if (distance <= 6 && distance < dateDistance) { nearestDate = target; dateDistance = distance; }
        }
      }
      const nextDate = nearestDate?.element ?? null;
      if (activeDate !== nextDate) {
        activeDate?.removeAttribute("data-cursor-date-active");
        nextDate?.setAttribute("data-cursor-date-active", "");
        activeDate = nextDate;
      }
      const wantedPull = nearestDate ? 1 : 0;
      datePull += (wantedPull - datePull) * 0.16;
      const dateRect = nearestDate?.rect;
      const goalX = dateRect ? pointer.x + ((dateRect.left + dateRect.width / 2) - pointer.x) * datePull * 0.92 : pointer.x;
      const goalY = dateRect ? pointer.y + ((dateRect.top + dateRect.height / 2) - pointer.y) * datePull * 0.92 : pointer.y;
      const wantedRadius = dateRect ? dateRect.height / 2 : cursorRadius;
      paintedCursorRadius += (wantedRadius - paintedCursorRadius) * 0.16;
      const dateMoving = Math.abs(wantedPull - datePull) + Math.abs(wantedRadius - paintedCursorRadius) > 0.01;
      fallback.classList.toggle("fluid-cursor--date-attraction", datePull > 0.001 || paintedCursorRadius > cursorRadius + 0.01);
      fallback.style.inlineSize = `${paintedCursorRadius * 2}px`;
      fallback.style.blockSize = `${paintedCursorRadius * 2}px`;
      cursor.vx = (cursor.vx + (goalX - cursor.x) * 0.12) * 0.7;
      cursor.vy = (cursor.vy + (goalY - cursor.y) * 0.12) * 0.7;
      cursor.x += cursor.vx;
      cursor.y += cursor.vy;
      if (pendingToolActivation && Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y) < 1.5) {
        pendingToolActivation = false;
        window.requestAnimationFrame(activateToolUnderPointer);
      }
      if (pendingPillActivation && Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y) < 1.5) {
        pendingPillActivation = false;
        window.requestAnimationFrame(activatePillUnderPointer);
      }
      if (magneticResumeStartedAt > 0 && !magneticTranslationSuspended) {
        magneticResumeProgress = smootherstep(0, 1, (performance.now() - magneticResumeStartedAt) / magneticResumeDuration);
        if (magneticResumeProgress >= 1) magneticResumeStartedAt = 0;
      }
      const nearToday = targets.some((target) => target.element.matches('.calendar-day.is-today') && distanceToRect(pointer.x, pointer.y, target.rect) <= activationRangeFor(target) && targetIsPainted(target));
      const dateOwnsCursor = nearestDate !== null || (datePull > 0.2 && !nearToday);
      setActiveTarget(dateOwnsCursor ? -10000 : cursor.x, dateOwnsCursor ? -10000 : cursor.y);
      const pointerNearTarget = isNearTarget(pointer.x, pointer.y);
      const speed = Math.min(Math.hypot(cursor.vx, cursor.vy), 28);
      const drawingDateCircle = nearestDate !== null || datePull > 0.001;
      stretch = drawingDateCircle ? 0 : Math.min(speed * 0.018, 0.42);
      angle = drawingDateCircle ? 0 : Math.atan2(cursor.vy, cursor.vx);
      // Ignore near-zero direction reversals so the ellipse does not flip its
      // axis while the pointer is making tiny corrective movements.
      if (speed > 0.08) {
        directionX = cursor.vx / speed;
        directionY = cursor.vy / speed;
      }

      const buttonsMoving = advanceButtons() || (!magneticTranslationSuspended && magneticResumeProgress < 1);

      const shouldRenderLiquid = usingWebGL && !dateOwnsCursor && (activeTarget !== null || pointerNearTarget);
      if (shouldRenderLiquid) {
        showLiquidRenderer();
        draw();
      } else {
        const exitingLiquid = liquidWasRendering;
        if (exitingLiquid) {
          // Clear before hiding so an old scissored frame can never reappear
          // on the next proximity entry.
          clearLiquidFrame();
          fallback.classList.add("fluid-cursor--liquid-handoff");
        }
        syncNegativeMask(cursor.x, cursor.y, angle, stretch);
        fallback.classList.add("fluid-cursor--visible");
        fallback.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.52})`;
        canvas?.classList.remove("is-visible");
        liquidWasRendering = false;
        if (exitingLiquid) window.requestAnimationFrame(() => fallback.classList.remove("fluid-cursor--liquid-handoff"));
      }
      const cursorMoving = Math.abs(cursor.vx) + Math.abs(cursor.vy) +
        Math.abs(goalX - cursor.x) + Math.abs(goalY - cursor.y) > 0.025 || dateMoving;
      if (cursorMoving || buttonsMoving) settledFrames = 0;
      else settledFrames += 1;
      const insideIdleGrace = performance.now() - lastPointerMoveAt < cursorIdleGrace;
      const liquidWorkNeeded = activeTarget !== null || pointerNearTarget || buttonsMoving;
      if (cursorMoving || buttonsMoving || (liquidWorkNeeded && (insideIdleGrace || settledFrames < settledFrameLimit))) {
        if (!scrollFrameDriven) frame = window.requestAnimationFrame(render);
      } else {
        running = false;
        if (pointer.active && !activeTarget) showFallbackAtCursor(angle, stretch);
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
      if (activeTool || activePill) return;
      if (toolMorphing) {
        startLoop();
        return;
      }
      const pointerNearTarget = isNearTarget(pointer.x, pointer.y);
      if (!activeTarget && !pointerNearTarget) {
        canvas.classList.remove("is-visible");
        syncNegativeMask(cursor.x, cursor.y, angle, stretch);
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
      releaseLiquidTargets();
      startLoop();
    };

    const suspendFluidCursor = () => {
      cursorSuppressed = true;
      liquidWasRendering = false;
      cursorResumeFallbackUntil = 0;
      textMask.style.opacity = "0";
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
      clearPillCursor();
      clearNativeTextInk();
      textMask.style.opacity = "0";
      fallback.classList.remove("fluid-cursor--visible");
      canvas.classList.remove("is-visible");
      resetTargets();
    };
    const enterWindow = () => {
      if (!cursor.initialized) return;
      if (activeTool || activePill) {
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
      clearPillCursor();
      scheduleMeasurement(true);
    };
    const handleScroll = () => {
      const currentScrollX = window.scrollX;
      const currentScrollY = window.scrollY;
      if (currentScrollX === lastScrollX && currentScrollY === lastScrollY) return;
      lastScrollX = currentScrollX;
      lastScrollY = currentScrollY;
      isScrolling = true;
      pendingToolActivation = false;
      pendingPillActivation = false;
      // Begin the exact same tooltip-to-ball timeline as a hover exit. Do it
      // only once per scroll gesture: repeated wheel events must not restart
      // the morph and make it look slow or sticky.
      if (activeTool || fallback.classList.contains("fluid-cursor--tool-popover")) {
        clearToolCursor();
      }
      if (activePill || fallback.classList.contains("fluid-cursor--pill-highlight")) {
        clearPillCursor();
      }
      // Keep the liquid union, but prevent scrolling content from pulling the
      // real DOM button toward a stationary pointer.
      if (!magneticTranslationSuspended) {
        magneticTranslationSuspended = true;
        magneticResumeStartedAt = 0;
        magneticResumeProgress = 0;
        targets.forEach((target) => {
          target.tx = 0;
          target.ty = 0;
        });
      }
      window.clearTimeout(scrollIdleTimer);
      const finishScroll = () => {
        // Rounded native scroll positions can stay unchanged during Lenis's
        // final fractional movement. Do not re-engage in those quiet gaps.
        if (lenisIsScrolling) {
          scrollIdleTimer = window.setTimeout(finishScroll, scrollSettleDelay);
          return;
        }
        isScrolling = false;
        magneticTranslationSuspended = false;
        magneticResumeStartedAt = performance.now();
        magneticResumeProgress = 0;
        measureTargets();
        // Pointerenter does not fire when scrolling moves a tool beneath a
        // stationary cursor. Probe the element under it once scrolling stops.
        activateToolUnderPointer();
        activatePillUnderPointer();
        startLoop();
      };
      scrollIdleTimer = window.setTimeout(finishScroll, scrollSettleDelay);
      startLoop();
    };
    let drawingScrollFrame = false;
    const afterScrollFrame = (event: Event) => {
      // Lenis owns frame ordering; retain the normal RAF as a fallback on
      // pages without its scrollbar. Cancel it here to avoid double physics.
      scrollFrameDriven = true;
      lenisIsScrolling = Boolean((event as CustomEvent<{ scrolling: boolean }>).detail?.scrolling);
      if (window.scrollX !== lastScrollX || window.scrollY !== lastScrollY) handleScroll();
      if (!running) return;
      window.cancelAnimationFrame(frame);
      drawingScrollFrame = true;
      try { render(); } finally { drawingScrollFrame = false; }
    };
    const releaseScrollFrameDriver = () => {
      scrollFrameDriven = false;
      lenisIsScrolling = false;
      if (running) frame = window.requestAnimationFrame(render);
    };
    const syncVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        running = false;
        textMask.style.opacity = "0";
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
    let calendarReturnTimer = 0;
    const calendarGeometry = () => {
      measureTargets();
      // Internal agenda scrolls don't run handleScroll. Rebuild or hide the
      // fixed clones against the new geometry immediately, even if the
      // pointer and the anchored tooltip are stationary.
      textMaskSource = null;
      textMaskSignature = "";
      if (activeTool && !activeTool.matches(":hover")) clearToolCursor();
      else if (activeTool) updateToolAnchor?.();
      activateToolUnderPointer();
      syncNegativeMask(cursor.x, cursor.y, angle, stretch);
      startLoop();
    };
    const calendarCursor = (event: Event) => {
      const open = (event as CustomEvent<{ open: boolean }>).detail?.open;
      window.clearTimeout(calendarReturnTimer);
      document.documentElement.classList.remove("calendar-cursor-returning");
      if (open) {
        datePull = 0; paintedCursorRadius = cursorRadius;
        activeDate?.removeAttribute("data-cursor-date-active"); activeDate = null;
        fallback.classList.remove("fluid-cursor--date-attraction");
        // Hide paint only. Pointer tracking, button settling and the shared
        // Lenis clock continue while the native-cursor dialog owns interaction.
        clearToolCursor(); clearPillCursor();
        finishToolMorph(); releaseLiquidTargets();
        fallback.classList.remove("fluid-cursor--tool-popover", "fluid-cursor--pill-highlight", "fluid-cursor--tool-compact");
        syncNegativeMask(cursor.x, cursor.y);
      } else {
        // This reposition happens while invisible, not during a visible morph.
        cursor.x = pointer.x; cursor.y = pointer.y; cursor.vx = 0; cursor.vy = 0;
        measureTargets();
        document.documentElement.classList.add("calendar-cursor-returning");
        calendarReturnTimer = window.setTimeout(() => document.documentElement.classList.remove("calendar-cursor-returning"), 180);
        activateToolUnderPointer(); activatePillUnderPointer();
      }
      startLoop();
      // Layout effects dispatch this before paint. Draw the restored liquid
      // surface now, so DOM fill ownership and cursor absorption change in
      // the same frame as removal of the collapsing popup.
      const wasDrawingScrollFrame = drawingScrollFrame;
      drawingScrollFrame = true;
      try { render(); } finally { drawingScrollFrame = wasDrawingScrollFrame; }
    };

    targetResizeObserver = new ResizeObserver(() => scheduleMeasurement());
    refreshTargets();
    initializeWebGL();
    const observer = new MutationObserver((records) => {
      // Replacing the visual text clone is an internal paint operation. Do
      // not feed it back into global target discovery on the following frame.
      if (records.every((record) => record.target === textMask || textMask.contains(record.target))) return;
      textMaskSource = null;
      textMaskSignature = "";
      refreshTargets();
      if (!activeTool) startLoop();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
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
    window.addEventListener("portfolio-scroll-frame", afterScrollFrame);
    window.addEventListener("portfolio-scroll-frame-stop", releaseScrollFrameDriver);
    document.documentElement.addEventListener("pointerleave", leaveWindow);
    document.documentElement.addEventListener("pointerenter", enterWindow);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("portfolio-theme-change", syncThemeColors);
    window.addEventListener("portfolio-hero-intro-complete", resumeAfterHeroIntro);
    window.addEventListener("portfolio-fluid-cursor-resync", resyncCursor);
    window.addEventListener("portfolio-calendar-cursor", calendarCursor);
    window.addEventListener("portfolio-calendar-geometry", calendarGeometry);
    window.addEventListener("portfolio-fluid-cursor-suspend", suspendFluidCursor);
    window.addEventListener("portfolio-fluid-cursor-resume", resumeFluidCursor);
    window.addEventListener("portfolio-stack-tool-enter", handleStackToolEnter);
    window.addEventListener("portfolio-stack-tool-leave", handleStackToolLeave);
    document.addEventListener("pointerover", handlePillPointerOver, { passive: true });
    document.addEventListener("pointerout", handlePillPointerOut, { passive: true });
    document.addEventListener("pointerdown", handlePillPointerDown, { passive: true });
    document.addEventListener("pointerup", releasePillPress, { passive: true });
    document.addEventListener("pointercancel", releasePillPress, { passive: true });

    return () => {
      observer.disconnect();
      nativePaintRuns.forEach((run) => run.removeAttribute("data-fluid-cursor-native-paint"));
      nativePaintRuns.clear();
      themeStylesObserver.disconnect();
      targetResizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measurementFrame);
      window.cancelAnimationFrame(toolCopyFrame);
      window.cancelAnimationFrame(toolEntryFrame);
      window.clearTimeout(scrollIdleTimer);
      window.clearTimeout(toolLeaveTimer);
      window.clearTimeout(pillLeaveTimer);
      window.clearTimeout(pillPressReleaseTimer);
      window.clearTimeout(toolCopyTimer);
      window.clearTimeout(toolEntryTimer);
      clearToolCursor();
      clearPillCursor();
      textMask.style.opacity = "0";
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("portfolio-scroll-frame", afterScrollFrame);
      window.removeEventListener("portfolio-scroll-frame-stop", releaseScrollFrameDriver);
      document.documentElement.removeEventListener("pointerleave", leaveWindow);
      document.documentElement.removeEventListener("pointerenter", enterWindow);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("portfolio-theme-change", syncThemeColors);
      window.removeEventListener("portfolio-hero-intro-complete", resumeAfterHeroIntro);
      window.removeEventListener("portfolio-fluid-cursor-resync", resyncCursor);
      window.removeEventListener("portfolio-calendar-cursor", calendarCursor);
      window.removeEventListener("portfolio-calendar-geometry", calendarGeometry);
      window.clearTimeout(calendarReturnTimer);
    window.removeEventListener("portfolio-fluid-cursor-suspend", suspendFluidCursor);
    window.removeEventListener("portfolio-fluid-cursor-resume", resumeFluidCursor);
      window.removeEventListener("portfolio-stack-tool-enter", handleStackToolEnter);
      window.removeEventListener("portfolio-stack-tool-leave", handleStackToolLeave);
      document.removeEventListener("pointerover", handlePillPointerOver);
      document.removeEventListener("pointerout", handlePillPointerOut);
      document.removeEventListener("pointerdown", handlePillPointerDown);
      document.removeEventListener("pointerup", releasePillPress);
      document.removeEventListener("pointercancel", releasePillPress);
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
