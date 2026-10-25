# About values: geometric SVG animation brief

Reference inspected: https://www.eliotbesson.com/about (21 October 2026).
The public script plays Lottie SVG timelines forward, then reverses playback
on every complete event. Its trophy asset uses trim paths, independently moving
handles and eased part-by-part assembly. The asset is 160 frames at 100fps.

## Implementation prompt

Animate the existing six Tabler SVG icons in What matters to me. Keep their
artwork, 64px dimensions, stroke weight, almost-white color and layout. Do not
import the reference's artwork, Lottie files or animation runtime.

Use actual SVG stroke drawing, never a whole-icon opacity fade or scale pop.
Measure each path in pixels and animate its exposed length from zero to full.
Give related paths purposeful windows inside one shared 860ms playhead:
heart outline before clasp details; compass ring before ticks and needle;
scan corners before person; first collaborator before second; accessible
outline before person; diamond outline before reflected highlight.

Use smooth acceleration/deceleration. Only move parts meaningfully: the compass
needle settles, scan brackets move inward, and the second person joins their
peer. Do not rotate every path or generically move the entire icon.

Hold the complete icon for a randomized 2600–4400ms, then run exactly the same
playhead backwards over 860ms. The paths must visibly undraw from their ends
and all movements must retrace the forward motion. No reset, crossfade or
instant disappearance as a substitute for reverse. Pause only 140ms while
empty, then redraw. Independent 160–900ms initial offsets and independent hold
durations prevent lockstep loops. The long pause belongs to the complete icon.

Keep the section fade/unblur separate. Begin drawing after the containing item
has revealed. Pause offscreen/in background tabs, clean up on unmount, and use
static complete icons for reduced motion. Keep the cursor SVG mask synchronized
with stroke offsets, visibility, fills and part transforms.

Acceptance: verify forward drawing and reverse erasure; stroke opacity stays
constant; reverse retraces forward; complete icons hold longer than they move;
there are no layout shifts or new animation-library dependencies.
