# Theme colour roles

This is the current colour direction for the portfolio. Values live in
`app/styles/tokens.css`; this document is the visual annotation and decision
record, so future palette exploration changes a token rather than a component.

## Shared roles

- **Background** — page and surface base (`--page`).
- **Primary** — default filled buttons, highlights, focus, and the fluid cursor
  (`--primary`). It replaces the previous black filled-button treatment.
- **Primary hover** — the darker, fully-engulfed/click-ready state
  (`--primary-hover`).
- **Secondary** — the alternate call to action (`--secondary`), currently the
  role used by **Let’s talk!** in the light theme.
- **Secondary hover** — the darker fully-engulfed state (`--secondary-hover`).
- **Ink** — readable label colour for each fill (`--primary-ink` and
  `--secondary-ink`).

## Current palette classification

| Theme id | Selector label | Background | Primary | Primary hover | Secondary | Secondary hover |
| --- | --- | --- | --- | --- | --- | --- |
| `light` | Violet light | `#FEFEFC` | `#6948E8` | `#5636C8` | `#E33333` | `#BF2428` |
| `dark` | Lavender dark | `#151515` | `#B8A4FF` | `#9B82EF` | `#FF7772` | `#E65D59` |
| `warm` | Terracotta warm | `#F4EEE5` | `#9C4D2C` | `#7E3C22` | `#386F62` | `#28584D` |
| `cool` | Teal cool | `#EDF3F0` | `#216F70` | `#18595A` | `#90518D` | `#733E70` |
| `contrast` | Electric violet contrast | `#FFFFFF` | `#4D19C4` | `#32008A` | `#D9183D` | `#AD102F` |

## Interaction behaviour

Filled CTAs use the primary role by default. `.button--secondary` and the
legacy `.button--red` compatibility class use the secondary role. The ordinary
HTML surface transitions to the matching hover colour on pointer/keyboard
hover. While the liquid renderer owns a CTA, it receives the same four token
colours and eases the entire joined button-and-cursor silhouette to the hover
colour only after the pointer enters the CTA. This keeps the DOM label and the
WebGL shape in the same state.
