# Progressed portfolio change brief

Recorded on 2026-08-15 before implementation. The V0 baseline must be committed and uploaded before any of these interface changes are made.

## Version-control rule

- Use `https://github.com/felipesatr/portfolio.git` as the project repository.
- Upload the documented V0 baseline before changing the interface.
- After that baseline upload, do not push, sync, or otherwise update GitHub unless the user explicitly asks for another GitHub update.
- Continue making and testing later changes locally between explicitly approved pushes.

## Left navigation rail and provisional wordmark

- Remove the `Webapp Designer & Front-End Developer` subtitle beneath the provisional `JS` wordmark in the desktop rail.
- Align the wordmark horizontally with the other starting elements in the rail so its left edge follows the same internal alignment as navigation and controls.
- Replace the short dash used as the navigation marker with a bullet point.
- When a navigation item is active, animate it to a subtly larger text size without causing a disruptive layout shift.
- Keep the rail and main page on the same background color.
- Replace the hard full-height separator with a vertical line that fades at the top and bottom, preserving separation while making the two areas feel connected.

## Theme control and time information

- Replace the current row of five swatches with a circular theme control positioned at the bottom-left of the desktop rail.
- Make the control draggable/slideable in the spirit of Billy Sweeney's portfolio theme selector.
- Keep the five existing visual themes for this version.
- The control must remain keyboard-operable and expose the selected theme to assistive technology.
- Show time information at the bottom-right of the rail.
- Compare the visitor's local time with Colombia time using the `America/Bogota` time zone.
- If the visitor is already in Colombia's time zone, show only one time rather than duplicating the same hour.
- Determine the visitor time zone through the browser's internationalization APIs; do not request precise location permission.
- Research live examples before finalizing the clock labels and visual treatment.

## Scroll behavior

- After the user scrolls beyond the hero, reveal a circular scroll-to-top control on the right side of the page.
- Match the theme control's circle size and its distance from the viewport edge, mirrored on the opposite side.
- The scroll-to-top control must work with mouse, touch, and keyboard.
- Respect reduced-motion preferences when scrolling to the top.
- Fix the current homepage anchor behavior so selecting a homepage section never prevents the user from scrolling above that section afterward.

## Hero audience selector

- Remove the `Webapp Designer & Front-End Developer` eyebrow/subtitle above the main hero headline.
- Put the audience choices in that position above the large headline, following the compact inline pattern shown in the Billy Sweeney reference.
- Preserve the current audience categories unless later copy review changes them: Anyone, Recruiters, Design Directors, Engineers, and Project Leads.
- Change the main bold hero headline when the selected audience changes.
- Keep the rest of the homepage unchanged when the audience changes.
- Remove the existing separate audience section below the hero primary content.
- Do not duplicate audience-specific text in a second block.
- Give the selected audience a clear visual state and expose selection through `aria-pressed` or equivalent accessible semantics.

## Hero abstract visual

- The current overlapping circle, plane, and label are a neutral placeholder representing the relationship between content, interface design, and code.
- It currently balances the hero composition but does not prove a skill or communicate a concrete project.
- Do not remove it merely because it was questioned; retain it for this change pass unless a better purposeful visual is developed or the user explicitly chooses removal.

## Documentation and verification

- Preserve the existing V0 screenshots as an immutable baseline.
- After implementation, create a separate progressed-version screenshot set rather than overwriting V0 documentation.
- Verify desktop, tablet, and mobile behavior.
- Verify all routes, audience states, five themes, drag/keyboard theme selection, local/Colombia clock logic, homepage anchors, scroll-to-top behavior, focus states, and reduced-motion behavior.
- Do not invent portfolio evidence, metrics, personal details, locations, or professional claims while implementing these interface changes.

## Correction pass recorded on 2026-08-15

- Remove the abstract `Content / UI / Code` block from the hero because it adds visual clutter without providing evidence.
- Make the homepage rail a true in-page index: every homepage section link must use a `#` anchor instead of replacing the homepage with a custom route.
- Keep separate global route navigation available on non-homepage pages.
- Move the provisional `JS` wordmark to a clearer top-left position, farther from the faded separator.
- Align the first homepage index item vertically with the hero audience selector row.
- Pin the desktop rail to the far-left edge of the viewport.
- Remove all outer frame borders; retain only the rail's faded separator.
- Keep the main page block at its established content width while centering that block against the complete viewport rather than the space remaining after the rail.
- Make the active rail item approximately twice the text size of inactive items.
- Hide bullets on inactive rail items. Reveal the bullet only for the active item and let its appearance push the active label to the right.

## Homepage density and interaction pass recorded on 2026-08-16

- Increase the hero headline size while preserving its responsive fit and audience-dependent copy.
- Remove the artificial empty area below the hero so Selected Work follows the actual hero content.
- Arrange the six project filters as two rows of three.
- Move the first filter row slowly to the left and the second slowly to the right; pause both rows on hover or keyboard focus and clip them at their row boundaries.
- Disable the looping filter motion when the visitor prefers reduced motion.
- Make the skills and technology stack more compact and visual without changing or overstating the skill content.
- Arrange the Interaction Lab as two cards on the first row and one full-width card on the second row on larger screens.
- Replace the reference composition with one horizontal carousel containing nine unpublished placeholders.
- Show three reference cards at a time on desktop, with circular previous/next controls and pointer dragging; adapt the visible count for smaller screens.
- Do not change any other homepage content or behavior during this pass.

## Motion, navigation, theme, and project correction pass recorded on 2026-08-16

- Use the local GSAP motion research guide as the standard for performance, accessibility, cleanup, and deciding when GSAP is warranted.
- Reproduce the observed Koenigsegg About title reveal: authored title lines rise from below their clipping masks with opacity, a strong ease-out curve, and a short line stagger.
- Reproduce the observed Koenigsegg supporting-text reveal while optimizing it for this portfolio: move semantic text blocks in from 20 pixels to the right rather than splitting every rendered line at runtime.
- Keep the reveal one-shot, viewport-triggered, transform-and-opacity based, and immediately resolved for reduced-motion visitors.
- Center the desktop rail navigation vertically.
- Prevent smooth-scroll observer updates from temporarily restoring the previously active rail item after a new item is clicked.
- Replace the small horizontal theme dial with a Billy Sweeney-inspired expanding vertical range control while retaining the portfolio's five existing themes and full keyboard operation.
- Keep the six project filter categories static in a three-column by two-row arrangement.
- Move the opposing horizontal motion to the project cards: three cards visible per row and two rows visible on desktop, with the first row moving left and the second moving right.
- Run the project motion moderately faster than the previous 72-second filter motion, pause it on hover or keyboard focus, clip cards at the section boundary, avoid duplicate focus targets, and disable it for reduced motion.

## Spacing and draggable-loop correction pass recorded on 2026-08-16

- Consolidate the homepage sections onto one shared horizontal inset and one 3.75rem vertical padding rhythm.
- Preserve the hero's intentionally removed bottom padding so Selected Work does not regain an artificial empty gap.
- Slow the title reveal from 480ms to 600ms and supporting-text movement from 460ms to 620ms while retaining the same strong ease-out and reduced-motion resolution.
- Replace the CSS-only project loops with browser-driven transform animations that can be scrubbed horizontally by pointer dragging.
- Pause a row only during the active drag, then resume its continuous movement immediately on release; hovering, focusing, or completing a drag must not permanently stop the loop.
- Prevent a drag gesture from accidentally opening a project while allowing the next deliberate click to work normally.
- Pause off-screen rows and rows in a hidden browser tab, and disable the continuous movement on small screens or when reduced motion is requested.
- Record new screenshots after verification and upload this progressed version to the approved GitHub repository.

## Fluid-pointer interaction — first version implemented

- Add a circular pointer follower with restrained spring lag and velocity-based stretch, using Cappen, Étoile Lumière, Ryan Ritzenthaler, and Jenn C. S. Rubin as motion references.
- Treat the later liquid interaction between the follower and buttons as a separate experiment, informed by Matt Ahrens rather than coupled to the first pointer-following version.
- Use a lightweight DOM element and native request-animation-frame interpolation for this first version. Consider GSAP `quickTo()` only when native interpolation becomes difficult to maintain; use Canvas or WebGL only if actual liquid merging or shader distortion requires per-pixel rendering.
- Disable the decorative follower for touch input and reduced-motion visitors, preserve the normal system pointer, and ensure it never blocks clicking, selecting text, or keyboard focus.
- Pause updates when the page is hidden and measure CPU/GPU cost before allowing the effect outside the Interaction Lab.

## Homepage preview and Work index pass recorded on 2026-08-18

- Remove pointer-dragging from the homepage project marquee while retaining the existing hover pause and directional hover scrub.
- Bound the desktop marquee between the midpoint of V1–V2 and the midpoint of V11–V12, with blurred edge masks instead of hard clipping.
- Open a homepage project as a reversible preview expansion from its exact source card into a viewport-fixed V1–V12 panel.
- Freeze the marquee while the preview is open, return focus to the source card after closing, support Escape and keyboard focus containment, and restore page scrolling after the closing compression completes.
- Add a View all projects action below the homepage marquee.
- Move filtering to `/work` and lay out all matching projects in a dense, varied 12-column grid that resolves to six columns and then one column at smaller breakpoints.
- Make the homepage Work rail item a React Router link to `/work`; keep the persistent rail and route-level soft reveal so the page changes without a full document reload.
- Keep the system pointer and add the decorative fluid follower only for precise pointing devices without a reduced-motion preference.

## Services, grid, editorial work, and content pass recorded on 2026-08-18

- Replace the marquee's visible edge cut with a stronger combined blur and alpha fade; retain a readable central region.
- Remove the rail clock. Keep the sun control permanently available, make it smaller, and place a circular layout-grid toggle immediately to its right.
- Keep the grid off by default. Reveal vertical lines from top to bottom in left-to-right sequence, then horizontal lines from left to right in top-to-bottom sequence; unblur the grid labels as part of the reveal.
- Keep circular email and LinkedIn access at the bottom-left of the rail while real URLs remain clearly marked as placeholders.
- Center the View all projects action.
- Use the same page background across all homepage sections for this version.
- Replace the generic skills matrix with a What I do section containing three visual service areas and honest skill/tool tags.
- Scope AI as supervised research, content, prototyping, documentation, and repetitive-workflow assistance; do not imply machine-learning engineering, autonomous decision-making, or unverified expertise.
- Recompose Interaction Lab as an exact 2-by-2 structure: title/action in the first cell and three equal experiment cells, with no subtitle.
- Recompose Experience as an equal split: title, CV action, and current Bogota time on the left; a central line and one dot per experience; experience summaries on the right.
- Show exactly three static colleague references and replace the descriptive subtitle with a See more kind words action.
- Delay marquee autoplay until the project preview has fully compressed and its shadow has resolved.
- Make the project preview an editorial, vertically scrollable story with Context, Contribution, Process, and Outcome explanations interleaved with image placeholders.
- Make `/work` a persistent-rail visual index with a prominent page title, compact filters, varied card sizes, and always-visible project titles and tags.
- Add `/services` as a persistent-rail What I do page. Each service opens from its source card into a reversible full-panel detail view with deliverables, tools, scope boundaries, contact action, Escape support, focus containment, and focus restoration.
- Apply the authored-line title reveal and staggered text reveal to route headers, and apply the soft unblur treatment to other entering elements, including rail items and the new section content.
- Keep Privacy, Legal, analytics, newsletter, chatbot, and cookie-consent work out of V0 until the actual data collection and third-party services are known.

## Work gallery, type system, navigation, and policy pass recorded on 2026-08-19

- Replace the `/work` tetris grid with an editorial two-speed gallery: larger project entries on the left, smaller entries on the right, with the right column moving faster during vertical scrolling on desktop.
- Make the project-preview close seamless by fading the heavy story content first, compressing only a lightweight visual surface, completing cleanup on the actual transform transition end, preserving scrollbar space, and resuming the marquee after compression settles.
- Add an honest V0 Privacy page and a footer Accessibility Statement link. Do not claim audited conformance while formal accessibility testing is still outstanding.
- Enforce one semantic type scale across the site so every `h1` through `h6` level has a single consistent size rather than component-specific heading overrides.
- Remove the homepage Making Of section and retain the portfolio process as a project in the complete Work gallery.
- Limit the persistent rail to page destinations: Home, About me, Work, What I do, Lab, Contact, and Resume. Remove Experience, References, and Making Of section links.
- Replace the hero actions with a clearer About action and a Contact action.
- Increase the audience selector size and spacing; remove dividers and underline states; use text color alone for the active choice.
- Slow the layout-grid reveal and overlap successive line animations with a restrained stagger so the construction is visible without becoming laborious.
- Keep every desktop audience headline to three authored lines. Place the selector at H03 and the hero actions at H08 without allowing title/action overlap.
- Keep the homepage marquee from H11 through H15.5. Place the View all projects action at H16 and span it from V5 through V8.
- Give the Lab and Experience sections more distinctive titles and render their calls to action as full buttons.
- Set the desktop grid row to 6rem and all rectangular controls to half a row: 3rem (48px). Use 2.5rem (40px) controls when the mobile grid row contracts to 5rem.
- Increase the desktop hero headline to a dedicated display size while preserving three authored lines. Its final line must end on H07; the audience selector remains at H03 and the actions remain fixed at H08. Keep the semantic H1 scale for tablet and mobile layouts.

## Audience motion, Iconoir, rail, and section-alignment pass recorded on 2026-08-19

- Replace the audience headline's one-way remount with a coordinated two-layer transition: the old words leave upward from left to right while the new words enter upward from below at the same pace and stagger, so the incoming message appears to push out the previous one.
- Keep the transition interruptible and resolve it immediately for visitors who prefer reduced motion.
- Standardize every current interface icon on `iconoir-react`; retain accessible labels on icon-only controls and keep the Iconoir MIT notice in the repository without adding visual attribution to the portfolio UI.
- Remove the circular Email and LinkedIn utilities. Add LinkedIn and Instagram as clearly identified text placeholders in the desktop rail after a one-item visual break.
- Keep exactly three bottom-left utility circles: theme, layout grid, and a disabled English/Spanish selector placeholder. Place current Bogota time and location beneath them and remove the duplicate time block from Experience.
- Prevent animated title masks from clipping glyph edges while preserving the existing upward reveal.
- Keep View all projects at three desktop grid columns; cap other rectangular desktop actions at one and a half columns, with responsive fit adjustments at narrower breakpoints.
- Align the What I do title and all three service cards to H18, reduce the cards' height, add visible gaps, use the literal title `What I do`, and label the action `Learn about my process`.
- Start the Lab composition at V3 without an extra outer left/top/right inset, add gaps between the four cells, use the title `I like to create interactive stuff`, and label the action `Explore interaction lab`.

## Four-column Work index and compact filters pass recorded on 2026-08-19

- Align the Work title and expanded filters to H03 and begin the gallery at H06 on the 2K desktop grid.
- Keep the existing V1–V12 horizontal bounds and remove any visual divider between the Work introduction and the gallery.
- Divide the complete Work index into four progressively smaller columns containing exactly 2, 3, 4, and 5 entries. Add neutral placeholders only where needed to make the intended fourteen-slot rhythm visible without inventing professional claims.
- Start every column on H06, then move the second, third, and fourth columns progressively faster than the first during vertical scrolling.
- Keep the Work introduction sticky beneath the gallery so project surfaces pass over and cover it as the visitor scrolls.
- Place the expanded filters at the top right. Allow multiple simultaneous selections and show projects matching any selected category; selecting All clears the category selection.
- After the visitor scrolls beyond the introduction, replace the expanded controls with one Iconoir filter button floating above the project surfaces. Open the complete filter set from that button while preserving selected states.
- Keep the floating panel keyboard operable: expose pressed states, close on Escape or an outside pointer action, and restore focus to the trigger after Escape.
- Keep the floating control outside the sticky heading's stacking layer so project links cannot intercept its clicks.

## Motion cleanup pass recorded on 2026-08-19

- Slow only the layout grid's vertical-line entrance to 1500ms and use a balanced ease-in-out curve so the taller construction does not appear to finish immediately; retain the existing stagger, horizontal-line motion, labels, and closing behavior.
- Keep the Bogota clock and `Bogota, Colombia` label together on one baseline without wrapping.
- Animate the theme selector back into its compact state: contract the complete track toward the bottom, keep the selected sun thumb visible during its return, then crossfade cleanly into the resting sun button.
- Clip audience-headline words exactly at their line masks while they leave upward so exiting glyphs cannot merge into the line above.
- Add a small amount of deliberate word spacing to the display headline without changing its authored three-line structure or overall alignment.

## Headline dissolve and persistent rail controls pass recorded on 2026-08-19

- Replace the audience headline's upward exit with a stationary blur-and-opacity dissolve. Keep the established incoming words rising from below, but delay that entrance slightly so it follows the dissolve instead of creating overlapping double text.
- Treat the outgoing headline as one visual surface rather than staggering blurred words independently; this keeps the change legible while preserving a clear state transition.
- Exclude the desktop rail utilities and mobile utility dock from scroll-entry reveal observation. Theme, grid, language, time, and location controls must remain visible and usable from initial load through client-side route changes.
