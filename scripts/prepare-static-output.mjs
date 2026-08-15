import { copyFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new globalThis.URL("../build/client/", import.meta.url));
const canonicalOrigin = "https://portfolio.example";

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtml(absolutePath)));
    if (entry.isFile() && entry.name === "index.html") files.push(absolutePath);
  }

  return files;
}

const fallback = join(outputDirectory, "__spa-fallback.html");
await copyFile(fallback, join(outputDirectory, "404.html"));

const htmlFiles = await collectHtml(outputDirectory);
const routes = htmlFiles
  .map((file) => relative(outputDirectory, file).split(sep).join("/"))
  .map((file) => file === "index.html" ? "/" : `/${file.replace(/\/index\.html$/, "")}`)
  .sort();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
  .map((route) => `  <url><loc>${canonicalOrigin}${route}</loc></url>`)
  .join("\n")}\n</urlset>\n`;

await writeFile(join(outputDirectory, "sitemap.xml"), sitemap, "utf8");
globalThis.console.log(`Prepared 404.html and sitemap.xml with ${routes.length} prerendered routes.`);
