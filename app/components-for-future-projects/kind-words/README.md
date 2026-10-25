# Archived Kind words layouts

These layouts have been removed from the live homepage but kept for reuse. Each numbered folder contains that layout's component snapshot, layout-specific CSS snapshot, portrait assets, and restore notes. Shared component helpers and base styles are kept in `_shared/` so they do not have to be duplicated in every variant folder.

- `02-inline-quotations-with-hover-focus` — inline quotes with hover/focus emphasis and expand control
- `05-pastel-fan-of-cards` — layered pastel testimonial-card fan
- `06-large-quote-with-author-list` — large quote with an expanding author list
- `07-five-row-reaction-marquee` — animated five-row reaction marquee
- `09-centered-quote-with-avatar-selectors` — centered quote with star rating and avatar selectors

The `.txt` extensions keep snapshots out of the app's TypeScript and CSS build. To restore a layout, copy its component and styles into maintained source files, reconnect the shared helpers, and update portrait paths to the copied `assets/` files.
