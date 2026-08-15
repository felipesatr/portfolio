# Portfolio V0

Structural prototype for an employability-focused portfolio using React, TypeScript, React Router Framework Mode, Vite, and custom CSS.

## Commands

- `npm run dev` — local development
- `npm run typecheck` — generate route types and run TypeScript
- `npm run lint` — lint TypeScript and React
- `npm run build` — build and prerender every known public route
- `npm run preview` — inspect the static production output

The deployable output is `build/client`.

## Rendering

`react-router.config.ts` uses `ssr: false` with an explicit prerender list. The build creates static HTML for Home, Work, nine project placeholders, the portfolio making-of route, About, Lab, and Contact. The post-build script also creates `404.html` and generates `sitemap.xml` from the produced route folders.

## Review-only safeguards

- `robots.txt` disallows indexing.
- Every route includes `noindex, nofollow` through the root document.
- Projects, references, résumé, contact information, social profiles, location, and availability are visibly labeled as placeholders.
- The canonical origin and social image are placeholders.

Replace these safeguards and placeholders only when real content has been verified and the launch checklist passes.

## Intentionally deferred

Redux, Tailwind, UI component libraries, animation libraries, P5.js, Three.js, a CMS, database, authentication, backend, chatbot, newsletter, contact form, analytics, and elaborate route transitions are outside V0.
