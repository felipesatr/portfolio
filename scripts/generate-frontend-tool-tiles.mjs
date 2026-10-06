import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const size = 56;
const assetsDir = path.resolve("public/images/tool-logos");

// Tile artboards reproduce the current card colors, logo proportions, and
// optical padding. Each SVG is saved beside its WebP so it remains editable.
const tools = [
  { name: "javascript", source: "devicon-javascript-javascript-original.svg", scale: 100 },
  { name: "typescript", source: "devicon-typescript-typescript-original.svg", scale: 100 },
  { name: "html", source: "devicon-html5-html5-original.svg", background: "#f16529", scale: 81.5 },
  { name: "css", source: "devicon-css3-css3-original.svg", background: "#0096dc", scale: 81.5 },
  { name: "vite", source: "devicon-vitejs-vitejs-original.svg", background: "#ffffff", scale: 84 },
  { name: "react", source: "devicon-react-react-original.svg", background: "#20232a", scale: 82 },
  { name: "node", source: "devicon-nodejs-nodejs-original.svg", background: "#ffffff", scale: 81.5 },
  { name: "threejs", source: "devicon-threejs-threejs-original.svg", background: "#111111", scale: 82, fill: "#ffffff" },
  { name: "git", source: "devicon-git-git-original.svg", background: "#ffffff", scale: 81.5 },
  { name: "webflow", source: "webflow-mark-blue.svg", background: "#146ef5", scale: 72, replaceFill: ["#146EF5", "#ffffff"] },
  { name: "framer", source: "framer-icon-white.svg", background: "#000000", scale: 58, viewBox: "0 0 192 288" },
  { name: "wordpress", source: "devicon-wordpress-wordpress-plain.svg", background: "#21759b", scale: 80, replaceFill: ["#494949", "#ffffff"] },
];

function buildTileSvg(tool) {
  const source = fs.readFileSync(path.join(assetsDir, tool.source), "utf8");
  const rootTag = source.match(/<svg\b([^>]*)>/i)?.[0];
  const sourceViewBox = tool.viewBox ?? rootTag?.match(/\bviewBox="([^"]+)"/i)?.[1];
  if (!rootTag || !sourceViewBox) throw new Error(`Missing SVG root or viewBox for ${tool.name}`);

  let artwork = source.slice(source.indexOf(rootTag) + rootTag.length, source.lastIndexOf("</svg>"));
  if (tool.replaceFill) {
    const [from, to] = tool.replaceFill;
    artwork = artwork.replaceAll(from, to).replaceAll(from.toLowerCase(), to);
  }

  const inset = size * (1 - tool.scale / 100) / 2;
  const background = tool.background ? `<rect width="${size}" height="${size}" fill="${tool.background}"/>` : "";
  const inheritedFill = tool.fill ? ` fill="${tool.fill}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background}<svg x="${inset}" y="${inset}" width="${tool.scale}%" height="${tool.scale}%" viewBox="${sourceViewBox}" preserveAspectRatio="xMidYMid meet"${inheritedFill}>${artwork}</svg></svg>`;
}

const requestedTools = process.argv.slice(2);
const selectedTools = requestedTools.length
  ? tools.filter((tool) => requestedTools.includes(tool.name))
  : tools;

if (requestedTools.some((name) => !tools.some((tool) => tool.name === name))) {
  throw new Error(`Unknown frontend tool: ${requestedTools.find((name) => !tools.some((tool) => tool.name === name))}`);
}

for (const tool of selectedTools) {
  const baseName = `frontend-${tool.name}-tile`;
  const svgPath = path.join(assetsDir, `${baseName}.svg`);
  const webpPath = path.join(assetsDir, `${baseName}.webp`);
  const svg = buildTileSvg(tool);

  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 288 })
    .resize(size, size, { fit: "fill" })
    .webp({ lossless: true, effort: 6 })
    .toFile(webpPath);

  console.log(`${tool.name}: ${baseName}.svg -> ${baseName}.webp (${size}x${size})`);
}
