/* global document, window */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const out = process.env.REVIEW_OUTPUT ?? "artifacts/r60-catalog/layout";
await mkdir(out, { recursive: true });
const ids = ["grayscale", "grayscale-eco", "4s", "5s", "6s", "bd8", "bd9"];
const facts = [];
for (const id of ids) {
  const data = JSON.parse(
    (await readFile(`src/content/products/${id}.md`, "utf8")).split("---")[1],
  );
  facts.push({
    id,
    base: data.mainBase,
    values: ["建筑面积", "户型"].map(
      (label) => data.params.find((p) => p.label === label).value,
    ),
  });
}
const report = { layouts: [], facts: [], indexKeyboard: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const lang of ["zh", "en"])
    for (const [width, height] of [
      [320, 740],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1280, 800],
      [1366, 768],
      [1440, 900],
      [1920, 1080],
      [2560, 1440],
      [844, 390],
      [720, 450],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (e) => report.errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(`${base}/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.locator(".catalog-feature img").evaluateAll((imgs) =>
        Promise.all(
          imgs.map((img) => {
            img.loading = "eager";
            return img.decode();
          }),
        ),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${lang} ${width} overflow`,
      );
      for (const model of facts) {
        const card = page.locator(`#model-${model.id}`);
        const values = (
          await card.locator(".catalog-specs dd").allTextContents()
        ).map((value) => value.trim());
        if (lang === "zh") assert.deepEqual(values, model.values);
        else
          assert(
            values.every((v) => v.length > 0 && !/[\u3400-\u9fff]/u.test(v)),
          );
        assert.match(
          await card.locator("img").getAttribute("src"),
          new RegExp(`${model.base}\\.jpg$`),
        );
        const boxes = await card.evaluate((el) => {
          const image = el
            .querySelector(".catalog-feature-image")
            .getBoundingClientRect();
          const copy = el
            .querySelector(".catalog-feature-copy")
            .getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return {
            imageWidth: image.width,
            cardWidth: box.width,
            gap: copy.top - image.bottom,
            left: image.left,
            right: image.right,
          };
        });
        assert(
          Math.abs(boxes.imageWidth - boxes.cardWidth) < 1 &&
            Math.abs(boxes.gap) < 1,
          `${model.id} image and caption disconnected`,
        );
        if (width < 1024)
          assert(
            Math.abs(boxes.imageWidth - width) < 1,
            "Mobile photo must fill the page without inner bars",
          );
        report.facts.push({ lang, width, id: model.id, ...boxes });
      }
      const first = await page.locator("#model-grayscale").boundingBox();
      const last = await page.locator("#model-grayscale-eco").boundingBox();
      assert(first.x < 1);
      if (width >= 1024) assert(Math.abs(last.x + last.width - width) < 1);
      const headings = await page
        .locator(
          ".catalog-heading,.catalog-feature-copy h3,.catalog-specs,.comparison-heading",
        )
        .evaluateAll((els) =>
          els.map((el) => ({ width: el.clientWidth, scroll: el.scrollWidth })),
        );
      assert(
        headings.every((r) => r.scroll <= r.width + 1),
        "Text overflows its own column",
      );
      if (width < 768) {
        const links = page.locator(".catalog-index a");
        for (let index = 0; index < 7; index++) {
          await links.nth(index).focus();
          const state = await links.nth(index).evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              focused: document.activeElement === el,
            };
          });
          assert(state.focused && state.left >= -1 && state.right <= width + 1);
        }
        report.indexKeyboard.push({ lang, width, count: 7 });
      }
      if ([375, 1440, 1920, 2560].includes(width)) {
        for (const [name, selector] of [
          ["catalog", "#collection"],
          ["middle", "#model-4s"],
          ["end", "#model-bd8"],
          ["compare", "#product-comparison"],
        ]) {
          await page
            .locator(selector)
            .evaluate((el) =>
              window.scrollTo(
                0,
                window.scrollY + el.getBoundingClientRect().top - 80,
              ),
            );
          await page.screenshot({
            path: `${out}/${lang}-${width}-${name}.jpg`,
            quality: 90,
          });
        }
        await page.screenshot({
          path: `${out}/${lang}-${width}-full.jpg`,
          fullPage: true,
          quality: 85,
        });
      }
      report.layouts.push({ lang, width, height });
      await page.close();
    }
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.errors.push(e.stack);
  process.exitCode = 1;
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify({
      layouts: report.layouts.length,
      facts: report.facts.length,
      indexKeyboard: report.indexKeyboard.length,
      errors: report.errors,
    }),
  );
}
