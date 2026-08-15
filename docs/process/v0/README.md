# Portfolio V0 visual baseline

Captured on 2026-08-15 before the first progressed design pass. This folder preserves the exact local V0 that was reviewed in the browser so later changes can be compared against evidence instead of memory.

## Coverage

- `screenshots/pages/`: desktop top-of-page captures for all 15 prerendered routes.
- `screenshots/homepage-sections/`: sequential viewport captures from the homepage hero through the footer.
- `screenshots/interactions/audience/`: all five audience-switcher states.
- `screenshots/interactions/filters/`: all six project-filter states.
- `screenshots/interactions/themes/`: all five theme states.
- `screenshots/interactions/project-card-hover.png`: the project reveal treatment.
- `screenshots/interactions/loading/`: the 900 ms opening state.
- `screenshots/responsive/`: homepage captures at 375, 768, 1024, and 1440 CSS pixels.

## Route inventory

1. Home
2. Work index
3. Project placeholders 01-09
4. Behind this portfolio
5. About
6. Interaction Lab
7. Contact

## Baseline status

- React + TypeScript + React Router Framework Mode + Vite
- Custom CSS
- Static prerendering for 15 routes
- TypeScript, ESLint, and production build passing
- Placeholder content is intentionally explicit; no project evidence or metrics were invented
- The review build remains `noindex, nofollow`

These images document V0. They are not final marketing assets and should not be silently replaced when the interface progresses; add a new versioned documentation folder instead.
