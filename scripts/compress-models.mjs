import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Lossless EXT_meshopt_compression. Originals, textures, materials, vertex
// precision, triangle order and author metadata are never changed.
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const source = readFileSync(resolve('app/components/home-sections.tsx'), 'utf8');
const cars = [...source.matchAll(/\{ name: "([^"]+)", model: "([^"]+)"/g)];
const outputDirectory = resolve('public/models/optimized');
mkdirSync(outputDirectory, { recursive: true });
let before = 0, after = 0, verified = 0;
for (const [, name, path] of cars) {
  const input = readFileSync(resolve('public', path));
  assert.equal(input.readUInt32LE(0), 0x46546c67);
  const jsonLength = input.readUInt32LE(12);
  const gltf = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
  assert.equal(gltf.buffers.length, 1, `${name}: expected one embedded buffer`);
  assert.ok(!gltf.buffers[0].uri);
  assert.ok(!gltf.extensionsUsed?.includes('EXT_meshopt_compression'));
  const binaryStart = 20 + jsonLength + 8;
  const binary = input.subarray(binaryStart);
  const images = new Set((gltf.images ?? []).map(image => image.bufferView));
  const indexedViews = new Map();
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    if (primitive.indices === undefined) continue;
    const accessor = gltf.accessors[primitive.indices];
    const stride = accessor.componentType === 5125 ? 4 : accessor.componentType === 5123 ? 2 : 1;
    indexedViews.set(accessor.bufferView, stride);
  }
  const chunks = [];
  let length = 0, fallbackLength = 0, compressedCount = 0;
  const append = bytes => {
    const offset = length;
    chunks.push(Buffer.from(bytes));
    length += bytes.length;
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    return offset;
  };
  for (const [index, view] of gltf.bufferViews.entries()) {
    const raw = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    let stride = view.byteStride;
    let mode = 'ATTRIBUTES';
    if (indexedViews.has(index)) { stride = indexedViews.get(index); mode = 'INDICES'; }
    if (!stride) {
      const accessors = gltf.accessors.filter(accessor => accessor.bufferView === index);
      if (accessors.length === 1 && !accessors[0].byteOffset) stride = view.byteLength / accessors[0].count;
      else stride = 4;
    }
    const canCompress = !images.has(index) && Number.isInteger(stride) && view.byteLength % stride === 0 &&
      (mode === 'INDICES' ? stride === 2 || stride === 4 : stride % 4 === 0 && stride <= 256);
    if (canCompress) {
      const count = raw.length / stride;
      const encoded = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode, 0);
      const decoded = new Uint8Array(raw.length);
      MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode, 'NONE');
      assert.deepEqual(Buffer.from(decoded), raw, `${name}: buffer view ${index} changed`);
      if (encoded.length + 64 < raw.length) {
        const offset = append(encoded);
        view.buffer = 1;
        view.byteOffset = fallbackLength;
        fallbackLength += (raw.length + 3) & ~3;
        view.extensions = { ...view.extensions, EXT_meshopt_compression: { buffer: 0, byteOffset: offset, byteLength: encoded.length, byteStride: stride, count, mode, filter: 'NONE' } };
        compressedCount++; verified++;
        continue;
      }
    }
    view.buffer = 0;
    view.byteOffset = append(raw);
  }
  gltf.buffers = [{ byteLength: length }];
  if (compressedCount) {
    gltf.buffers.push({ byteLength: fallbackLength, extensions: { EXT_meshopt_compression: { fallback: true } } });
    gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), 'EXT_meshopt_compression'])];
    gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), 'EXT_meshopt_compression'])];
  }
  const jsonBytes = Buffer.from(JSON.stringify(gltf));
  const paddedJSON = Buffer.alloc((jsonBytes.length + 3) & ~3, 0x20);
  jsonBytes.copy(paddedJSON);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + paddedJSON.length + length, 8);
  header.writeUInt32LE(paddedJSON.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
  const output = Buffer.concat([header, paddedJSON, binaryHeader, ...chunks]);
  writeFileSync(resolve(outputDirectory, basename(path)), output);
  before += input.length; after += output.length;
  console.log(`${name}: ${(input.length / 1048576).toFixed(1)} -> ${(output.length / 1048576).toFixed(1)} MB (${compressedCount} compressed views)`);
}
console.log(`Total ${(before / 1048576).toFixed(1)} -> ${(after / 1048576).toFixed(1)} MB; ${((1 - after / before) * 100).toFixed(1)}% smaller. ${verified} views verified byte-for-byte with the browser decoder.`);
