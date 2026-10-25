# Custom distance globe

## Location comparison update — 21 October 2026

The About page starts two low-priority HTTPS requests after its first paint:
IPWhois (city/region/coordinates/ISP) and FreeIPAPI (city/region/coordinates/ASN
organization/proxy flag). They run in parallel with a 1.6-second timeout. No SDK
or API key is added. Neither result gates the page, fonts, or canvas rendering.

Only matching city names with nearby coordinates can produce a city label.
Disagreement falls back to a shared region or country; conflicting countries
produce no visitor estimate. Available proxy/mobile/hosting flags and explicit
network-name hints reduce precision. Missing security fields are unknown, not
proof that a VPN is absent. Provider accuracy/confidence fields are honored if
available; no numerical confidence or accuracy radius is invented.

Cache v4 invalidates the old single-provider city result. Only the final coarse
place, coordinates and comparison status are cached, for six hours on city
agreement or fifteen minutes otherwise. Raw IP/ISP/ASN responses are discarded.

Sources: https://ipwhois.io/documentation and
https://freeipapi.com/docs/api-reference/get-ip-info.
Full mobile/VPN intelligence is not universally available on keyless free APIs;
the implementation does not pretend that the free proxy flag detects every VPN.

## Ownership and sources

The renderer is project-specific Canvas 2D code, with orthographic spherical
projection, depth-shaded land dots, spherical interpolation for the connection,
front/back occlusion, markers, projected labels, pointer/keyboard rotation and
automatic rotation. No COBE renderer, data, shaders, projection helper or 21st.dev
component code remains. The existing Tabler icon license is unrelated.

Geographic outlines are data, not a third-party UI component:
- https://www.naturalearthdata.com/about/terms-of-use/ (public domain)
- https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson

`node scripts/generate-globe-land.mjs` samples 18,000 equal-area Fibonacci sphere
positions against the land polygons and encodes the 5,190 land indices as 10,380
bytes of little-endian integers in `public/data/globe-land.json`. The browser
reconstructs these points once. It never downloads/parses the coastline polygons.

## Runtime

Render on native animation frames while visible; use supersampling capped at 2x.
Antialiased dot sprites have continuously varying depth opacity and a soft limb
fade rather than six brightness bands. Use fewer dots at phone widths. Rotate
continuously even after identifying a visitor, slightly faster than the first
version. After dragging, ease the tilt back to level over roughly 1.5 seconds.
Suspend when
offscreen/in a hidden tab, and use a static globe for reduced motion. Rotation
pauses during a deliberate pointer drag and resumes afterward. No globe CTA,
CTA, city dropdown or extra status paragraph. Small label buttons reuse the site's
neutral liquid merge and expand on hover/focus/absorption. They are portalled to
the root so text stays above the cursor surface. A live canvas-ink clone gives
the globe the same cursor mask, including while the pointer is stationary.

Me/You expand to a bullet and City, Country. The distance shows km and mi and
expands to a steps conversion with one step defined as exactly one meter. Calculate from the
unrounded great-circle distance, then round the final count. Same-country pairs
within 120 km share Hello neighbour!; cross-border pairs never merge. A collision
solver separates visible label boxes, and nearby stems have a smaller endpoint.

IPWhois free endpoint documentation currently permits commercial use and 1,000
requests per day (shared per domain for CORS requests):
https://ipwhois.io/documentation

One HTTPS call requests only `success,city,country,country_code,latitude,longitude`. It contains no
credentials or referrer and never requests browser GPS. Cache only the city and
provider coordinates without additional rounding in tab session storage for six hours. The
provider necessarily receives the request IP; this is disclosed on Privacy.
No IP is stored by the portfolio. No automatic retries or provider waterfalls.
On failure, show a neutral greeting rather than inventing a visitor/distance.

## Caption

The bottom caption expresses distance in steps, defining one step as one meter
of great-circle distance, not a walking-route estimate. Distance pills remain
km/mi. Their hover comparison uses an explicitly illustrative 46cm cat length,
excluding the tail; real cats vary. Steps never appear in a pill or hover detail.

Advance once per document load, after hydration, through exactly the four
approved phrases in their given order, starting at a random index on a first
visit. Store the last caption index in tab
session storage so a reload advances it without an immediate repeat. The choice
is stable across re-renders and route revisits in that document. If session
storage is unavailable, fall back to a fresh random choice.

## Tradeoff

Custom code gives artistic/behavioral control and removes the renderer
dependency, but is not inherently faster than COBE's GPU implementation. It adds
code and map-data maintenance. Profile real devices before claiming a performance
improvement. Geographic precision is deliberately approximate and IP-derived.

## Click-to-explore

The desktop sphere targets five grid rows (480px), starting at H17 and ending at
H22 with its right edge at V10; it scales down only if its column is narrower.
Its interior appearance is unchanged. Hover backlight is an outset circular
box-shadow outside the sphere, not a fill behind its translucent interior.
Pointer hover alone owns the halo, never keyboard focus or click state.
Rotation is 0.000185 radians/ms. Label occlusion is a 90ms
fade at the actual horizon; hover never freezes projected positions.

Projected labels are clamped after position easing, including their expanded
width and liquid translation, at least 24px from the experience section. A second
160%-size canvas gives raised routes 30% drawing clearance on every side, with a
viewport-clipped drawing window that prevents mobile horizontal overflow, without
adding layout padding or changing the sphere bounds. Markers are 4.5–5px radius
with expanding/fading rings; reduced motion uses a static ring. Destination pills
use 8px by 14px padding and 13px text.

All globe accents use `--secondary`, the Let’s talk button color: routes,
markers, click pulse, destination pill, and the subtle 22% circular outset halo.
The colored destination uses the actual filled-button liquid surface and color
handoff, with the same restrained 0.72 bridge geometry as compact white labels.
On desktop, the caption
bottom aligns to H22.5, while How I work begins at H22 in the left column.

Experience company logos remain 48px and the university logo 26px. Their text
sits in matching-height shared spotlight cards, without the previous middle rule.
The painted face now fills those exact heights without a transparent inset, and
its corner radius matches the logo's 10px radius. A masked spotlight border keeps
the shared pointer highlight above that full-size face.
Title-to-first-row gap is 32px (2rem), and inter-row gaps remain 24px (1.5rem).
Narrow rows grow and wrap naturally instead of clipping their content.

Inverse orthographic projection converts clicks to geographic coordinates.
Pointer movement over 5px is a drag, not a selection. A click pulses the existing
cursor to half size and Let’s talk color and back over 460ms. Home and visitor arcs
share a 650ms arrival clock, regardless of length; destination labels appear only
after arrival. Within the same-country 120km threshold, one home-to-destination
route and distance label replace the near-identical pair. Other origins within
1,800km have opposite lateral route offsets that taper to zero at both endpoints.
Exploration labels show distance only, without Me/You prefixes.
Removal retracts the routes in 330ms. Replacement finishes the
retraction before drawing the next pair. Reduced motion skips the choreography.

`public/data/globe-places.json` contains 7,342 local city references from Natural
Earth's public-domain populated places dataset. `node scripts/generate-globe-places.mjs`
regenerates it. Names within 120km are explicitly “Near City, Country”; other
points show their actual clicked latitude/longitude instead of inventing a city
for an ocean or remote region. No click data goes to an external geocoder.
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places_simple.geojson

Exploration-only jokes rotate across the seven approved phrases. Numeric jokes
use explicit illustrative reference lengths, documented in `app/lib/globe-play.ts`
and exposed through label tooltips. They are mathematically converted lengths,
not claims that every animal/object has exactly that size. The pigeon phrase is
explicitly non-measurement humor.
