// r4（网页调整4）验收：去蒙版、原图比例、产品排序、证书与关于页排版图。
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const page = (p) => read(`dist/${p}/index.html`);
const css = readdirSync(new URL("../dist/_astro/", import.meta.url))
  .filter((f) => f.endsWith(".css"))
  .map((f) => read(`dist/_astro/${f}`))
  .join("\n");
let passed = 0;
const ok = (cond, name) => {
  assert(cond, name);
  passed++;
};
const home = page("zh");
ok(
  ["grayscale", "grayscale-eco", "4s", "5s", "6s"].every((k) =>
    home.includes(`r4-banner-${k}`),
  ),
  "home carousel uses the five product renderings",
);
ok(
  /\.editorial-hero \.slide:after\{content:none/.test(css),
  "carousel overlay removed",
);
ok(
  /\.cover-visual \.page-visual-frame:after\{content:none/.test(css),
  "detail hero overlay removed",
);
ok(/\.project-cta:after\{content:none/.test(css), "footer CTA overlay removed");
ok(
  home.includes("r4-cta") && home.includes("r4-making-design"),
  "CTA and design legend replaced",
);
ok(
  ["panels", "modules", "hybrid"].every((k) => home.includes(`r4-system-${k}`)),
  "building systems use 2D / 3D / combined images",
);
ok(
  (home.match(/class="case-card rv"/g) ?? []).length === 4,
  "four aligned project cards",
);
ok(home.includes("灰度空间经济款"), "economy model featured on home");
const catalog = page("zh/products");
ok(
  [1, 2, 3, 4].every((n) => catalog.includes(`r4-catalog-photo-${n}`)),
  "catalog carousel uses four 4S photos",
);
const order = [
  "grayscale",
  "grayscale-eco",
  "4s",
  "5s",
  "6s",
  "bd8",
  "bd9",
].map((k) => catalog.indexOf(`r4-main-${k}`));
ok(
  order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])),
  "catalog order: grayscale → economy → 4S → 5S → 6S → 8 → 9",
);
for (const k of [
  "grayscale",
  "grayscale-eco",
  "4s",
  "5s",
  "6s",
  "bd8",
  "bd9",
]) {
  const html = page(`zh/products/${k}`);
  ok(
    html.includes(`r4-${k}-hero`) &&
      html.includes("pd-spec") &&
      html.includes(`r4-${k}-plan`),
    `${k}: hero, specification and plan`,
  );
  ok(!html.includes("THE IDEA"), `${k}: duplicated idea block removed`);
  ok(
    html.indexOf('id="specifications"') < html.indexOf('id="spaces"'),
    `${k}: specification before spaces`,
  );
}
const quals = page("zh/qualifications");
ok(
  (quals.match(/r4-patent-\d\d/g) ?? []).length >= 17,
  "17 patent certificates shown",
);
ok(
  [1, 2, 3].every((n) => quals.includes(`r4-award-${n}`)),
  "3 honour certificates shown",
);
const about = page("zh/about");
ok(
  Array.from(
    { length: 13 },
    (_, i) => `r4-about-${String(i + 1).padStart(2, "0")}`,
  ).every((b) => about.includes(b)),
  "about page uses the supplied layout images",
);
console.log(`${passed} r4 checks passed.`);
