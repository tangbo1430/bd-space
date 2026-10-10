/* global document, getComputedStyle, scrollTo */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const original = await readFile(
  "public/assets/brand/logo-official-v11.svg",
  "utf8",
);
const reversed = await readFile(
  "public/assets/brand/logo-reversed.svg",
  "utf8",
);
assert.equal(original.replaceAll("#122e3b", "#ffffff"), reversed);
for (const svg of [original, reversed]) {
  assert(!/<image|stroke=|filter=|data:image/.test(svg));
  assert.equal((svg.match(/#c7c8ca/g) || []).length, 1);
  assert.equal((svg.match(/#636466/g) || []).length, 1);
  assert(
    (svg.match(/C/g) || []).length >= 10,
    "retain original curved glyph outlines",
  );
}
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ reducedMotion: "reduce" });
const report = { checks: [], errors: [] };
p.on("pageerror", (e) => report.errors.push(e.message));
await mkdir("artifacts/delivery-states", { recursive: true });
for (const lang of ["zh", "en"])
  for (const width of [320, 375, 768, 1440, 2560]) {
    await p.setViewportSize({ width, height: 900 });
    await p.goto(`${base}/${lang}/products/4s/`, { waitUntil: "networkidle" });
    const selector = width >= 1280 ? ".brand-reversed" : ".brand-original";
    assert.equal(
      await p
        .locator(`[data-gnb] ${selector}`)
        .evaluate((e) => getComputedStyle(e).visibility),
      "visible",
    );
    const logoBefore = await p
      .locator("[data-gnb] .official-brand")
      .boundingBox();
    await p.locator('.product-jump a[href="#spaces"]').click();
    await p.waitForFunction(() =>
      document.querySelector("[data-gnb]").classList.contains("scrolled"),
    );
    const offset = await p
      .locator("#spaces")
      .evaluate((e) => e.getBoundingClientRect().top);
    const bottom = await p
      .locator("[data-gnb]")
      .evaluate((e) => e.getBoundingClientRect().bottom);
    assert(
      offset >= bottom && offset <= bottom + 30,
      `anchor not obscured ${lang} ${width}: ${offset}/${bottom}`,
    );
    const logoAfter = await p
      .locator("[data-gnb] .official-brand")
      .boundingBox();
    assert(
      Math.abs(logoBefore.width - logoAfter.width) < 1 &&
        Math.abs(logoBefore.x - logoAfter.x) < 1,
    );
    assert.equal(
      await p
        .locator("[data-gnb] .brand-original")
        .evaluate((e) => getComputedStyle(e).visibility),
      "visible",
    );
    const photo = p.locator(".photo-grid .gallery-link").first();
    await photo.hover();
    assert.equal(
      await photo.locator("img").evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    await p.keyboard.press("Tab");
    await photo.focus();
    assert.notEqual(
      await photo.evaluate((e) => getComputedStyle(e).outlineStyle),
      "none",
    );
    await photo.press("Enter");
    await p.locator(".viewer-image").evaluate((i) => i.decode());
    await p.screenshot({
      path: `artifacts/delivery-states/${lang}-${width}-viewer.png`,
    });
    await p.keyboard.press("Escape");
    await p.waitForTimeout(50);
    assert(await photo.evaluate((e) => e === document.activeElement));
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(200);
    await p.screenshot({
      path: `artifacts/delivery-states/${lang}-${width}-hero.png`,
    });
    report.checks.push({
      lang,
      width,
      anchorOffset: offset,
      logoStable: true,
      keyboardViewer: true,
    });
  }
await b.close();
assert.deepEqual(report.errors, []);
await writeFile(
  "artifacts/delivery-states.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "10 bilingual logo, anchor, hover and keyboard viewer states passed; SVG geometry and gray blocks verified.",
);
