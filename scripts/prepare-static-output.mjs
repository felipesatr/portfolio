import { copyFile, cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new globalThis.URL("../build/client/", import.meta.url));
const canonicalOrigin = "https://felipesatr.github.io/portfolio";
const pagesBasePath = globalThis.process.env.PORTFOLIO_BASE_PATH;

async function rewriteAssetPaths(directory, basePath) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteAssetPaths(absolutePath, basePath);
    } else if (entry.isFile() && /\.(?:html|js|data)$/.test(entry.name)) {
      const original = await readFile(absolutePath, "utf8");
      const updated = original.replaceAll("/assets/", `${basePath}assets/`);
      if (updated !== original) await writeFile(absolutePath, updated, "utf8");
    }
  }
}

if (pagesBasePath) {
  if (pagesBasePath !== "/portfolio/") throw new Error("Unexpected Pages base path");
  // React Router currently nests prerendered files under its basename. Pages
  // expects index.html at the root of the uploaded artifact instead.
  const nestedOutput = join(outputDirectory, "portfolio");
  for (const entry of await readdir(nestedOutput)) {
    await cp(join(nestedOutput, entry), join(outputDirectory, entry), { recursive: true, force: true });
  }
  await rm(nestedOutput, { recursive: true });
  await rewriteAssetPaths(outputDirectory, pagesBasePath);
}

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

const fallback = join(outputDirectory, pagesBasePath ? "index.html" : "__spa-fallback.html");
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
