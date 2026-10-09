import { parse } from "parse5";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((p) =>
    p.isDirectory() ? files(`${dir}/${p.name}`) : [`${dir}/${p.name}`],
  );
const missing = new Set();
for (const f of files("dist/en").filter((f) => f.endsWith(".html"))) {
  const tree = parse(readFileSync(f, "utf8"));
  function walk(n) {
    if (n.tagName === "script" || n.tagName === "style") return;
    if (n.value && /[\u3400-\u9fff]/.test(n.value))
      missing.add(n.value.trim().replace(/\s+/g, " "));
    for (const a of n.attrs ?? [])
      if (
        [
          "aria-label",
          "alt",
          "title",
          "content",
          "placeholder",
          "data-gallery-caption",
        ].includes(a.name) &&
        /[\u3400-\u9fff]/.test(a.value)
      )
        missing.add(a.value);
    (n.childNodes ?? []).forEach(walk);
  }
  walk(tree);
}
missing.delete("中文"); // Intentional native-language switch.
writeFileSync(
  "artifacts/untranslated.json",
  JSON.stringify([...missing], null, 2),
);
console.log("Untranslated text/attributes:", missing.size);
if (missing.size) process.exitCode = 1;
