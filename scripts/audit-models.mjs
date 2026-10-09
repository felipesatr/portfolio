import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import console from 'node:console';

// Read-only inventory of the exact gallery, not stale files in the model folder.
const source = readFileSync(resolve('app/components/home-sections.tsx'), 'utf8');
const entries = [...source.matchAll(/\{ name: "([^"]+)", model: "([^"]+)"/g)];
const rows = entries.map(([, name, file]) => {
  const buffer = readFileSync(resolve('public', file));
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`Not a GLB: ${file}`);
  const length = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + length).toString());
  let triangles = 0, primitives = 0, vertices = 0;
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    primitives++;
    vertices += gltf.accessors[primitive.attributes.POSITION]?.count ?? 0;
    const count = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION]?.count ?? 0;
    if ((primitive.mode ?? 4) === 4) triangles += count / 3;
  }
  const imageBytes = (gltf.images ?? []).reduce((sum, image) => sum + (gltf.bufferViews?.[image.bufferView]?.byteLength ?? 0), 0);
  const optimizedPath = resolve('public/models/optimized', basename(file));
  const optimizedMB = existsSync(optimizedPath) ? +(readFileSync(optimizedPath).length / 1048576).toFixed(1) : null;
  return { name, MB: +(buffer.length / 1048576).toFixed(1), optimizedMB, triangles: Math.round(triangles), primitives, vertices, images: gltf.images?.length ?? 0, imageMB: +(imageBytes / 1048576).toFixed(1) };
});
console.table(rows);
console.log(`Total GLB transfer: ${rows.reduce((sum, row) => sum + row.MB, 0).toFixed(1)} MB (only current and adjacent cars are retained).`);
console.log(`Optimized assets: ${rows.reduce((sum, row) => sum + (row.optimizedMB ?? row.MB), 0).toFixed(1)} MB.`);
