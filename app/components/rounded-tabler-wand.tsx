import type { SVGProps } from "react";
import { ICON_CORNER_RADIUS } from "~/lib/icon-settings";

export function RoundedTablerWand({ size = 24, width = size, height = size, strokeWidth = 1.8, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  const offset = Math.min(2.1, Math.max(0, ICON_CORNER_RADIUS)) / Math.SQRT2;
  const d = `M${6 + offset} ${21 - offset}L${21 - offset} ${6 + offset}Q21 6 ${21 - offset} ${6 - offset}L${18 + offset} ${3 + offset}Q18 3 ${18 - offset} ${3 + offset}L${3 + offset} ${18 - offset}Q3 18 ${3 + offset} ${18 + offset}L${6 - offset} ${21 - offset}Q6 21 ${6 + offset} ${21 - offset}Z`;
  return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d={d} />
    <path d="m15 6 3 3M9 3a2 2 0 0 0 2 2 2 2 0 0 0-2 2 2 2 0 0 0-2-2 2 2 0 0 0 2-2M19 13a2 2 0 0 0 2 2 2 2 0 0 0-2 2 2 2 0 0 0-2-2 2 2 0 0 0 2-2" />
  </svg>;
}
