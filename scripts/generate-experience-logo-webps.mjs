import path from "node:path";
import sharp from "sharp";

const assetsDir = path.resolve("public/images");
const outputSize = 128;
const logos = [
  "nmg-logo.png",
  "galgo-logo-400.png",
  "une-logo.svg",
  "uniandes-logo.svg",
];

for (const sourceName of logos) {
  const sourcePath = path.join(assetsDir, sourceName);
  const outputName = `${path.parse(sourceName).name}-128.webp`;
  const outputPath = path.join(assetsDir, outputName);
  const sourceOptions = sourceName.endsWith(".svg") ? { density: 288 } : {};

  await sharp(sourcePath, sourceOptions)
    .resize(outputSize, outputSize, {
      fit: "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath);

  console.log(`${sourceName} -> ${outputName} (${outputSize}x${outputSize})`);
}
