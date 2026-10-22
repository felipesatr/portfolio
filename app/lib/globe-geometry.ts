export type Coordinate = readonly [number, number];
export type Vector = readonly [number, number, number];
const radians = (degrees: number) => degrees * Math.PI / 180;

export function exactDistanceKm(a: Coordinate, b: Coordinate) {
  const h = Math.sin(radians(b[0] - a[0]) / 2) ** 2 + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(radians(b[1] - a[1]) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function distanceKm(a: Coordinate, b: Coordinate) { return Math.round(exactDistanceKm(a, b)); }

/** Inverse of the orthographic camera, front hemisphere only. */
export function unproject(x: number, y: number, yaw: number, tilt: number): Coordinate | null {
  if (x * x + y * y > 1) return null;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const worldY = Math.cos(tilt) * y + Math.sin(tilt) * z;
  const depth = -Math.sin(tilt) * y + Math.cos(tilt) * z;
  const worldX = Math.cos(yaw) * x + Math.sin(yaw) * depth;
  const worldZ = -Math.sin(yaw) * x + Math.cos(yaw) * depth;
  return [Math.asin(Math.max(-1, Math.min(1, worldY))) * 180 / Math.PI, Math.atan2(worldX, worldZ) * 180 / Math.PI];
}
export function spherePoint([latitude, longitude]: Coordinate): Vector {
  const lat = radians(latitude), lon = radians(longitude);
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}
export function cameraFor(point: Vector) {
  return { yaw: Math.atan2(point[0], point[2]), tilt: Math.atan2(point[1], Math.hypot(point[0], point[2])) };
}
export function project(point: Vector, yaw: number, tilt: number): Vector {
  const x = Math.cos(yaw) * point[0] - Math.sin(yaw) * point[2];
  const depth = Math.sin(yaw) * point[0] + Math.cos(yaw) * point[2];
  return [x, Math.cos(tilt) * point[1] - Math.sin(tilt) * depth, Math.sin(tilt) * point[1] + Math.cos(tilt) * depth];
}
export function greatCircle(a: Vector, b: Vector, t: number): Vector {
  const dot = Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0)));
  const angle = Math.acos(dot);
  if (angle < .00001) return a;
  // A deterministic perpendicular resolves the otherwise ambiguous antipode.
  if (Math.PI - angle < .00001) {
    const axis: Vector = Math.abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
    const cross = [a[1] * axis[2] - a[2] * axis[1], a[2] * axis[0] - a[0] * axis[2], a[0] * axis[1] - a[1] * axis[0]];
    const length = Math.hypot(...cross);
    return a.map((v, i) => v * Math.cos(Math.PI * t) + cross[i] / length * Math.sin(Math.PI * t)) as unknown as Vector;
  }
  const from = Math.sin((1 - t) * angle) / Math.sin(angle), to = Math.sin(t * angle) / Math.sin(angle);
  return a.map((value, i) => value * from + b[i] * to) as unknown as Vector;
}

export function decodeLand(data: { samples: number; indices: string }): Vector[] {
  const raw = atob(data.indices), points: Vector[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const index = raw.charCodeAt(i) | raw.charCodeAt(i + 1) << 8;
    const lat = Math.asin(1 - 2 * (index + .5) / data.samples) * 180 / Math.PI;
    const lon = ((index * 137.50776405003785) % 360) - 180;
    points.push(spherePoint([lat, lon]));
  }
  return points;
}
