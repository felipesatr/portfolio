// Reproducible, build-time data preparation, not a browser dependency.
// Natural Earth land outlines are public domain. No COBE data/code is used.
import { mkdir, writeFile } from "node:fs/promises";

const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const response = await fetch(source);
if (!response.ok) throw new Error(`Natural Earth download: ${response.status}`);
const data = await response.json();
const polygons = data.features.flatMap(({ geometry }) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates)
  .map((rings) => ({ rings, bounds: rings[0].reduce(([x0, y0, x1, y1], [x, y]) => [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)], [180, 90, -180, -90]) }));
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const samples = 18000, indices = [];
for (let i = 0; i < samples; i++) {
  const lat = Math.asin(1 - 2 * (i + .5) / samples) * 180 / Math.PI;
  const lon = ((i * 137.50776405003785) % 360) - 180;
  const onLand = polygons.some(({ rings, bounds: [x0, y0, x1, y1] }) => lon >= x0 && lon <= x1 && lat >= y0 && lat <= y1 && inRing(lon, lat, rings[0]) && !rings.slice(1).some((ring) => inRing(lon, lat, ring)));
  if (onLand) indices.push(i);
}
const bytes = Buffer.alloc(indices.length * 2);
indices.forEach((value, index) => bytes.writeUInt16LE(value, index * 2));
const target = new URL("../public/data/globe-land.json", import.meta.url);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, JSON.stringify({ source, license: "Natural Earth: public domain", samples, indices: bytes.toString("base64") }) + "\n");
console.log(`Generated ${indices.length} land dots; ${bytes.length} bytes of packed indices.`);
