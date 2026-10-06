import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const size = 56;
const assetsDir = path.resolve("public/images/tool-logos");

function wrapSourceSvg(source) {
  const rootTag = source.match(/<svg\b([^>]*)>/i)?.[0];
  const viewBox = rootTag?.match(/\bviewBox="([^"]+)"/i)?.[1];
  if (!rootTag || !viewBox) throw new Error("Adobe XD SVG needs a root and viewBox.");

  const artwork = source.slice(source.indexOf(rootTag) + rootTag.length, source.lastIndexOf("</svg>"));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><svg x="0" y="0" width="${size}" height="${size}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${artwork}</svg></svg>`;
}

function buildWhitePaddedTile(source, scale) {
  const rootTag = source.match(/<svg\b([^>]*)>/i)?.[0];
  const viewBox = rootTag?.match(/\bviewBox="([^"]+)"/i)?.[1];
  if (!rootTag || !viewBox) throw new Error("Logo SVG needs a root and viewBox.");

  const artwork = source.slice(source.indexOf(rootTag) + rootTag.length, source.lastIndexOf("</svg>"));
  const logoSize = size * scale;
  const inset = (size - logoSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><svg x="${inset}" y="${inset}" width="${logoSize}" height="${logoSize}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${artwork}</svg></svg>`;
}

async function saveWhitePaddedTile(name, sourcePath, scale) {
  const tileSvg = buildWhitePaddedTile(fs.readFileSync(sourcePath, "utf8"), scale);
  await fs.promises.writeFile(path.join(assetsDir, `uxui-${name}-tile.svg`), tileSvg, "utf8");
  await sharp(Buffer.from(tileSvg), { density: 288 })
    .resize(size, size, { fit: "fill" })
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(assetsDir, `uxui-${name}-tile.webp`));
}

function icoAsPngBuffer(icoPath) {
  const escapedPath = icoPath.replaceAll("'", "''");
  const powershell = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.Drawing",
    `$image=[System.Drawing.Bitmap]::new('${escapedPath}')`,
    "try { $stream=[System.IO.MemoryStream]::new(); try { $image.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($stream.ToArray()) } finally { $stream.Dispose() } } finally { $image.Dispose() }",
  ].join("; ");
  const base64 = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", powershell], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
  return Buffer.from(base64, "base64");
}

const xdPath = path.join(assetsDir, "uxui-adobe-xd-source.svg");
const xdSvg = wrapSourceSvg(fs.readFileSync(xdPath, "utf8"));
await fs.promises.writeFile(path.join(assetsDir, "uxui-adobe-xd-tile.svg"), xdSvg, "utf8");
await sharp(Buffer.from(xdSvg), { density: 288 })
  .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ lossless: true, effort: 6 })
  .toFile(path.join(assetsDir, "uxui-adobe-xd-tile.webp"));

await saveWhitePaddedTile("figma", path.join(assetsDir, "devicon-figma-figma-original.svg"), 0.68);
await saveWhitePaddedTile("sketch", path.join(assetsDir, "uxui-sketch-source.svg"), 0.78);

const devtoolsPng = icoAsPngBuffer(path.join(assetsDir, "uxui-devtools-source.ico"));
const devtoolsSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${devtoolsPng.toString("base64")}"/></svg>`;
await fs.promises.writeFile(path.join(assetsDir, "uxui-devtools-tile.svg"), devtoolsSvg, "utf8");
await sharp(Buffer.from(devtoolsSvg), { density: 288 })
  .resize(size, size, { fit: "fill" })
  .webp({ lossless: true, effort: 6 })
  .toFile(path.join(assetsDir, "uxui-devtools-tile.webp"));

console.log("Generated UX/UI tiles (56×56 WebP plus editable SVG masters).");
