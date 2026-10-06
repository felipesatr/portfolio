# Theme colour roles

This is the current colour direction for the portfolio. Values live in
`app/styles/tokens.css`; this document is the visual annotation and decision
record, so future palette exploration changes a token rather than a component.

## Shared roles

- **Background** — page and surface base (`--page`).
- **Primary** — the theme's general accent for focus, highlights, and non-CTA
  interactions (`--primary`).
- **CTA** — the filled action role (`--cta`), defaulting to the primary accent.
- **CTA hover** — currently the same color as the default CTA (`--cta-hover`).
- **CTA active** — the pressed state (`--cta-active`).
- **Secondary** — the alternate call to action (`--secondary`), currently the
  role used by **Let’s talk!** in the light theme; it follows the CTA palette in
  the four near-black variants.
- **Secondary hover** — currently the same color as the default secondary
  action (`--secondary-hover`).
- **Ink** — readable label colour for each fill (`--primary-ink` and
  `--secondary-ink`); active states can override ink if the pressed fill needs
  a different foreground for contrast.

## Current palette classification

| Theme id | Selector label | Background | Main CTA | Main active | Let’s talk | Let’s talk active |
| --- | --- | --- | --- | --- | --- | --- |
| `dark-sky` | Violet | `#0A0A0A` | `#4803B4` | `#33027F` | `#7752FE` | `#5B35D5` |
| `dark-monochrome` | Signal red | `#252525` | `#AD0000` | `#AF0404` | `#E60000` | `#AF0404` |
| `dark-cyan` | Indigo | `#190482` | `#7752FE` | `#5B35D5` | `#C2D9FF` | `#8E8FFA` |
| `dark-berry` | Berry | `#3A0519` | `#A53860` | `#670D2F` | `#EF88AD` | `#A53860` |
| `dark` | Electric violet | `#1B0044` | `#5727A3` | `#1B0044` | `#9153F4` | `#5727A3` |
| `warm` | Terracotta | `#F2E9D7` | `#D97757` | `#D97757` | `#B84131` | `#B84131` |
| `light` | Blue-gray | `#F0F5F9` | `#52616B` | `#1E2022` | `#1E2022` | `#52616B` |
| `cool` | Green teal | `#EDF3F0` | `#216F70` | `#1E2022` | `#37BABC` | `#27989B` |
| `contrast` | Grayscale | `#FFFFFF` | `#7F7F7F` | `#7F7F7F` | `#323232` | `#323232` |

The first four options sit at the bottom of the selector. Signal red uses a
charcoal-and-red palette; its bright-red primary button uses black lettering
and its dark-red secondary button uses white. Berry uses the supplied four-step
burgundy-to-pink palette (`#3A0519`, `#670D2F`, `#A53860`, `#EF88AD`). Electric Violet uses the
attached purple palette across its page, surfaces, text, and accents. Indigo
uses its own indigo palette and a light-blue secondary button with `#190482`
lettering. The selector order in the table is bottom-to-top;
Violet is first and Grayscale is ninth. Hover keeps each CTA's default color.

The Blue-gray light variant uses `#F0F5F9`, `#C9D6DF`, `#52616B`, and `#1E2022`
from the supplied swatch image. Terracotta uses warm cream and coral-orange
hues, while Green Teal pairs its teal primary with cyan for **Let’s talk!**.

## Interaction behaviour

Filled CTAs use the CTA role by default. `.button--secondary` and the legacy
`.button--red` compatibility class use the secondary role; the four near-black
themes map both CTA roles to the selected palette. Hover and focus keep the
default fill; pressed states remain distinct. The liquid renderer receives the
same base, hover, and active colors so its joined button-and-cursor shape stays
in sync with the button.
