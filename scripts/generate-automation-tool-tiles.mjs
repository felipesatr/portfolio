import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const size = 56;
const assetsDir = path.resolve("public/images/tool-logos");

// These tile artboards bake in the current Automation card's SVG sources,
// backgrounds, padding, and the Sheets 180-degree orientation. Source SVGs and
// composed tile SVGs stay beside the WebPs so the exports are easy to revise.
const tools = [
  { name: "chatgpt", sourceFile: "openai-blossom-white.svg", background: "#ffffff", scale: 100 },
  { name: "claude", sourceFile: "claude-symbol.svg", background: "#d97757", scale: 68, rootFill: "#ffffff" },
  { name: "n8n", sourceFile: "n8n-symbol-tile.svg", background: "#ffffff", scale: 100 },
  { name: "notion", sourceUrl: "https://cdn.simpleicons.org/notion/FFFFFF", background: "#111111", scale: 70 },
  { name: "obsidian", sourceUrl: "https://cdn.simpleicons.org/obsidian/FFFFFF", background: "#7c3aed", scale: 64 },
  { name: "google-sheets", sourceFile: "google-sheets-2026.svg", background: "#ffffff", scale: 78, rotate: 180 },
  { name: "supabase", sourceFile: "supabase.svg", background: "#000000", scale: 68 },
  { name: "google-drive", sourceUrl: "https://thesvg.org/icons/google-drive-2026/default.svg", background: "#ffffff", scale: 74 },
  { name: "mailchimp", sourceUrl: "https://cdn.simpleicons.org/mailchimp/000000", background: "#ffe01b", scale: 70 },
  { name: "stripe", sourceUrl: "https://cdn.simpleicons.org/stripe/FFFFFF", background: "#635bff", scale: 62 },
];

function svgRoot(source, name) {
  const match = source.match(/<svg\b([^>]*)>/i);
  const viewBox = match?.[1].match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  if (!match || !viewBox) throw new Error(`Missing SVG root or viewBox for ${name}`);
  return { tag: match[0], attrs: match[1], viewBox };
}

function preservedRootAttributes(attrs) {
  const keep = new Set([
    "fill", "fill-rule", "clip-rule", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset",
    "style", "color", "shape-rendering",
  ]);
  return [...attrs.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)]
    .filter(([, name]) => keep.has(name))
    .map(([, name, doubleQuoted, singleQuoted]) => `${name}="${doubleQuoted ?? singleQuoted}"`)
    .join(" ");
}

async function loadSource(tool) {
  if (tool.sourceUrl) {
    const response = await fetch(tool.sourceUrl);
    if (!response.ok) throw new Error(`Could not fetch ${tool.name} SVG: ${response.status}`);
    const source = await response.text();
    fs.writeFileSync(path.join(assetsDir, `automation-${tool.name}-source.svg`), source, "utf8");
    return source;
  }
  return fs.readFileSync(path.join(assetsDir, tool.sourceFile), "utf8");
}

function buildTileSvg(tool, source) {
  const root = svgRoot(source, tool.name);
  const body = source.slice(source.indexOf(root.tag) + root.tag.length, source.lastIndexOf("</svg>"));
  const preserved = preservedRootAttributes(root.attrs);
  const preservedWithoutFill = preserved.replace(/\bfill="[^"]*"/, "").trim();
  const rootFill = tool.rootFill
    ? ` ${preservedWithoutFill} fill="${tool.rootFill}"`.trim()
    : preserved ? ` ${preserved}` : "";
  const inset = size * (1 - tool.scale / 100) / 2;
  const rotation = tool.rotate ? ` transform="rotate(${tool.rotate} ${size / 2} ${size / 2})"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${tool.background}"/><svg x="${inset}" y="${inset}" width="${tool.scale}%" height="${tool.scale}%" viewBox="${root.viewBox}" preserveAspectRatio="xMidYMid meet"${rootFill ? ` ${rootFill}` : ""}${rotation}>${body}</svg></svg>`;
}

for (const tool of tools) {
  const source = await loadSource(tool);
  const svg = buildTileSvg(tool, source);
  const baseName = `automation-${tool.name}-tile`;
  const svgPath = path.join(assetsDir, `${baseName}.svg`);
  const webpPath = path.join(assetsDir, `${baseName}.webp`);

  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 288 })
    .resize(size, size, { fit: "fill" })
    .webp({ lossless: true, effort: 6 })
    .toFile(webpPath);

  console.log(`${tool.name}: ${baseName}.svg -> ${baseName}.webp (${size}x${size})`);
}
