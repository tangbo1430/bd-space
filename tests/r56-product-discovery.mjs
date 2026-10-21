/* global document, window, Image, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const out = process.env.REVIEW_OUTPUT ?? "artifacts/r56-review/verification";
await mkdir(out, { recursive: true });
const ids = ["grayscale", "grayscale-eco", "4s", "5s", "6s", "bd8", "bd9"];
const facts = new Map();
for (const id of ids) {
  const raw = JSON.parse(
    (await readFile(`src/content/products/${id}.md`, "utf8")).split("---")[1],
  );
  facts.set(
    id,
    ["建筑面积", "户型", "使用场景", "外墙厚度", "装运参考"].map((label) =>
      label === "使用场景"
        ? raw.scenes.join(" / ")
        : raw.params.find((p) => p.label === label).value,
    ),
  );
}
const report = {
  layouts: [],
  gallery: [],
  comparisons: [],
  axe: [],
  noJS: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const lang of ["zh", "en"])
    for (const [width, height] of [
      [320, 740],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [1920, 1080],
      [2560, 1440],
      [844, 390],
      [720, 450],
    ]) {
      const ctx = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      for (const kind of ["home", "catalog"]) {
        await page.goto(
          base + `/${lang}/` + (kind === "catalog" ? "products/" : ""),
          { waitUntil: "networkidle" },
        );
        const sel = kind === "home" ? ".h-products" : "#collection";
        await page.locator(sel + " img").evaluateAll(async (imgs) => {
          await Promise.all(
            imgs.map(async (img) => {
              img.loading = "eager";
              await img.decode();
            }),
          );
        });
        const geometry = await page.locator(sel).evaluate(async (section) => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          images: await Promise.all(
            [...section.querySelectorAll("img")].map(async (img) => {
              const original = new Image();
              original.src = img.currentSrc;
              await original.decode();
              const r = img.getBoundingClientRect(),
                frame = img.closest(".editorial-image").getBoundingClientRect();
              return {
                loaded: img.complete && img.naturalWidth > 0,
                crop: Math.abs(
                  r.height -
                    (r.width * original.naturalHeight) / original.naturalWidth,
                ),
                bar: Math.abs(frame.height - r.height),
                filter: getComputedStyle(img).filter,
              };
            }),
          ),
        }));
        assert(geometry.overflow <= 1, `${lang} ${width} ${kind} overflow`);
        assert(
          geometry.images.every(
            (i) =>
              i.loaded && i.crop < 1.5 && i.bar < 1.5 && i.filter === "none",
          ),
          `${lang} ${width} ${kind} image geometry`,
        );
        if (kind === "home")
          assert.equal(await page.locator(".h-tile").count(), 3);
        else {
          assert.equal(await page.locator(".catalog-feature").count(), 7);
          assert.equal(
            await page.locator(".h-systems,.project-cta").count(),
            0,
          );
          assert.equal(
            await page.locator(".catalog-feature .action-primary").count(),
            0,
          );
          const links = page.locator(".catalog-index a");
          assert.equal(
            await page.locator("[data-gallery-controls]").count(),
            0,
          );
          for (let i = 0; i < 7; i++) {
            const href = `/${lang}/products/${ids[i]}/`;
            const card = page.locator(`#model-${ids[i]}`);
            for (const selector of ["h3 a", ".catalog-feature-image"]) {
              assert.equal(
                await card.locator(selector).getAttribute("href"),
                href,
              );
            }
            assert.equal(await links.nth(i).getAttribute("href"), href);
            await card.scrollIntoViewIfNeeded();
            const state = await card.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return {
                left: r.left,
                right: r.right,
                hidden: getComputedStyle(el).display === "none",
                width: window.innerWidth,
              };
            });
            assert(
              !state.hidden &&
                state.left >= -1 &&
                state.right <= state.width + 1,
            );
            await card.locator("h3 a").focus();
            assert(
              await card
                .locator("h3 a")
                .evaluate((el) => document.activeElement === el),
            );
            assert((await card.locator("h3 a").boundingBox()).height >= 44);
            report.gallery.push({ lang, width, id: ids[i], directEntries: 3 });
          }
          for (const side of [0, 1])
            for (const id of ids) {
              const pick = page.locator(`[data-comparison-select="${side}"]`);
              await pick.focus();
              await pick.selectOption(id);
              const values = await page
                .locator(`[data-comparison-value^="${side}-"]`)
                .allTextContents();
              if (lang === "zh") assert.deepEqual(values, facts.get(id));
              else
                assert(
                  values.every(
                    (x) => x.length > 0 && !/[\u3400-\u9fff]/u.test(x),
                  ),
                );
              assert.equal(
                await page
                  .locator(`[data-comparison-link="${side}"]`)
                  .getAttribute("href"),
                `/${lang}/products/${id}/`,
              );
              assert(
                (await pick.evaluate((el) => document.activeElement === el)) ||
                  (await pick.isEnabled()),
              );
              report.comparisons.push({ lang, width, side, id });
            }
          await page
            .locator('[data-comparison-select="0"]')
            .selectOption("grayscale");
          await page.locator('[data-comparison-select="1"]').selectOption("4s");
          assert(
            (await page.locator("[data-comparison-status]").innerText())
              .length > 0,
          );
          await page.locator("#collection").scrollIntoViewIfNeeded();
        }
        if (lang === "en")
          assert(
            !/[\u3400-\u9fff]/u.test(await page.locator(sel).innerText()),
            "English gallery untranslated",
          );
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 10));
          }
        });
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          window.scrollTo(
            0,
            window.scrollY + el.getBoundingClientRect().top - 90,
          );
        }, sel);
        await page.waitForTimeout(80);
        if ([375, 768, 1440, 1920].includes(width))
          await page.screenshot({
            path: `${out}/${lang}-${width}-${kind}.jpg`,
            quality: 88,
          });
        if ([375, 1440].includes(width)) {
          const axe = await new AxeBuilder({ page })
            .include(kind === "home" ? ".h-products" : ".page-editorial")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          report.axe.push({ lang, width, kind, violations: axe.violations });
          assert.equal(
            axe.violations.length,
            0,
            JSON.stringify(axe.violations),
          );
          if (kind === "catalog") {
            await page.evaluate(() => {
              const el = document.querySelector("#product-comparison");
              window.scrollTo(
                0,
                window.scrollY + el.getBoundingClientRect().top - 90,
              );
            });
            await page.waitForTimeout(80);
            await page.screenshot({
              path: `${out}/${lang}-${width}-compare.jpg`,
              quality: 88,
            });
          }
        }
        report.layouts.push({ lang, width, height, kind, ...geometry });
      }
      await ctx.close();
    }
  for (const lang of ["zh", "en"]) {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 812 },
    });
    const page = await ctx.newPage();
    await page.goto(base + `/${lang}/products/`);
    assert.equal(await page.locator("tbody tr").count(), 5);
    assert.equal(await page.locator("[data-comparison-link]").count(), 2);
    assert(await page.locator('[data-comparison-select="0"]').isDisabled());
    assert.equal(await page.locator(".catalog-feature").count(), 7);
    assert.equal(await page.locator("[data-gallery-controls]").count(), 0);
    assert.equal(await page.locator(".catalog-feature h3 a").count(), 7);
    report.noJS.push({ lang, passed: true });
    await ctx.close();
  }
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  for (const lang of ["zh", "en"])
    for (const [index, id] of ids.entries()) {
      await page.goto(base + `/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.locator(".catalog-index a").nth(index).click();
      await page.waitForURL(`**/${lang}/products/${id}/`);
      assert(await page.locator("h1").isVisible());
      await page.goto(base + `/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.locator(`#model-${id} h3 a`).focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(`**/${lang}/products/${id}/`);
      assert(await page.locator("h1").isVisible());
      await page.goto(base + `/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.locator(`#model-${id} .catalog-feature-image`).click();
      await page.waitForURL(`**/${lang}/products/${id}/`);
      assert(await page.locator("h1").isVisible());
    }
  await page.close();
  assert.equal(report.errors.length, 0);
} catch (e) {
  report.errors.push(e.stack);
  process.exitCode = 1;
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify(
      {
        layouts: report.layouts.length,
        galleryChecks: report.gallery.length,
        comparisonChanges: report.comparisons.length,
        axe: report.axe.length,
        noJS: report.noJS.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
}
