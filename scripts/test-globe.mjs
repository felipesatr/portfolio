import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
// Run the actual pure TypeScript helpers without introducing a test dependency.
const cache = new Map();
function load(path) {
  path = resolve(path);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const js = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: (id) => load(resolve(dirname(path), `${id}.ts`)), atob }, { filename: path });
  return module.exports;
}
const geo = load('app/lib/globe-geometry.ts'), play = load('app/lib/globe-play.ts'), layout = load('app/lib/globe-label-layout.ts');
const location = load('app/lib/approximate-location.ts');
const bogota = { provider: 'first', city: 'Bogotá', region: 'Bogota D.C.', country: 'Colombia', countryCode: 'CO', coordinates: [4.711, -74.0721], network: 'Residential ISP' };
const corroborated = { ...bogota, provider: 'second', city: 'Bogota', coordinates: [4.72, -74.08] };
assert.equal(location.resolveApproximateLocation([bogota, corroborated]).precision, 'city', 'Accented city names agree across independent providers');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, city: 'Cota', region: 'Cundinamarca' }]).precision, 'country', 'Conflicting cities/regions do not pretend to pinpoint a city');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, city: 'Another city' }]).precision, 'region');
assert.equal(location.resolveApproximateLocation([bogota]).precision, 'country', 'A single provider cannot corroborate a city');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, proxy: true }]).precision, 'country');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, mobile: true }]).networkUncertain, true);
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, network: 'Example Mobile Network' }]).precision, 'country');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, cityConfidence: 40 }]).precision, 'region');
assert.equal(location.resolveApproximateLocation([bogota, { ...corroborated, countryCode: 'US' }]), null);
assert.equal(location.normalizeFreeIPAPISample({ countryName: 'Colombia', countryCode: 'CO', latitude: 200, longitude: 0 }), null);
assert.equal(location.normalizeIPWhoisSample({ success: true, country: 'Colombia', country_code: 'CO', latitude: '4.7', longitude: -74 }), null);
assert.equal(geo.exactDistanceKm([4.711, -74.0721], [4.711, -74.0721]), 0);
assert.ok(Math.abs(geo.exactDistanceKm([40.7128, -74.006], [51.5074, -.1278]) - 5570.23) < .1);
for (let i = 0; i < 100; i++) {
  const point = [-80 + i * 1.6, -175 + i * 3.5], camera = geo.cameraFor(geo.spherePoint(point));
  const view = geo.project(geo.spherePoint(point), camera.yaw, camera.tilt);
  const back = geo.unproject(view[0], view[1], camera.yaw, camera.tilt);
  assert.ok(geo.exactDistanceKm(point, back) < 1e-6);
}
assert.equal(geo.unproject(1, 1, 0, 0), null);
assert.equal(play.stepDistance(.001524), '2 steps');
assert.equal(play.stepDistance(1.23456), '1,235 steps');
assert.equal(play.catDistance(.46), 'or 1,000 cats, if they cooperated');
assert.equal(play.playfulDistance(1, 0).text, 'or 25,000 very determined snails');
assert.equal(play.playfulDistance(10, 6).text, 'or one pigeon with excellent commitment');
assert.equal(play.formatDistance(1.609344), '1.6 km / 1 mi');
const a = geo.spherePoint([4.711, -74.0721]), b = geo.spherePoint([48.8566, 2.3522]);
const route = play.makeGlobeArc(a, b);
assert.equal(route.length, 101);
assert.ok(Math.hypot(...route[50]) > 1);
assert.ok(Math.hypot(...route[0].map((v, i) => v - a[i])) < 1e-8);
assert.ok(Math.hypot(...route[100].map((v, i) => v - b[i])) < 1e-8);
const near = geo.spherePoint([4.8, -74]), destination = geo.spherePoint([35, 110]);
assert.equal(play.makeExplorationArcs(a, near, destination, true, 11).length, 1);
const split = play.makeExplorationArcs(a, geo.spherePoint([8, -74]), destination, false, 366);
assert.equal(split.length, 2);
assert.ok(Math.hypot(...split[0][50].map((v, i) => v - split[1][50][i])) > .05, 'Nearby origins fan apart mid-flight');
assert.ok(Math.hypot(...split[0][100].map((v, i) => v - split[1][100][i])) < 1e-8, 'Fanned routes meet at destination');
assert.ok(Math.hypot(...split[0][50]) > 1.15, 'Routes lift above the surface');
const labels = layout.separateGlobeLabels(['home', 'visitor', 'distance', 'picked', 'picked-home', 'picked-visitor'].map((id) => ({ id, x: 160, y: 160, width: 220, height: 28, alpha: 1 })), 330, 330);
for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
  assert.ok(Math.abs(labels[i].y - labels[j].y) >= 27, 'Coincident labels must separate');
}
for (const expandedWidth of [160, 280, 420]) {
  const boxes = layout.separateGlobeLabels([
    { id: 'home', x: 240, y: 160, width: expandedWidth, height: 28, alpha: 1, priority: 2 },
    ...['visitor', 'distance', 'picked', 'picked-home', 'picked-visitor'].map((id) => ({ id, x: 260, y: 160, width: 160, height: 28, alpha: 1 })),
  ], 600, 330, { left: 16, right: 480, top: 0, bottom: 330 });
  assert.equal(boxes[0].y, 160, 'Expanded label keeps priority at its moving anchor');
  assert.equal(boxes.filter((box) => box.alpha > 0).length, 6, 'Other labels are displaced while space exists');
  boxes.forEach((box, i) => {
    assert.ok(box.x - box.width / 2 >= 16 && box.x + box.width / 2 <= 480, 'Labels respect the adjacent content boundary');
    boxes.slice(i + 1).forEach((other) => {
      const overlapX = Math.abs(box.x - other.x) < (box.width + other.width) / 2;
      const overlapY = Math.min(box.y, other.y) > Math.max(box.y - box.height, other.y - other.height);
      assert.ok(!overlapX || !overlapY, 'Expanded labels never overlap displaced labels');
    });
  });
}
// Regression from errtt.mp4: an expanding distance pill reaches the selected
// purple place and its distance pill. Include outgoing, still-painted labels.
for (const width of [105, 150, 220, 323, 220, 150, 105]) {
  const videoLabels = layout.separateGlobeLabels([
    { id: 'distance', x: 214, y: 174, width, height: 28, alpha: 1, priority: 2 },
    { id: 'picked', x: 350, y: 190, width: 118, height: 32, alpha: .8 },
    { id: 'picked-home', x: 288, y: 238, width: 133, height: 28, alpha: 1 },
    { id: 'home', x: 210, y: 275, width: 115, height: 28, alpha: 1 },
  ], 538, 382);
  assert.equal(videoLabels[0].y, 174);
  videoLabels.forEach((a, i) => videoLabels.slice(i + 1).forEach((b) => {
    const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
    const overlapY = Math.min(a.y, b.y) > Math.max(a.y - a.height, b.y - b.height);
    assert.ok(!overlapX || !overlapY, 'Video regression: expanding and fading pills keep separate painted bounds');
  }));
}
// 43566.mp4: changing pill bounds under a stationary pointer must not generate
// a new hover session, even if contraction places another pill under it.
const pointer = { x: 200, y: 150, revision: 1, inside: true };
const hit = { id: 'distance', x: 200, y: 160, width: 110, height: 28, alpha: 1 };
const waiting = layout.updateGlobeLabelHover({ id: null, blockedRevision: -1, outsideSince: null }, pointer, [{ ...hit, x: 400 }], 0);
assert.equal(layout.updateGlobeLabelHover(waiting, pointer, [hit], 10).id, 'distance', 'Natural globe movement can start the first hover');
let hover = layout.updateGlobeLabelHover({ id: null, blockedRevision: -1, outsideSince: null }, pointer, [hit], 0);
assert.equal(hover.id, 'distance');
hover = layout.updateGlobeLabelHover(hover, pointer, [hit, { ...hit, id: 'neighbor' }], 16);
assert.equal(hover.id, 'distance', 'A nearby pill cannot take ownership during expansion');
const away = { ...hit, x: 400 };
hover = layout.updateGlobeLabelHover(hover, pointer, [away], 32);
assert.equal(hover.id, 'distance', 'Small exit grace absorbs moving bounds');
hover = layout.updateGlobeLabelHover(hover, pointer, [away], 170);
assert.equal(hover.id, null);
for (let time = 200; time < 1000; time += 16) {
  hover = layout.updateGlobeLabelHover(hover, pointer, [hit], time);
  assert.equal(hover.id, null, 'Layout-only reentry cannot restart the expansion cycle');
}
hover = layout.updateGlobeLabelHover(hover, { ...pointer, revision: 2 }, [hit], 1000);
assert.equal(hover.id, 'distance', 'A real pointer movement can acquire the label again');
const crossing = layout.separateGlobeLabels([
  { id: 'active', x: 200, y: 180, width: 320, height: 28, alpha: 1, priority: 3 },
  { id: 'neighbor', x: 210, y: 120, previousY: 240, width: 140, height: 28, alpha: 1 },
], 600, 400);
assert.ok(crossing[1].y >= 216, 'A displaced neighbor does not switch sides through the active pill');
console.log('PASS: location consensus, globe geometry/units/routes, collision layout, expansion ownership and stable neighboring slots.');
