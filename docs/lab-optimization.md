# Lab optimization and calendar

## Shipped runtime changes

- Blinds use a reusable on-GPU render target and one full-canvas shader pass. No PNG encoding, canvas readback, Image.decode, SVG-mask RAF, or per-blind DOM writes.
- Incoming programs/textures/geometry are prepared before the transition clock starts. Neighbor preparation starts after the wipe completes, not in its middle.
- Three.js boots near the Lab, stops rendering offscreen/when the tab is hidden, and retains only the current/previous/next model. Discarded geometry, textures and decoded ImageBitmaps are released.
- Large static exports batch compatible opaque same-material meshes. Glass, mirrored meshes, skinned/morph geometry and authored animations are excluded. The original lighting, per-car material settings and cursor springs remain unchanged.
- The liquid cursor rejects buttons whose reveal is hidden, delayed, fading or blurred. Neutral targets no longer receive translation writes that overwrite layout centering.
- Sketch layers share one box; the dot background is centered. Memory hearts participate in the existing cursor negative-mask path.

## Lossless assets

`npm run models:compress` regenerates `public/models/optimized/` from the exact gallery list. It also runs before production builds. Keep the original source GLBs; they are not overwritten.

The generated copies use EXT_meshopt_compression with no quantization, decimation, material edits, texture changes or vertex/index reordering. Every compressed buffer view is decoded with the same decoder used in the browser and compared byte-for-byte before writing the output. The browser decodes on two workers.

Measured gallery total: **334.0 MiB -> 192.1 MiB, 42.5% smaller**. This is total gallery transfer if all cars are visited, not initial page weight. Only the current car and adjacent cars are requested/retained. Original source copies are still present under public, so deployment storage also includes those unused files.

`node scripts/audit-models.mjs` reports the current gallery, original/optimized size, source triangle counts, primitive counts and embedded-image sizes.

## Biggest remaining gains

| Asset | Original | Optimized | Source triangles | Next useful step |
| --- | ---: | ---: | ---: | --- |
| McLaren P1 | 67.2 MiB | 39.0 MiB | 877,268 | Lower-detail web export; weld/reuse duplicated vertices where visually safe |
| Mazda RX-Vision | 55.9 MiB | 30.2 MiB | 1,494,555 | Lower-poly version/LOD; this file has no embedded images to shrink |
| Battista | 53.8 MiB | 20.6 MiB | 696,803 | Lower-poly export, particularly detailed interior/hidden pieces |
| Type 57SC | 21.0 MiB | 10.8 MiB | 861,050 | Lower-poly version/LOD |
| Rolls-Royce | 25.5 MiB | 23.9 MiB | 78,762 | Resize/compress textures; embedded images account for 21.7 MiB |

Compression reduces transfer, not the number of triangles drawn. Lower-detail geometry would therefore provide the next major frame-time improvement. Make those changes per model and compare silhouettes, windows, paint and close-up detail before replacing anything. Texture atlasing and KTX2/BasisU are a separate useful pass for texture-heavy cars and require a matching decoder pipeline.

Relevant primary references: [meshopt glTF specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md), [Three.js renderer preparation APIs](https://threejs.org/docs/pages/WebGLRenderer.html).

## Calendar behavior

```text
Month --select date--> Collapsing --> Week --back/Escape--> Returning --> Month
  |
  +--choose month/year--> Picker
                          | Done: collapse, then reveal new month
                          | Cancel/Escape: return to previous view

Month or Week --plus--> Task morph --Done/X/Escape--> Previous view
                          |
                          +--time pill--> Time wheels --time pill--> Task morph
```

- Sunday-first complete weeks, actual local date, leap years and adjacent-month dates. The calendar is one quarter grid row taller (ends at H37.75 instead of H37.5), with smaller weekday labels, subdued weekends/outside-month dates, week dividers and 2.1rem date circles.
- Independent native scroll-snap month/year and hour/minute/AM-PM columns, keyboard arrows, focus trap/return and reduced-motion handling. Programmatic wheel movement does not overwrite its destination with intermediate scroll values.
- Date selection moves its week to the top; other weeks fade/blur in opposite directions. Hours scroll independently of Lenis.
- Task text/time, completion and deletion are stored in this browser's localStorage (`portfolio:calendar:tasks:v1`). No account, backend, reminders or device sync is implied. If storage is unavailable, tasks remain session-only with a notice.
- Month view intentionally hides tasks. The selected week is a navigation strip; its selected day's agenda uses the full schedule width, excluding the hour-label gutter. Tasks in the same hour divide that width equally. Completion uses circular controls; hover time uses the existing tool cursor morph in a compact pill.
- The month/year pill becomes the back-to-month control in week view. Only this pill, the plus circle and today use the neutral fluid renderer. Ordinary dates attract a circular orb using the existing cursor spring, without liquid rendering or resetting position/velocity. Date glyphs stay above the fluid fill rather than making duplicate glyph masks; weekday/hour labels and divider SVGs use the negative-mask renderer.
- Both overlays morph from their real trigger geometry and inherit its colour roles. The plus rotates to an X in place. Time is selected, never typed. The custom cursor paint is hidden while native pointer interaction is available; tracking and button settling continue. Closing fades/unblurs the orb at the current pointer coordinates.
- White card hover inversion is restored. Normal and inverted ink/control roles apply to every calendar state and all nine themes.
- The first cars are now LC500, Miura, Ferrari 250 GTO; credits and the attribution list follow that same order.

## Figtree rendering correction

The root stylesheet previously requested only Figtree weight 400, although the calendar header and Type Racer counter request 700 and car credits request 600. The stylesheet now requests the variable weight range 400-900, including the existing intermediate weights. Missing bold weights can otherwise be synthesized by the browser. This was a confirmed configuration error, not proof that every perceived soft edge has one cause.

The credits are deliberately low-contrast 12px text. Small, dim text has less apparent edge definition; active fade/blur transitions are intentionally soft until their final `filter: none` frame. Avoid permanent blur/scale on text, use actual font weights, and judge at native browser zoom. `-webkit-font-smoothing` is nonstandard and its supported platform behavior is not a universal Windows sharpening control.

Primary references: [Google Fonts weight ranges](https://developers.google.com/fonts/docs/css2#axis_ranges), [MDN bold synthesis](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-synthesis-weight), [MDN font smoothing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth).

## October 8 refinement

- Lab and tooltip copy now use the official locally bundled Figtree variable font, with its verified 300–900 weight axis and `font-synthesis: none`. Its OFL license is bundled alongside it. Site CTA button typography is deliberately unchanged: it requests weight 780, without text stroke or shadow. Allowing synthesis in CSS is not evidence that the browser actually synthesized a weight.
- Settled tooltip copy uses `filter: none` and no residual transform; its anchor is rounded to device pixels. Animated blur remains temporary. This reduces possible resampling, but does not promise identical font rasterization on every browser/GPU/zoom setting.
- Short reset/restart tooltips use compact geometry. Sketch adds a download control and exports the transparent drawing canvas as PNG; dotted backgrounds are CSS, so are not included.
- Calendar masks track the animated orb position/radius instead of the native pointer. Agenda mask activation tests orb-edge intersection, and the mask clone respects the agenda's top/bottom fading viewport. Scrollbar thumb/arrows participate in masking.
- Selected week movement uses a single `top` transition across the phase handoff. Picker label motion is measured only after the wheel's initial scroll position is applied. Cancel leaves the underlying month unchanged; a changed-but-cancelled draft reveals the original pill text rather than committing the draft.
- Today is the month-view default task date. Other selection outlines appear only in week view. Task dates have indicator dots. Hour dividers bisect the labels; 36px tasks fit between 44px rows with approximately 4px clearance on each side. Tasks animate from/to the left, and same-hour neighbors resize using measured FLIP animation.
- Every hour accepts at most four tasks (completed tasks still count). The Done button is disabled when full and rechecked against current saved tasks on submit. Checkmarks use Iconoir; delete controls are hover-only with keyboard/touch alternatives.
- LC500's yellow `TELA` material is changed to cream `#b5a18a`; the darker `CUERO` leather and all other car materials remain untouched.
- This refinement's checks: five calendar unit tests, TypeScript and scoped ESLint pass. Chrome checks confirmed local variable-font/no-synthesis computed styles, an unchanged grid during picker cancellation, ordinary dates excluded from liquid surfaces, four same-hour tasks, a disabled fifth submission, visible completion checkmarks, roughly 4px task/rule gaps, animated removal and the opaque week-to-month pill return. Temporary tasks named Calendar QA 1–4 were removed without touching existing tasks.
- PNG export was downloaded and decoded as 275×354 RGBA: its empty pixels have alpha 0, and the test stroke has alpha 255. The production build completed all 22 routes and static output preparation on retry after one transient prerender request failure. The built font/disabled synthesis and changed-draft cancellation were also verified in the production preview with no captured console errors.

## Validation

- Calendar unit tests cover Sunday-first grids for 2000-2040, leap days, date-key round trips, every minute's 12/24-hour wheel conversion and corrupt persisted records.
- Chrome production preview: all 15 compressed cars load, credits change in the expected order, reverse navigation and expanded view work; no captured browser errors.
- This iteration's browser checks: anchored month/year picker, task/time morph at desktop and 390px viewport, hour/minute keyboard changes, save, same-hour equal-width tasks, check, delete, week/month return, readable today glyph and native-cursor overlay states. All nine neutral theme roles were inspected; Violet's white-hover/inverted state was visually inspected. Temporary tasks created for this iteration were removed without changing existing records.
- Final production checks also selected February 2028, confirmed February 29, reopened the picker with its choices intact, then restored October 2026. TypeScript, scoped ESLint, all four calendar tests and the full production build pass. The final card preview is saved as `calendar-preview.jpg` beside this document.
- There is no cross-device zero-lag guarantee: driver/GPU, memory, download speed and the large source geometry still matter. Dev transition-frame diagnostics are observational only, not a controlled benchmark.
