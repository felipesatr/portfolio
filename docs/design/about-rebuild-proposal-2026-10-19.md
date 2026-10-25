# About me: copy and layout proposal

Status: REVIEW DRAFT, not implemented. Prepared 19 October 2026.

This proposal combines Felipe's interview answers, the current homepage implementation and rendered styles, the supplied references, and his actual thesis. Suggested values, working preferences, and unverified methods are intentionally provisional. They must not be published as established facts without his review.

## Brief

An About page for employers, collaborators, and clients who want to understand Felipe's capabilities and personality. Prioritize UX while explaining the value of his broader design background and ability to build. First-person English, concrete details, restrained claims. Primary action: Start a conversation. Secondary actions: View my CV, View my work, and the Process page. No invented availability or performance statistics.

## Design foundation inspected

- Principal content boundaries: V3–V10. These are vertical grid lines defining horizontal bounds. They are not height markers.
- The existing desktop grid uses `--layout-column: 8.333333vw` and `--grid-row: 6rem` (96px at the inspected desktop root size).
- Use the actual service-card theme treatment, not a fixed dark swatch. The inspected dark appearance was #1c1c1e with #f5f5f1 foreground. Some theme overrides are scoped to existing service-grid selectors; adding the variable alone to a new wrapper is insufficient. Extend the shared treatment deliberately, scoped to About.
- Equivalent cards use `--radius-card: 1.25rem` (20px). Reuse the real SpotlightCard/SpotlightGrid components and global pointer tracking.
- Current service-card internals use 18px padding and 14px gaps. Use 24px/32px existing tokens for larger editorial blocks where needed. Use the existing section-spacing tokens for open space.
- Cal Sans headings use their native 400 weight. Figtree body and labels follow existing rules; bold is 700. Shared buttons stay 12.5px and footer text 14.5px.
- Reuse responsive homepage heading tokens, rather than converting a desktop computed size to a fixed px value. Keep the existing descender/clipping fix.
- Preserve Iconoir icons, bold right arrows, the diagonal CV arrow, rail, themes, custom cursor, text-mask exclusions, button physics, and navigation transitions.
- Reuse ContactCta and the shared footer. No reveal animation on the footer. Do not reproduce their markup separately.
- Mobile order matches the numbered sections. Content-driven heights; no forced desktop grid heights on phones.

## Proposed composition

All bounds below describe OUTER edges. Where adjacent blocks meet at V6, retain the existing gutter around the shared line rather than allowing surfaces to touch. Whole-section widths reach V3 and V10 exactly. Half-row heights are starting minimums, not maximums; increase by 0.5 row when content needs room.

| Order | Section | Desktop composition | Height guidance |
| --- | --- | --- | --- |
| 1 | Who I am | Open name/title V3–V10; introduction V3–V7; compact place/personality block V7–V10 | Content-led; reserve pronunciation space |
| 2 | How I got here | Heading V3–V6; editorial story V6–V10, with small chapter labels | Content-led; no compressed long-story card |
| 3 | Face photo | Substantial rounded photograph V3–V10 | Start at 5 rows / 480px; crop for subject |
| 4 | What matters to me | Heading V3–V6; six compact value entries in a rounded block V6–V10 | Start at 5 rows / 480px; grow as needed |
| 5 | Experience | Heading/CV V3–V6; shared experience cards stacked V6–V10 | Each card content-led, half-row rounding where useful |
| 6 | What I can help with | Heading V3–V10; primary UX card V3–V7; UI card V7–V10; next row frontend V3–V7, branding V7–V10 | Unequal widths; avoid shrinking body text |
| 7a | How I work | Heading V3–V6; compact process block V6–V10 | Start at 5.5 rows / 528px; expandable draft methods are separate |
| 7b | Working preferences | Two rounded blocks: My sweet spot V3–V6, Not so much V6–V10 | Equal row height, content-led |
| 8 | Areas of interest | Heading V3–V6; grouped, wrapping text in a rounded block V6–V10 | Start at 3.5 rows / 336px |
| 9 | Listening lately | Rounded music block V3–V6 | Start at 2.5 rows / 240px |
| 10 | On my bookshelf | Rounded book block V6–V10, beside music | Match music row; book follows music in DOM |
| 11 | Contact + footer | Actual shared homepage ContactCta and footer V3–V10 | Existing spacing and footer bottom 32px |

This is a mix of open editorial text, a substantial photograph, and familiar rounded blocks. It does not turn every paragraph into a tile. The long method-selection bank below belongs to the review draft, not the permanent public About layout.

## 1. Who I am

Eyebrow: About me

Main heading: Felipe Salazar

Pronunciation draft: feh-LEE-peh sah-lah-SAHR

The first name follows the [SpanishDictionary.com pronunciation guide](https://www.spanishdict.com/pronunciation/Felipe). The surname is an English-readable approximation of Colombian Spanish, not a verified personal recording. Confirm the full pronunciation with Felipe. Keep audio clearly marked unavailable until an actual approved audio file exists. Do not add a working-looking play button with no sound.

Professional title: Webapp Designer & Front-End Developer

Introduction:

I'm a multidisciplinary designer based in Bogotá, Colombia, with a particular interest in UX. My work brings together interface design, programming, and a broader background in visual and physical design. I'm drawn to things that look good, work well, and feel satisfying to use.

Place:

I was born in Bogotá, grew up in a smaller Colombian city, and later returned to the capital. I've travelled to different parts of the world, but Colombia has always been home.

Editorial placeholder, not public prose: [A specific thought about how being Colombian shapes my perspective. To write together later; no national-character stereotypes.]

Personality:

Outside work, I like tattooing, gaming, and cars, especially their design. I've tried plenty of sports over the years, including several years of taekwondo, and I enjoy the competitive side of things. I also love animals. My cat has been with me since I was eleven.

Optional short line if space permits: I like learning how things work, trying new technology, and occasionally finding a book that keeps me reading.

## 2. How I got here

Heading: A few different paths brought me here

At six, I became the person classmates asked when they needed a drawing. As I got older, that interest showed up in school projects too. I liked finding an idea that would make the work feel different.

Around fifteen, I got interested in game development and 3D. I started learning to code and model, while physics and maths kept me curious about the technical side of making things. When university came around, I began in systems engineering.

I later added design as a second programme, then moved into it fully because I enjoyed the classes more. At Universidad de los Andes, I had room to explore. I worked on projects across textiles, fashion, industrial and interior design, graphics, branding, and automotive design before choosing a narrower focus.

Toward the end of my degree, UX, UI, and the web brought those interests together. Creative coding and computer graphics drew me back toward programming. Working with people to make a product more useful and satisfying was the part I wanted to keep pursuing.

Since then, I've worked on branding and visual identity alongside websites and interfaces. Today, at Nationwide Marketing Group, I migrate and improve websites, working with design and code together. I also keep learning how AI can support the work and where my own judgement needs to lead.

Optional thesis callout, within this story rather than a new out-of-order section:

For my graduation project, I stepped into automotive design. Zarllo Cielo was a personal electric-car concept shaped through research, sketches, 3D modelling, and revision. The project pushed me to transfer what I'd learned across disciplines and reconsider my direction when the brief needed it. Even my cat found a way into the design, through its feline references and the connection behind its name.

Avoid claiming the car was manufactured, road-approved, production-ready, or physically prototyped. The thesis explicitly identifies limits of the 3D model and the uncompleted physical-prototype goal.

## 3. Photo of my face

Use `public/images/lab-cat.jpeg` as the explicitly requested temporary image. Suggested temporary caption: Portrait placeholder. My cat is standing in for now.

Alt text must describe the cat; do not call it a portrait of Felipe. Final portrait remains outstanding. Use cover, local clipping and the 20px radius, with a subject-safe crop tested at desktop and phone sizes. The existing Lab crop is not automatically suitable for this much wider block.

## 4. What matters to me

Suggested placeholder values. These are proposals for Felipe to approve and personalize, inspired by the supplied Ximena reference but written for this portfolio.

1. Empathy with evidence. I want to understand what people need, where they get stuck, and what matters to them before deciding what a solution should be.
2. Curiosity across disciplines. Exploring different fields gives me more ways to approach a problem and more questions worth asking.
3. Self-awareness. My first impression is a starting point. I want to recognise my assumptions and make room for perspectives that challenge them.
4. Collaboration and shared learning. I value clear conversations, useful feedback, and explaining decisions so people can contribute to them.
5. Accessibility and inclusion. A thoughtful experience should consider different abilities, devices, and situations from the beginning.
6. Craft with a purpose. I care about the visual and interactive details that make something clearer, easier, or more enjoyable to use.

Optional alternatives, not all additional public entries:

- Continuous improvement. I like learning through making, finding the weak parts, and improving them.
- Ownership and follow-through. I want the care in the idea to carry through into the finished work.
- Intellectual honesty. I want to be clear about what I know, what I've assumed, and what still needs testing.
- Peer support. I enjoy sharing what I've learned and learning from the people around me. [Personal enjoyment and mentoring practice still need confirmation.]

Keep six at most in the first layout. The interview and thesis support curiosity, multidisciplinarity, and purposeful craft particularly well. Accessibility, collaboration habits, and peer support need examples before becoming strong public claims.

## 5. Experience showcase

Heading: Where I've put it into practice

Intro: My recent work spans websites, visual identity, and implementation.

The current source already contains these records. Preserve them as existing records, not newly verified interview facts. Confirm titles/dates and any quantified accomplishments against the CV before changing or strengthening them.

- Nationwide Marketing Group: Web Designer & Developer / Team Lead. Mar 2024–present. Suggested restrained summary: I migrate and improve websites, bringing design and front-end implementation into the same workflow. The interview confirms the core activity; leadership/training details stay sourced to the existing record pending review.
- Industrias Galgo Global: Visual Designer & AI Strategist. Feb–May 2025. Existing source describes a Philaac rebrand, product labels, and AI-assisted campaign imagery/video. Retain for review; do not invent outcomes.
- UNE Consultores de Seguros: Lead Designer. Jan–Mar 2024. Existing source describes visual identity, colour, typography, and digital design aligned with brand strategy. Retain for review.

CTA: View my CV, using the current `/resume/felipe-salazar-cv.pdf` asset and existing diagonal-arrow CV treatment. No new download route or invented CV file.

## 6. What I can help with

Heading: Thoughtful experiences, from idea to interface

Lead: UX is my main focus, supported by interface design, front-end development, and a wider design background.

Primary card, UX design:

I work on the structure and behaviour of an experience: what people need to do, how they find their way, and where an interaction can become clearer or easier. [Research methods and deliverable scope to confirm from the method bank.]

UI and web design:

I turn content and flows into responsive interfaces, considering hierarchy, visual identity, and the details that make an interaction feel coherent.

Front-end development:

I bring designs into the browser and improve existing websites, staying close to the way the layout and interactions work in practice.

Branding and visual identity:

I work on logos and visual identities, connecting their visual direction to the wider brand and its digital presence.

Supporting note: Creative coding and AI-assisted workflows are part of what I explore and keep developing. Keep them secondary to UX rather than giving every discipline equal prominence.

CTA: View my work, route `/work`, existing right-arrow button.

## 7. How I work

Provisional public overview, to confirm against current professional practice:

Intro: I use a process to give the work direction, with room to revisit a decision when I learn something new. The methods depend on the problem, the people involved, and the constraints.

1. Understand the context. Get clear on who the work is for, what they need, and what the project has to achieve.
2. Define the direction. Bring the findings together, identify the problem worth solving, and agree on the priorities.
3. Explore and make. Try different approaches, then develop the most useful direction into something people can see and interact with.
4. Evaluate and refine. Gather feedback, examine what works, and return to earlier decisions when needed.
5. Build and follow through. Carry the design into implementation, check it in use, and identify what still needs improvement.

The first four have concrete precedent in the thesis; implementation is confirmed in current work. This does not establish a universal five-stage routine or prove every candidate research method below is used professionally.

CTA: More about my process. The existing Process route is `/services`; link there, not to an invented `/process` route. The destination may later need a separate content update, not automatically included in this About rebuild.

### My sweet spot / Not so much

All entries below are suggested placeholders. The paired layout borrows the clarity of [Charlota Blunarova's About section](https://www.blunarova.com/about), not her biography or exclusions.

My sweet spot:

- Understanding the experience. Work where I can ask how something should behave and what would make it useful to the people using it.
- Design close to the build. Projects where I can carry decisions from the interface into the browser and refine them along the way.
- Room to explore. A clear purpose with space to compare ideas before settling on a direction.
- Useful collaboration. Honest feedback, clear priorities, and people who can explain what they need from the work.

Not so much:

- Choosing a solution before understanding the problem. I'd rather make room for the questions that could change the brief.
- Visual effects that get in the way. I enjoy expressive work, while keeping reading, navigation, and interaction comfortable.
- Feedback without a clear direction. Specific concerns and shared priorities help me make better decisions than conflicting preferences alone.
- Handing the judgement to AI. I'm interested in using it where it helps, with responsibility for what makes it into the final work.

Do not add assumptions about remote-only work, company size, disliking 3D, refusing packaging, freelance availability, or being a one-person studio. Those came from someone else's example, not Felipe's answers.

## 8. Areas of interest

Heading: Things I'd like to explore further

Intro: Some connect directly to my work. Others are subjects I'd like to bring into future projects.

Confirmed personal connections: technology; automotive design; art and tattooing; games and interactive media; sports.

Additional draft subject areas from the supplied reference: fashion and lifestyle; luxury; responsible design. Confirm the intended meaning of “conscious” before using that label publicly.

Separate optional exploration list: motion, 3D/CGI, AR/VR, AI, creative technology. Some have prior learning or exploration, but the screenshot alone does not establish professional specialization. Strategy, identity, art direction, and graphic design describe disciplines rather than industries; keep them separate from the subject-area list.

## 9. Music

Title: Listening lately

Draft fields: [Song title], [Artist], [Artwork], [Spotify track URL].

Placeholder text: A track to add here soon.

No live-status badge, equalizer implying real playback, disabled-looking live player, fake title, or autoplay. Until a real URL is supplied, there is no clickable Listen on Spotify action.

A live account connection is feasible through Spotify's authorized Web API, subject to current account/app requirements. A later implementation should use server-side or serverless token handling and caching, not secrets in the frontend. The currently-playing endpoint needs `user-read-currently-playing`; a recently-played fallback requires its own permission. Authorization and a deployment endpoint are future work. Source: [Spotify's currently-playing API](https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track).

## 10. Book

Title: On my bookshelf

Draft fields: [Book title], [Author], [Cover], [Personal note].

Placeholder text: My current read will go here.

Do not choose a book, invent a reading habit, or imply that a design reference book is currently being read. Music precedes book in source order even when they share a desktop row.

## 11. Contact and footer

Use the existing shared component with exactly:

Tell me what you're
working on

Retain the approved curly apostrophe and explicit two-line rendering from the actual component. Keep Start a conversation, the current almost-white heading, existing primary-button colour and physics, and the email-copy arrangement. Keep the placeholder email until Felipe supplies a replacement.

Reuse the shared footer, including Designed & coded with care, copyright, site details, Bogotá clock and 32px bottom spacing. Do not recreate the footer in About. Verify it appears once, since the site shell already supplies it.

## Pending decisions and assets

No need for Felipe to write finished prose. Request only the remaining facts/choices in small batches:

1. Approve/edit the six values and the paired work preferences, ideally with one example each later.
2. Select methods actually used, using the companion research document's bank. Distinguish professional practice, academic use, and interest.
3. Confirm existing experience titles/dates and whether to keep quantified claims such as 70+ migrations. No number is added in this draft.
4. Smaller city name only if he wants to publish it; Colombian-perspective sentence can remain explicitly pending.
5. Approved name audio, final face portrait, actual song, and actual book. Placeholders are already authorized for now.
6. Later Spotify authorization, eligibility check, and hosting choice for a safe endpoint. Do not request credentials in chat.

## Build and verification plan after approval

- Scope implementation to About and narrowly necessary shared reuse. Preserve the pre-existing dirty working tree.
- Use the existing shared cards, actual foreground/theme contexts, navigation, icons, CTA, and footer. Do not install a new UI kit or animation stack.
- Test desktop widths including 1440 and 1920, tablet, and 390px phone. Confirm V3–V10 outer edges and DOM order.
- Check every supported theme, card borders/backlight, global pointer tracking, cursor text masks and interactive exclusions, keyboard/focus, and reduced motion.
- Confirm heading descenders without font-size or line-height regressions. Check all long paragraphs for comfortable measure and wrap.
- Verify current real routes, CV asset, email-copy behaviour, and footer clock. No dummy play controls or empty external links.
- Typecheck/build in proportion to changes. Record exactly what ran and what remains unverified; documentation creation is not a rendered implementation.
