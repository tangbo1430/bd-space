import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const content = (slug) =>
  JSON.parse(read(`src/content/products/${slug}.md`).split("---")[1]);
const ledger = JSON.parse(read("docs/materials-manifest.json"));
const checks = [];
function check(name, condition) {
  assert(condition, name);
  checks.push(name);
}
check(
  "Original 115-file ledger and 3 supplement PDFs retained",
  ledger.files.length === 115 &&
    ledger.supplement.documents.length === 3 &&
    ledger.total === 118,
);
for (const [slug, pages, realCount] of [
  ["4s", [4, 8, 7, 9, 10, 12], 7],
  ["grayscale", [2, 4, 8, 9, 10, 11], 0],
]) {
  const data = content(slug);
  const html = read(`dist/zh/products/${slug}/index.html`);
  const source = ledger.supplement.documents.find((d) =>
    d.uses.some((u) =>
      u.webResources.some((r) => r.includes(`product-${slug}-`)),
    ),
  );
  check(
    `${slug}: six selected renderings; original PDF provenance retained`,
    data.designGallery.length === 6 &&
      JSON.stringify(
        source.uses.filter((u) => u.kind === "render").map((u) => u.page),
      ) === JSON.stringify(pages),
  );
  check(
    `${slug}: source image objects and hashes recorded`,
    source.uses.every(
      (u) => u.imageObject > 0 && /^[a-f0-9]{64}$/.test(u.sourceImageSha256),
    ),
  );
  check(
    `${slug}: real imagery retained separately`,
    data.gallery.length === realCount,
  );
  check(
    `${slug}: accurate render labels`,
    data.heroCaption.includes("效果图") &&
      data.designGallery.every((p) => p.caption.includes("效果图")) &&
      !html.includes("外观实景"),
  );
  check(
    `${slug}: original proportions and responsive widths`,
    data.designGallery.every(
      (p) => p.width <= 1920 && p.mobileWidth <= 960 && p.height > 0,
    ),
  );
  check(
    `${slug}: separately grouped lossless diagrams`,
    data.diagrams.length >= 2 &&
      data.diagrams[0].src.endsWith(".png") &&
      html.includes(`data-gallery="${slug}-diagrams"`),
  );
  check(
    `${slug}: technical section after specifications`,
    html.indexOf('class="product-section') <
      html.indexOf('class="ed-wrap ed-section product-diagrams"'),
  );
}
check(
  "4S conflicting loft and elevation pages deferred",
  ledger.supplement.documents[0].deferred.some(
    (d) => d.pages.includes(3) && d.pages.includes(14),
  ),
);
for (const slug of ["5s", "6s"]) {
  const data = content(slug);
  check(
    `${slug}: own hero remains, correct render label, no borrowed gallery`,
    data.heroCaption.includes("效果图") &&
      data.designGallery.length > 0 &&
      data.gallery.length === 0,
  );
}
writeFileSync(
  new URL("../artifacts/supplement-verification.json", import.meta.url),
  JSON.stringify({ passed: checks.length, checks }, null, 2),
);
console.log(`${checks.length} supplement content checks passed.`);
