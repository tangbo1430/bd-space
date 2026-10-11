/** Content regression gates for the approved materials integration. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const html = (path) => read(`dist/zh/${path ? `${path}/` : ""}index.html`);
const projects = JSON.parse(read("src/data/projects.json"));
const results = [];
function check(name, test) {
  assert(test, name);
  results.push(name);
}
const listed = ["4s", "5s", "6s", "grayscale", "bd8", "bd9"];
const legacy = ["slab", "wall", "stair"];
const sitemap = readdirSync(new URL("dist/", root))
  .filter((p) => /^sitemap.*\.xml$/.test(p))
  .map((p) => read(`dist/${p}`))
  .join("");
for (const id of listed) {
  check(
    `${id}: listed and linked from catalog`,
    /"listed": true/.test(read(`src/content/products/${id}.md`)) &&
      html("products").includes(`href="/zh/products/${id}/"`),
  );
  check(
    `${id}: real specs and indexable route`,
    html(`products/${id}`).includes("180mm") &&
      html(`products/${id}`).includes("40尺HC") &&
      !html(`products/${id}`).includes('content="noindex'),
  );
}
for (const id of legacy) {
  check(
    `${id}: old address is noindex, omitted from sitemap and recommendations`,
    html(`products/${id}`).includes('content="noindex, nofollow"') &&
      !sitemap.includes(`/products/${id}/`) &&
      !html("products").includes(`href="/zh/products/${id}/"`) &&
      !html("").includes(`href="/zh/products/${id}/"`),
  );
}
check(
  "10 projects; domestic 7, overseas 3",
  projects.length === 10 &&
    projects.filter((p) => p.region === "domestic").length === 7 &&
    projects.filter((p) => p.region === "overseas").length === 3,
);
for (const p of projects) {
  check(
    `${p.id}: stable anchor and its own gallery`,
    html("cases").includes(`id="${p.id}"`) &&
      p.gallery.every((g) => g.base.startsWith(`project-${p.id}-`)),
  );
  check(
    `${p.id}: accurate historical attribution`,
    p.era === (p.year === 2026 ? "半打项目" : "团队历年实践"),
  );
}
check(
  "4S area scopes kept separate",
  html("products/4s").includes("首层63㎡＋阁楼36㎡") &&
    html("products/4s").includes("98㎡") &&
    html("products/4s").includes("两类面积采用不同计算口径，不相加或换算"),
);
check(
  "24-hour assembly qualifier preserved",
  html("cases").includes("不含室内装修"),
);
check(
  "Equity 60/38/1/1 sums to 100",
  [...read("src/data/company.ts").matchAll(/percent:\s*(\d+)/g)]
    .map((m) => Number(m[1]))
    .reduce((a, b) => a + b, 0) === 100,
);
check(
  "Reports and patents preserve ownership and limits",
  html("qualifications").includes("广东草根民墅房屋制造有限公司") &&
    html("qualifications").includes("不代表半打整屋认证") &&
    html("qualifications").includes("当前法律状态需另行核实") &&
    html("qualifications").includes("非均由半打空间持有"),
);
check(
  "Phone, email and three QR codes linked",
  html("contact").includes('href="tel:18503005860"') &&
    html("contact").includes('href="mailto:411547750@qq.com"') &&
    (html("contact").match(/class="wechat-code"/g) ?? []).length === 3,
);
check(
  "Inquiry still provides a local download",
  html("contact").includes("data-download-inquiry") &&
    html("contact").includes("下载不会自动发送"),
);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((p) =>
    p.isDirectory() ? walk(join(dir, p.name)) : [join(dir, p.name)],
  );
}
const publicFiles = walk(fileURLToPath(new URL("public/", root)));
check(
  "No source tables or complete reports in public",
  publicFiles.every((p) => !/\.(?:xlsx?|docx?|pdf|ai|dwg|zip|rar)$/i.test(p)),
);
const publicText = walk(fileURLToPath(new URL("dist/", root)))
  .filter((p) => /\.(?:html|js|css|svg|json)$/.test(p))
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");
check(
  "No published price amounts",
  !/[￥¥]\s*[\d,.]+|\d[\d,.]*\s*(?:万)?元(?:\s|[/／<，。])/u.test(publicText),
);
check(
  "New share image referenced",
  html("").includes("/assets/img/share-banda.jpg"),
);
check(
  "115-file internal provenance ledger",
  JSON.parse(read("docs/materials-manifest.json")).files.length === 115,
);
mkdirSync(new URL("artifacts/", root), { recursive: true });
writeFileSync(
  new URL("artifacts/materials-verification.json", root),
  JSON.stringify({ passed: results.length, checks: results }, null, 2),
);
console.log(`${results.length} material integration checks passed.`);
