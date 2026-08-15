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
