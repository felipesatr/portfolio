# Progressed homepage documentation

This folder records the first correction pass after the immutable V0 baseline. It is intentionally separate from `docs/process/v0`.

## Recorded states

1. `01-home-desktop-1440.png` — corrected desktop hero and fixed left rail.
2. `02-work-anchor-active-1440.png` — `#selected-work` destination with doubled active label and active-only bullet.
3. `03-skills-anchor-scroll-top-1440.png` — deeper homepage anchor with the return-to-top control available.
4. `04-home-tablet-768.png` — tablet header and horizontally scrollable homepage index.
5. `05-home-mobile-375.png` — mobile hero with page-level horizontal overflow removed.
6. `06-engineers-contrast-theme-1440.png` — audience-specific headline and the fifth theme selected through the keyboard-operable range control.
7. `07-home-density-motion-pass-1280.png` — full-page record after the homepage density and interaction correction pass.
8. `08-project-filters-production-1280.png` — superseded intermediate state: the former moving filter rows with Production selected.
9. `09-reference-carousel-dragged-1280.png` — reference carousel after arrow navigation and pointer dragging.
10. `10-compact-skills-stack-1280.png` — compact six-card skills and technology stack.
11. `11-interaction-lab-two-one-1280.png` — two-card first row of the revised Interaction Lab layout; the full-width third card is preserved in the full-page record.
12. `12-koenigsegg-reveal-centered-nav-1280.png` — completed hero reveal state with the desktop rail index vertically centered.
13. `13-billy-inspired-theme-slider-expanded-1280.png` — expanded five-step vertical theme range adapted from the observed Billy Sweeney interaction model.
14. `14-project-marquee-static-filters-1280.png` — static 3×2 filter controls above two clipped, opposing project tracks with three cards visible per row.
15. `15-unified-homepage-spacing-1280.png` — upper homepage section boundaries after consolidating the padding rhythm.
16. `16-draggable-project-loop-after-release-1280.png` — project rows after a horizontal drag, with automatic movement resumed.
17. `17-unified-lower-section-spacing-1280.png` — Making Of and Contact boundary using the same shared section inset.

## Verification completed

- Homepage index URLs remain hash destinations such as `#selected-work`, `#skills`, and `#contact`.
- Selecting `#hero` returns the document to `scrollY: 0`.
- The scroll-to-top control returns the document to `scrollY: 0` and restores the Home active state.
- At 1440px, the 1220px page surface is centered against the full viewport while the 220px rail remains pinned to the left edge.
- Inactive rail markers resolve to zero width and zero opacity; only the active marker is visible.
- Active desktop index text resolves to 21.6px versus 11.84px for inactive items.
- No page-level horizontal overflow was detected at 375px, 768px, 1024px, or 1440px.
- The five-step theme range responds to arrow keys, Home, and End; assistive text updates with the selected theme.
- Client-side navigation to About replaces the homepage cleanly and switches the rail back to global navigation.
- The production build emits the correct prerendered HTML for `/` and `/about`.
- Browser console verification returned no warnings or errors during the tested homepage interactions.
- The hero and Selected Work sections meet with no artificial layout gap; the hero headline resolves to 78.72px at the recorded 1280px viewport.
- Project filters render as a static three-column by two-row control group.
- The project cards—not the filters—form two opposing clipped tracks with three cards fitting the desktop viewport per row.
- Both rows move at a consistent 36 pixels per second, can be scrubbed horizontally by dragging, pause only during the active drag, and resume immediately after release. Hover and keyboard focus no longer stop them.
- The browser pauses the transform animations when the rows are off-screen or the document is hidden.
- Marquee copies are hidden from assistive technology and removed from the keyboard tab order; reduced-motion mode removes the copies and the continuous movement.
- Selecting Production reduces the visible project result from nine cards to two; returning to All restores all nine.
- The compact skills panel contains six clearly numbered groups and 29 individual skill labels, with developing skills visually separated.
- The Interaction Lab resolves to two equal cards on its first desktop row and one full-width card on its second row.
- The reference carousel contains nine unpublished placeholders and fits three cards within its desktop track.
- Reference arrow navigation moved the track by one visible page, and pointer dragging advanced it independently.
- The current desktop verification detected no page-level horizontal overflow.
- The heading reveal uses authored line masks, a 110% vertical start, a 600ms strong ease-out, and a 50ms line stagger based on the observed Koenigsegg About behavior.
- Supporting text enters from 20px to the right over 620ms. Semantic paragraph blocks are animated instead of splitting every rendered line at runtime, avoiding resize and hydration fragility.
- Reduced-motion CSS resolves all reveals immediately and removes the project loops instead of merely shortening their duration.
- The desktop navigation stayed on the clicked destination throughout smooth-scroll sampling; no temporary restoration of the previously active item was observed.
- The expanded theme control is a real five-step range rotated into a vertical pill. Keyboard testing confirmed End selects Contrast and Home returns to Neutral light.
- Projects, Skills, Lab, Experience, References, Making Of, and Contact resolve to the same 60px top and bottom padding at the recorded desktop viewport. The Hero shares the 60px top inset and keeps its approved zero-bottom exception.

## Local preview note

Vite Preview falls back to the root `index.html` when a nested route is typed directly, even though the build contains correct files such as `build/client/about/index.html`. Client-side navigation works correctly. Production hosting must be configured to serve each prerendered directory's `index.html` for direct nested-route requests.
