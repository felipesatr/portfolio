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
