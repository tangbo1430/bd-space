/** Verify every rendered local image reference, including responsive variants. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)],
  );
}
const pages = walk(dist).filter((p) => p.endsWith(".html"));
const references = new Set();
for (const file of pages) {
  for (const match of readFileSync(file, "utf8").matchAll(
    /\/assets\/img\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|svg))/g,
  ))
    references.add(match[1]);
}
const missing = [...references].filter(
  (name) => !existsSync(join(dist, "assets", "img", name)),
);
console.log(
  `Checked ${references.size} image and responsive-variant references across ${pages.length} pages.`,
);
for (const name of missing) console.error(`MISSING ${name}`);
if (!missing.length) console.log("All referenced images exist.");
process.exitCode = missing.length ? 1 : 0;
