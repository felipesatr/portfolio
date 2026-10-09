# Calendar / Career refinement QA — 8 October 2026

## Confirmed code causes and changes

- Picker clones only translated, then changed to the smaller wheel glyphs. They now animate scale and real variable font weight in the same 260 ms movement, in both directions.
- Neutral liquid rendering shifted the orb to a resisted position on activation, and its deformation kernel was already active at the proximity boundary. Neutral controls now use the actual spring position and zero deformation at the boundary. Regular CTA resistance, strength, proximity, translation and liquid settings are unchanged.
- Today had a 6 px liquid threshold, unlike the other tight controls' 34 px threshold. It now has the same continuous approach envelope. A remaining ordinary-date attraction tail no longer forces a delayed, threshold-based renderer switch when approaching today. Ordinary-date attraction coefficients and non-liquid behavior are unchanged.
- Calendar pills transitioned their background from transparent after WebGL handed paint ownership back to the DOM. Their background ownership now switches in the same frame; ink can still transition. No transparent-to-solid background tween is used.
- Negative masking selected just one target. Calendar contacts now paint together inside the actual orb clip, each keeping its own agenda viewport mask. Rules and scroller use dark gray; text retains the normal ink mask.
- Task tooltips captured an old rectangle, and the cursor-resume branch could overwrite an active tooltip position. Geometry changes now re-anchor the existing tooltip without restarting its morph; the resume fallback cannot overwrite a tool/pill.
- The thumb's non-uniformly stretched SVG turned a nominal 3 px corner into a much smaller physical vertical radius. Its viewBox now follows the measured height, preserving actual 3 px rounded ends.

## Visual/UI checks completed

- Local QA on an isolated port (5176), without editing task data on the user's existing 5173/5174/5175 origins.
- Picker opened/cancelled; smaller task composer opened and a temporary task added.
- Week view entered; temporary task checked and deleted. Checked control has dark fill and white Iconoir checkmark.
- Task tooltip appeared centered above the task after agenda scrolling, not at the checkbox/pointer position.
- Rounded filled triangle arrows and rounded thumb visible; hour rules moved up 1.25 px, end 4 px earlier, without moving the scroller.
- The rightmost trash circle was found clipped during QA and corrected to remain inside the viewport while sitting above the task edge.
- Career measured at document y=3935.984 px = H41 (96 px rows). List starts x=1066.656 px = V5 and ends x=2133.312 px = V10 at a 2560 px viewport.
- All twelve Career paragraph rows measured font weight 400, 14.5 px Figtree. Both title-to-button gaps measure 38 px.
- No browser warning/error logs were recorded during the tested interactions.
- Evidence: `calendar-week-refined.jpg` and `career-refined.jpg`.

## Automated checks

- TypeScript passed.
- Scoped ESLint for fluid-cursor and lab-calendar passed.
- All five calendar unit tests passed (four-per-hour limit, Sunday-first/leap grids, all time-wheel minute round trips, local date keys, invalid stored records).
- Final production build and 22 prerendered routes passed on retry. One intervening build failed at `/work/project-06` prerendering; retrying after stopping the temporary dev server passed. The intermittent prerender cause is not established by this run.
- Shared home-sections lint still reports existing unrelated hook/state-in-effect issues; they were not broadened into this visual task.

## Verification limits

Screenshots and UI checks verify layout, task controls, scroller shape and tooltip anchoring. They do not prove every fast pointer trajectory, neutral liquid entry/exit or every theme is visually perfect. The supplied video was reviewed and the identified handoff discontinuities addressed in code; fast ordinary-date ↔ today and compact-control proximity movement still deserve a direct human replay. The approved ordinary-date coefficients and standard CTA physics were preserved explicitly.

Reviews, final CTA/footer implementation and car materials were not changed in this pass. The CTA reference document contains proposals only, including freelance projects.

## Calendar 3 follow-up — 8 October 2026

- Reviewed `cal3.mp4`, including the stale fixed rule under the task-hour tooltip.
- Popup cursor ownership now changes in a layout effect, before paint. The underlying pill/circle fill remains painted under the collapsing morph. Closing draws the restored liquid frame synchronously, so an absorbed cursor is not briefly exposed as a free ball.
- The cursor-return fade now applies only to a visible, ordinary cursor. It no longer overrides a hidden fallback cursor or hidden ink masks.
- Negative masks clear on tool/pill entry, during their reverse morphs, and while a native-cursor calendar dialog is open. Internal agenda geometry changes invalidate and re-evaluate fixed clones immediately.
- Agenda scroll position and bounded thumb geometry are initialized in a layout effect. The agenda and scrollbar fade/unblur together as one frame.
- Selected-day border uses a positioned outline layer above the orb. Weekday text uses the default native cursor. Composer title/date moved down 3 px without changing input or button layout.
- Trash circles protrude 7 px above and 7 px to the right of their task label, with a 9 px gutter to protect the last circle from agenda clipping. Completed text's strike moved from 58% to 48% of the line box.
- A new task stays hidden for the existing tasks' 260 ms resize, then enters. Deletion retains the old slots throughout its 220 ms shrink, then the survivors grow. A pending entrance animation is cancelled before its task begins leaving.

### Browser evidence and checks

- Tested on a separate local dev origin, `127.0.0.1:5176`, preserving task data on the user's other origins.
- Opened/cancelled month selector; entered week view and returned to month; added two temporary same-hour tasks; checked a task and deleted tasks.
- Observed addition's first task still at 304.86 px while the newcomer was at 0 px / opacity 0; both later measured 152.42 px. Observed deletion retain the survivor's 152.42 px slot during exit and later grow to 304.86 px.
- Closing the composer with the pointer still over its X/plus produced `data-liquid-rendered=true`, visible liquid canvas, fallback cursor opacity 0, and mask opacity 0 after the overlay was removed.
- Agenda PageDown moved scrollTop from 690 to 849, and the formerly intersected rule's mask changed to opacity 0 rather than remaining painted at its old position.
- Week thumb measured 40.21 px inside a 199 px track, initialized at the intended hour position. Weekday cursor measured `default`; selected outline layer measured z-index 89.
- Evidence: `calendar-3-week.jpg` shows selected-day outline and two equal task slots, including the checked task.
- Direct TypeScript check passed; scoped ESLint and all five calendar unit tests passed. The standard typecheck wrapper initially hit a sandbox `EPERM` resolving Vite; the direct TypeScript check used the existing generated route types.
- Screenshots and DOM observations confirm the states above. They do not amount to a frame-by-frame recording of every rapid pointer trajectory or every theme.
