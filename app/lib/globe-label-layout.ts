export type GlobeLabelBox = { id: string; x: number; y: number; width: number; height: number; alpha: number; priority?: number; previousY?: number };
export type GlobeLabelPointer = { x: number; y: number; revision: number; inside: boolean };
export type GlobeLabelHover = { id: string | null; blockedRevision: number; outsideSince: number | null };

// After a hover closes, physical pointer movement is required to acquire again.
// Layout changes alone cannot repeatedly reopen it under a stationary pointer.
export function updateGlobeLabelHover(state: GlobeLabelHover, pointer: GlobeLabelPointer, boxes: GlobeLabelBox[], now: number): GlobeLabelHover {
  const contains = (box: GlobeLabelBox, padding: number) => box.alpha > .85 &&
    Math.abs(pointer.x - box.x) <= box.width / 2 + padding &&
    pointer.y >= box.y - box.height - padding && pointer.y <= box.y + padding;
  if (!pointer.inside) return { id: null, blockedRevision: pointer.revision, outsideSince: null };
  if (state.id) {
    const current = boxes.find((box) => box.id === state.id);
    if (current && contains(current, 8)) return { ...state, outsideSince: null };
    const outsideSince = state.outsideSince ?? now;
    if (current && current.alpha > .85 && now - outsideSince < 120) return { ...state, outsideSince };
    return { id: null, blockedRevision: pointer.revision, outsideSince: null };
  }
  if (pointer.revision <= state.blockedRevision) return state;
  const target = [...boxes].reverse().find((box) => contains(box, 0));
  return target ? { id: target.id, blockedRevision: state.blockedRevision, outsideSince: null } : state;
}
export function separateGlobeLabels(labels: GlobeLabelBox[], width: number, height: number, bounds = { left: 0, right: width, top: 0, bottom: height }) {
  const result = labels.map((label) => ({ ...label }));
  const clampY = (item: GlobeLabelBox, y: number) => Math.max(bounds.top + item.height + 4, Math.min(bounds.bottom - 4, y));
  result.forEach((item) => {
    const half = Math.min((bounds.right - bounds.left) / 2 - 4, item.width / 2 + 4);
    item.x = Math.max(bounds.left + half, Math.min(bounds.right - half, item.x));
    item.y = clampY(item, item.y);
  });
  const collides = (a: GlobeLabelBox, b: GlobeLabelBox) =>
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 10 &&
    Math.min(a.y, b.y) - Math.max(a.y - a.height, b.y - b.height) + 8 > .01;
  // Place the hovered/expanded pill first. Every lower-priority pill gets the
  // closest free vertical slot; it can never push the active pill out of place.
  const ordered = result.filter((item) => item.alpha >= .1).sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0) || Number(b.id === "distance") - Number(a.id === "distance"));
  const placed: GlobeLabelBox[] = [];
  ordered.forEach((item) => {
    const origin = item.y;
    const previous = item.previousY ?? origin;
    const candidates = [origin, ...placed.flatMap((other) => [other.y - other.height - 8, other.y + item.height + 8])]
      .map((y) => clampY(item, y)).sort((a, b) =>
        (Math.abs(a - origin) + .9 * Math.abs(a - previous)) - (Math.abs(b - origin) + .9 * Math.abs(b - previous)) || a - b);
    const free = (candidate: number) => !placed.some((other) => collides({ ...item, y: candidate }, other));
    // Retain vertical ordering while pills share horizontal space. Otherwise a
    // new nearest slot can alternate above/below and animate through its neighbor.
    const clearTravel = (candidate: number) => item.previousY === undefined || !placed.some((other) => {
      if (collides({ ...item, y: previous }, other)) return false;
      return collides({ ...item, y: Math.max(previous, candidate), height: item.height + Math.abs(candidate - previous) }, other);
    });
    const y = candidates.find((candidate) => free(candidate) && clearTravel(candidate));
    // Very short viewports may not have room for every pill. A lower-priority
    // pill waits for space rather than covering the label being read.
    if (y === undefined) { item.alpha = 0; return; }
    item.y = y;
    placed.push(item);
  });
  return result;
}
