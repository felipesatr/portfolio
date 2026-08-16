# GSAP motion guide for the portfolio

Research date: 2026-08-16
Status: strategy and implementation reference; GSAP is not yet installed in the portfolio.

## Executive recommendation

GSAP should be introduced only when an interaction needs coordinated sequencing, runtime control, scroll-linked progress, reusable timelines, or animation beyond normal DOM transitions. It should not replace the CSS already handling simple hover states, the loading screen, theme-control transitions, or the slow project-filter rows.

For this portfolio, the strongest first GSAP use would be one restrained, well-documented interaction in the Interaction Lab or a carefully staged project reveal. That demonstrates modern front-end skill without making the portfolio feel like an animation demo reel.

The practical hierarchy is:

1. Use CSS transitions and keyframes for simple, self-contained visual states.
2. Use GSAP for coordinated sequences, reversible interactions, scroll-linked timelines, SVG work, or high-frequency input that needs optimized setters.
3. Use Canvas or WebGL only when the visual genuinely involves many continuously changing pixels or shader effects, and isolate it from critical content.

The most important conclusion from the research is that animation smoothness is usually constrained by browser rendering work rather than the animation library. GSAP can schedule and interpolate efficiently, but it cannot make an expensive blur, large SVG repaint, oversized shader, or layout-heavy property inexpensive. This is the central point in the [GSAP forum performance discussion](https://gsap.com/community/forums/topic/32460-best-practices-for-the-smoothest-experience/) and is consistent with [MDN's animation performance guide](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate).

## What each supplied source contributes

### GSAP forum: smoothest-experience discussion

The accepted answer gives a useful rendering-first checklist:

- Avoid costly visual filters, particularly over large areas and in Safari.
- Keep the number of changing pixels as small as possible.
- Large SVG animation can be expensive even when the file size is small.
- Prefer transforms to properties such as `width`, `height`, `top`, and `left` that trigger layout.
- Use GSAP transform properties such as `x`, `y`, `scale`, and `rotation` rather than repeatedly parsing a complete transform string.
- Stop animations when they are completely outside the viewport.
- Do not let CSS transitions and GSAP compete over the same properties.
- Consider Canvas/WebGL when the browser is being asked to redraw a very large or complex scene.
- Treat `will-change` as a selective optimization for genuinely heavy elements, not a universal rule.

The advice is from 2022 and is a forum response rather than a benchmark, but its main recommendations still agree with current GSAP documentation and browser-rendering guidance.

### CSS-Tricks: efficient animation code

The [CSS-Tricks guide](https://css-tricks.com/tips-for-writing-animation-code-efficiently/) focuses more on maintainable animation architecture than raw frame rate. Its most durable recommendations are:

- Use timelines instead of manually adding unrelated delays.
- Use relative values and relative timeline positions where appropriate.
- Use keyframes when one target moves through several states.
- Put repeated duration and easing values into timeline defaults.
- Animate groups with shared tweens, function-based values, or staggers.
- Turn repeated animation patterns into functions, nested timelines, or registered effects.
- Create an animation once and control it with `play()`, `pause()`, `reverse()`, `seek()`, or `progress()` instead of continually creating replacements.
- Use ScrollTrigger rather than writing a custom unthrottled scroll listener.

This is particularly relevant to employability: maintainable animation code communicates stronger engineering judgment than a large number of disconnected effects.

### 21st.dev WebGL shader

The [21st.dev WebGL Shader component](https://21st.dev/@designali-in/components/web-gl-shader) is a fullscreen colorful wave-distortion background built with the `three` package. It is not itself a reason to add GSAP. GSAP could animate its shader uniforms, transitions, or entry/exit states, while Three.js performs the rendering.

What to learn from it:

- WebGL is suitable for a deliberately immersive visual, not normal interface movement.
- The effect should be treated as its own optional component with a static fallback.
- It should be lazy-loaded after user intent or inside the Lab rather than included in the critical homepage bundle.
- The implementation must be tested for GPU usage, battery impact, resize behavior, mobile thermals, and loss of the WebGL context.
- The copied component should be audited rather than accepted as production-ready because 21st.dev is a community component library, not canonical GSAP or Three.js documentation.

### GSAPify

[GSAPify](https://gsapify.com/gsap-animations/) is useful as an inspiration catalogue for text reveals, scrambles, SVG effects, parallax, magnetic controls, and ScrollTrigger patterns. It should be treated like a mood board and code sketchbook.

Do not treat copied animation-generator output as the final architecture. Check selector scope, cleanup, accessibility, responsiveness, plugin registration, bundle cost, and whether the effect still communicates something useful when the novelty is removed.

## When GSAP is the right tool

Use GSAP when one or more of these are true:

- Several elements need to move in a coordinated sequence.
- The sequence must be paused, reversed, scrubbed, replayed, or changed at runtime.
- Animation timing should be expressed relative to other steps.
- The same motion pattern needs to be reused with different targets or settings.
- Scroll position must drive a timeline or pin a scene.
- Pointer movement needs smooth interpolation without creating a new tween for every event.
- SVG paths, morphing, drawing, motion paths, drag inertia, Canvas, Three.js objects, or shader uniforms are involved.
- The interaction is complicated enough that future edits would be error-prone in unrelated CSS delays.

Keep CSS when the requirement is only:

- A hover or focus color change.
- A button press or selected-state transition.
- A simple opacity/transform reveal.
- A small looping marquee with no timeline coordination.
- A one-element loading treatment.
- A motion treatment that must work before React hydrates.

## Performance rules

### 1. Animate composition-friendly properties first

Prefer:

- `x`, `y`, `xPercent`, and `yPercent`
- `scale`, `scaleX`, and `scaleY`
- `rotation`
- `opacity`

Be careful with:

- `width`, `height`, `top`, `left`, margins, and font size
- large `filter`, `blur`, `backdrop-filter`, and shadow changes
- large clip-path or mask animations
- very large SVGs and full-viewport repaints

MDN explains that geometry-changing properties can cause style calculation, layout, and paint, while `transform` and `opacity` can often be handled during composition. This is a priority order, not a guarantee: a huge transformed element can still be expensive.

### 2. Reduce the animated area

A small accent moving over a static layout is usually safer than animating an entire fullscreen surface. Apply large background effects only where they materially improve the experience.

### 3. Do not run invisible work

Pause or remove timelines when their section is outside the viewport. ScrollTrigger is designed to calculate trigger positions and synchronize updates with the animation frame rather than continuously measuring every element. See the [official ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

### 4. Avoid ownership conflicts

One system should own each animated property. Do not apply a CSS transition to `transform` while GSAP is also animating that element's transform. CSS may still own unrelated properties.

### 5. Use `will-change` carefully

`will-change: transform` can help a genuinely difficult element, but applying it permanently to dozens of elements can increase memory use and layer-management costs. Add it shortly before a demanding animation and remove it after, or verify that a permanent layer provides a real measured improvement.

### 6. Optimize high-frequency input only when necessary

For pointer-following or continually updated values:

- Use `gsap.quickTo()` when each new input should smoothly redirect an existing tween.
- Use `gsap.quickSetter()` when the value should be applied immediately.
- Clamp or snap inputs with `gsap.utils` before applying them.

The [official `quickSetter()` documentation](https://gsap.com/docs/v3/GSAP/gsap.quickSetter%28%29/) reports substantial gains in the specific case of repeatedly setting the same property, while also warning that ordinary `gsap.set()` is appropriate for normal use. The [`quickTo()` documentation](https://gsap.com/docs/v3/GSAP/gsap.quickTo%28%29/) covers the animated equivalent.

### 7. Do not mistake lower frame rate for optimization

`gsap.ticker.fps(30)` deliberately skips updates; it does not make an expensive scene efficient. Fix rendering cost first. GSAP's ticker already uses `requestAnimationFrame`, and its default lag smoothing is intended to prevent large timing jumps. See the [official ticker documentation](https://gsap.com/docs/v3/GSAP/gsap.ticker/).

### 8. Measure instead of guessing

Test at minimum:

- Chrome and Safari/WebKit
- A mid-range or low-powered mobile device
- CPU throttling in browser performance tools
- reduced-motion mode
- narrow and wide viewports
- rapid route changes and component unmounting
- background-tab and return behavior

Record frame drops, long tasks, layout shifts, memory growth, and visual regressions. Remove effects that cannot meet the performance budget.

## Motion-design rules

- Motion must clarify hierarchy, continuity, feedback, or cause and effect.
- Entrances usually benefit from an ease-out; exits usually benefit from an ease-in.
- Use linear motion for continuous mechanical movement such as a marquee, not for most entrances.
- Larger travel distances generally need more time than small movements.
- Staggers should reveal structure, not make visitors wait for content.
- Keep routine interface feedback fast; reserve longer sequences for deliberate storytelling.
- Avoid animating every heading, card, and paragraph in exactly the same way.
- Never delay access to essential navigation or content for an ornamental animation.
- The final state must remain understandable if animation is disabled.

## Efficient GSAP architecture

### Use timelines for sequences

```ts
const intro = gsap.timeline({
  defaults: { duration: 0.6, ease: "power3.out" },
});

intro
  .from("[data-intro='audience']", { y: 12, opacity: 0 })
  .from("[data-intro='headline']", { y: 28, opacity: 0 }, "-=0.35")
  .from("[data-intro='support']", { y: 16, opacity: 0 }, "-=0.3")
  .from("[data-intro='actions']", { y: 12, opacity: 0 }, "-=0.25");
```

Relative position parameters keep the overlap readable. If a duration changes, the rest of the sequence still adapts.

### Return modular timelines

```ts
function createCardReveal(targets: Element[]) {
  return gsap.from(targets, {
    y: 24,
    opacity: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: "power2.out",
  });
}
```

Small animation-building functions can be inserted into a larger timeline and tested separately. Prefer parameters over duplicated selectors and timing values.

### Reuse interactive tweens

```ts
const xTo = gsap.quickTo(cursor, "x", {
  duration: 0.3,
  ease: "power3.out",
});

const yTo = gsap.quickTo(cursor, "y", {
  duration: 0.3,
  ease: "power3.out",
});

function handlePointerMove(event: PointerEvent) {
  xTo(event.clientX);
  yTo(event.clientY);
}
```

This redirects reusable tweens instead of allocating a new tween on every pointer event.

## React and TypeScript practices

When GSAP is eventually added:

```sh
npm install gsap @gsap/react
```

Register plugins once in a client-safe module:

```ts
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);
```

The official [React and GSAP guide](https://gsap.com/resources/React/) recommends `useGSAP()` because it scopes selectors and automatically reverts the GSAP objects created by the hook. Cleanup matters in React development because Strict Mode can run effects more than once.

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

export function AnimatedSection() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: "power2.out",
      });
    },
    { scope: section },
  );

  return <section ref={section}>{/* content */}</section>;
}
```

Additional rules:

- Store element references and timeline instances in refs, not React state.
- Scope selector strings to the component root.
- Use `revertOnUpdate: true` when dependency changes should rebuild and revert the animation.
- Clean up manually added event listeners and ticker callbacks.
- Do not read `window` or construct animations during static prerendering.
- Dynamically import optional Lab experiments so they do not increase the critical homepage bundle.
- Register imported plugins so bundlers do not remove them during tree-shaking.

## Responsive and accessible motion

Use [`gsap.matchMedia()`](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) to define desktop, mobile, and reduced-motion behavior in one lifecycle-aware place. It automatically records and reverts animations when conditions stop matching.

```ts
useGSAP(
  () => {
    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 800px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { desktop, reduceMotion } = context.conditions as {
          desktop: boolean;
          reduceMotion: boolean;
        };

        if (reduceMotion) {
          gsap.set("[data-reveal]", { clearProps: "all" });
          return;
        }

        gsap.from("[data-reveal]", {
          y: desktop ? 28 : 14,
          opacity: 0,
          duration: desktop ? 0.65 : 0.4,
          stagger: desktop ? 0.08 : 0.04,
        });
      },
    );

    return () => media.revert();
  },
  { scope: section },
);
```

Reduced motion does not always mean replacing a two-second pan with a 0.01-millisecond pan. Large panning and scaling can still be vestibular triggers. Prefer removing movement, using a gentle opacity change, or showing the final state immediately. The [`prefers-reduced-motion` reference on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) explains that the preference is intended to remove, reduce, or replace non-essential motion.

Accessibility requirements:

- Never animate focus away from the active control.
- Do not reorder reading or keyboard order to match a visual animation.
- Keep live text readable to assistive technology; do not make character splitting the only accessible content.
- Provide pause controls for long-running motion when appropriate.
- Stop decorative pointer effects for touch input and reduced-motion users.
- Preserve usable content when JavaScript fails.

## ScrollTrigger rules

- Start with normal document flow. Add pinning only when it improves understanding.
- Use development markers while tuning trigger positions, then remove them.
- Create ScrollTriggers in page order when pinning changes later measurements.
- Do not animate the same element used for pin measurements; pin or trigger a wrapper and animate a child.
- Avoid transforms and unnecessary `will-change` on ancestors of pinned elements because they can disrupt fixed-position behavior.
- Do not combine GSAP ScrollTo animation with `scroll-behavior: smooth`; the [ScrollTo documentation](https://gsap.com/docs/v3/Plugins/ScrollToPlugin/) warns that they conflict.
- Recalculate only when layout really changes; do not call `ScrollTrigger.refresh()` continuously.
- Avoid scroll-jacking. Scrubbing an animation should not make basic page navigation feel delayed or detached from input.

## WebGL and shader strategy

The shader example is best treated as an Interaction Lab experiment:

1. Render a static poster initially.
2. Offer an explicit “Run experiment” control.
3. Dynamically import Three.js and the shader component.
4. Pause rendering when offscreen or when the tab is hidden.
5. Reduce resolution or pixel ratio on small/low-powered devices.
6. Disable or replace the effect for reduced motion.
7. Provide a stop/reset control.
8. Measure GPU and CPU use before placing it anywhere outside the Lab.

GSAP can tween numeric uniforms:

```ts
gsap.to(material.uniforms.uIntensity, {
  value: 0.7,
  duration: 1.2,
  ease: "sine.inOut",
});
```

This division of responsibility is useful: Three.js renders the shader; GSAP controls timing and state transitions.

## Promising ideas for this portfolio

### Strong candidates

1. **Loader-to-hero handoff** — a sub-one-second logo or wordmark reveal that flows directly into the hero rather than blocking it.
2. **Project-grid entrance** — restrained opacity, clip, and vertical movement with a short stagger when Selected Work first enters the viewport.
3. **Audience-headline transition** — a reversible line or word transition when the audience selector changes, while the real heading remains semantically correct.
4. **Making-of progress sequence** — animate Strategy → Figma → Code as the visitor reads the portfolio case study.
5. **SVG wordmark experiment** — DrawSVG, MorphSVG, or a custom timeline in the Lab, with a static logo outside it.
6. **One magnetic CTA experiment** — use `quickTo()` with a small movement limit and an immediate reduced-motion fallback.
7. **Project interaction breakdown** — a controlled timeline that replays a component's states and allows pause, reverse, or scrubbing.
8. **Motion-path navigation study** — animate a small object along an SVG path to demonstrate coordinate systems and responsive motion.
9. **Optional WebGL shader** — user-started, lazy-loaded, and isolated inside the Lab.

### Use sparingly

- Short text reveals on major headings.
- Project image parallax with a very small movement range.
- Scroll-linked progress indicators.
- Draggable cards with inertia when dragging is the subject of the experiment.
- Cursor treatments limited to one relevant region.

### Avoid on the main portfolio

- Full-page smooth scrolling added only for style.
- Permanent mouse followers across the entire site.
- Large animated blur or backdrop-filter layers.
- Continuous full-screen WebGL behind normal reading content.
- Character-by-character animation on long paragraphs.
- Pinning several consecutive sections.
- Animations that hide projects until the visitor scrolls at the expected speed.
- Multiple systems animating the same property.
- Copy-pasted effects whose code cannot be explained in a case study or interview.

## Suggested learning sequence

1. Learn `gsap.to()`, `from()`, `fromTo()`, `set()`, easing, and transform shortcuts.
2. Learn timelines, defaults, labels, and the position parameter.
3. Build reusable animation functions and nested timelines.
4. Learn `useGSAP()`, scoping, cleanup, and React Strict Mode behavior.
5. Learn `gsap.matchMedia()` and reduced-motion alternatives.
6. Learn ScrollTrigger without pinning; then add scrub and pin only after the fundamentals work.
7. Learn `quickTo()`, `quickSetter()`, and GSAP utilities for pointer-driven interactions.
8. Explore SVG plugins and Draggable in the Interaction Lab.
9. Learn Three.js/WebGL separately before combining shader rendering with GSAP-controlled uniforms.
10. Profile every substantial effect and document the tradeoffs.

## Review checklist before shipping an animation

### Purpose

- [ ] The animation communicates hierarchy, feedback, continuity, or a deliberate piece of storytelling.
- [ ] Removing it would reduce something more than novelty.
- [ ] Essential content and navigation do not wait for it.

### Engineering

- [ ] CSS was considered first for simple states.
- [ ] Repeated sequences use a timeline or reusable function.
- [ ] React animations are scoped and cleaned up.
- [ ] Plugins are imported and registered explicitly.
- [ ] No CSS transition competes with GSAP over the same property.
- [ ] Offscreen or unmounted animations stop running.

### Performance

- [ ] Transform and opacity were preferred where practical.
- [ ] The animated pixel area is limited.
- [ ] Filters, masks, large SVGs, and shadows were profiled.
- [ ] `will-change` is justified by measurement.
- [ ] Desktop Chrome, Safari/WebKit, and a real mobile device were checked.
- [ ] No new layout shift, long task, or persistent memory growth was introduced.

### Accessibility

- [ ] Reduced motion has a designed alternative.
- [ ] Keyboard order and focus remain correct.
- [ ] Text remains available to assistive technology.
- [ ] Long-running or interactive motion can be paused or stopped where necessary.
- [ ] The no-JavaScript state remains usable.

### Portfolio value

- [ ] The implementation can be explained clearly in an interview.
- [ ] The case study documents why GSAP was chosen over CSS.
- [ ] The final result reinforces design judgment rather than distracting from the work.

## Source quality and reading list

Highest-authority implementation references:

- [GSAP core documentation](https://gsap.com/docs/v3/GSAP/)
- [GSAP React guide](https://gsap.com/resources/React/)
- [GSAP Timeline documentation](https://gsap.com/docs/v3/GSAP/Timeline/)
- [GSAP ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP `matchMedia()` documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)
- [GSAP `quickSetter()` documentation](https://gsap.com/docs/v3/GSAP/gsap.quickSetter%28%29/)
- [GSAP `quickTo()` documentation](https://gsap.com/docs/v3/GSAP/gsap.quickTo%28%29/)
- [MDN animation performance guide](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)

Useful secondary guidance and inspiration:

- [GSAP forum: best practices for the smoothest experience](https://gsap.com/community/forums/topic/32460-best-practices-for-the-smoothest-experience/)
- [CSS-Tricks: tips for writing animation code efficiently](https://css-tricks.com/tips-for-writing-animation-code-efficiently/)
- [21st.dev WebGL Shader component](https://21st.dev/@designali-in/components/web-gl-shader)
- [GSAPify animation examples](https://gsapify.com/gsap-animations/)

The official GSAP and MDN pages should win whenever a community example conflicts with them.
