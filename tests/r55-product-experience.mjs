/* global document, window, Image, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const out =
  process.env.REVIEW_OUTPUT ?? "artifacts/r55-product-design/verification";
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
          const rail = page.locator(".collection-catalog");
          const links = page.locator(".catalog-index a");
          assert(await page.locator("[data-gallery-previous]").isDisabled());
          await page.locator("[data-gallery-next]").click();
          await page.waitForTimeout(80);
          assert(await rail.evaluate((el) => el.scrollLeft > 0));
          await page.locator("[data-gallery-previous]").click();
          await page.waitForTimeout(80);
          assert(await rail.evaluate((el) => el.scrollLeft < 2));
          const visible = await rail.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [...el.querySelectorAll(".catalog-feature")]
              .map((c) => c.getBoundingClientRect())
              .filter((c) => c.left >= r.left - 1 && c.right <= r.right + 1)
              .length;
          });
          assert.equal(
            visible,
            width < 768 ? 1 : 2,
            "Whole product frames at the starting position",
          );
          for (let i = 0; i < 7; i++) {
            await links.nth(i).click();
            await page.waitForTimeout(40);
            const card = page.locator(`#model-${ids[i]}`);
            const visible = await card.evaluate((el) => {
              const r = el.getBoundingClientRect(),
                frame = el
                  .closest(".collection-catalog")
                  .getBoundingClientRect();
              return r.left >= frame.left - 1 && r.right <= frame.right + 1;
            });
            assert(visible, `Gallery ${lang} ${width} ${ids[i]}`);
            report.gallery.push({ lang, width, id: ids[i] });
            assert.equal(
              await card
                .locator(".catalog-feature-copy a")
                .getAttribute("href"),
              `/${lang}/products/${ids[i]}/`,
            );
          }
          await rail.focus();
          await page.keyboard.press("Home");
          await page.waitForTimeout(60);
          assert(await rail.evaluate((el) => el.scrollLeft < 2));
          await page.keyboard.press("End");
          await page.waitForTimeout(60);
          assert(
            await rail.evaluate(
              (el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
            ),
          );
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
          await links.first().click();
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
    assert(!(await page.locator("[data-gallery-controls]").isVisible()));
    report.noJS.push({ lang, passed: true });
    await ctx.close();
  }
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
