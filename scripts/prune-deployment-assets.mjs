/** The static package contains only assets referenced by generated pages/styles. */
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
const root = resolve("dist");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((p) =>
    p.isDirectory() ? walk(resolve(dir, p.name)) : [resolve(dir, p.name)],
  );
const used = new Set();
for (const file of walk(root).filter((f) => /\.(html|css|js)$/.test(f))) {
  for (const m of readFileSync(file, "utf8").matchAll(
    /\/assets\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|svg|woff2|mp4|txt)/g,
  ))
    used.add(m[0]);
}
const removed = [];
for (const file of walk(resolve(root, "assets"))) {
  const url = "/" + relative(root, file).split(sep).join("/");
  if (url.endsWith(".txt")) continue; // Font licenses accompany the font.
  if (!used.has(url)) {
    removed.push(url);
    unlinkSync(file);
  }
}
writeFileSync(
  "artifacts/deployment-assets.json",
  JSON.stringify({ used: [...used], removed }, null, 2),
);
console.log(
  `Deployment allowlist: ${used.size} assets; ${removed.length} unused files omitted.`,
);
