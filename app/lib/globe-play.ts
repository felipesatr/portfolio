import { exactDistanceKm, greatCircle, type Coordinate, type Vector } from './globe-geometry';

export type GlobeCity = [name: string, country: string, latitude: number, longitude: number];
// Other sizes are explicit illustrative references, not universal averages.
export const STEP_METERS = 1;
const units = [
  { phrase: 'very determined snails', meters: .04, basis: 'one 4 cm snail' },
  { phrase: 'capybaras respecting personal space', meters: 1.2, basis: 'one 1.2 m capybara, end to end; no additional gap' },
  { phrase: 'rubber ducks in a row', meters: .09, basis: 'one 9 cm toy duck' },
  { phrase: 'pizzas nobody’s sharing', meters: .3048, basis: 'one 12-inch / 30.48 cm pizza' },
  { phrase: 'keyboards, minus the cables', meters: .44, basis: 'one 44 cm keyboard' },
  { phrase: 'socks looking for their partners', meters: .25, basis: 'one 25 cm sock laid flat' },
  { phrase: 'one pigeon with excellent commitment', meters: null, basis: 'A joke, not a measurement conversion.' },
];
export function stepDistance(km: number) { return `${Math.round(km * 1000 / STEP_METERS).toLocaleString('en-US')} steps`; }
export function catDistance(km: number) { return `or ${Math.round(km * 1000 / .46).toLocaleString('en-US')} cats, if they cooperated`; }
export function playfulDistance(km: number, index: number) {
  const unit = units[index % units.length];
  return { text: unit.meters ? `or ${Math.round(km * 1000 / unit.meters).toLocaleString('en-US')} ${unit.phrase}` : `or ${unit.phrase}`, basis: unit.meters ? `Illustrative conversion using ${unit.basis}. Rounded to the nearest whole item.` : unit.basis };
}
export function formatDistance(km: number) {
  const number = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 1 : 0 });
  return `${number(km)} km / ${number(km / 1.609344)} mi`;
}
export function coordinateLabel([lat, lon]: Coordinate) { return `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(1)}°${lon < 0 ? 'W' : 'E'}`; }
export function nameClickedPoint(coordinates: Coordinate, cities: GlobeCity[]) {
  let nearest: GlobeCity | undefined, distance = Infinity;
  for (const city of cities) {
    const km = exactDistanceKm(coordinates, [city[2], city[3]]);
    if (km < distance) { nearest = city; distance = km; }
  }
  return nearest && distance <= 120 ? `Near ${nearest[0]}, ${nearest[1]}` : coordinateLabel(coordinates);
}
export function makeGlobeArc(from: Vector, to: Vector, height?: number, spread = 0) {
  const angle = Math.acos(Math.min(1, Math.max(-1, from.reduce((sum, v, i) => sum + v * to[i], 0))));
  const cross = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  const crossLength = Math.hypot(...cross);
  const normal = crossLength > 1e-6 ? cross.map((v) => v / crossLength) : [0, 1, 0];
  return Array.from({ length: 101 }, (_, i) => {
    const t = i / 100, point = greatCircle(from, to, t);
    const arch = Math.sin(Math.PI * t);
    const elevation = 1 + arch * (height ?? Math.min(.23, .05 + angle * .09));
    const widened = point.map((v, j) => v + normal[j] * spread * arch);
    const length = Math.hypot(...widened);
    return widened.map((v) => v / length * elevation) as unknown as Vector;
  });
}

export function makeExplorationArcs(home: Vector, visitor: Vector | null, destination: Vector, nearby: boolean, separationKm: number) {
  if (!visitor || nearby) return [makeGlobeArc(home, destination)];
  const spread = separationKm < 1800 ? .065 * (1 - separationKm / 1800) : 0;
  return [makeGlobeArc(home, destination, undefined, spread), makeGlobeArc(visitor, destination, undefined, -spread)];
}
