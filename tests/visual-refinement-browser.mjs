/* global document, innerWidth, getComputedStyle */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/refinement-r34";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = { products: [], contacts: [], errors: [] };
page.on("pageerror", (e) => report.errors.push(e.message));
for (const lang of ["zh", "en"]) {
  for (const width of [320, 375, 768, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ["4s", "5s", "6s", "grayscale", "bd8", "bd9"]) {
      await page.goto(`${base}/${lang}/products/${id}/`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".page-visual img").evaluate((i) => i.decode());
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.equal(
        await page
          .locator(
            'header a[href$="/news/"], [data-drawer] a[href$="/news/"], header a[href$="/careers/"], [data-drawer] a[href$="/careers/"], footer a[href$="/news/"], footer a[href$="/careers/"]',
          )
          .count(),
        0,
      );
      if (lang === "zh") {
        assert(
          await page
            .locator(".product-idea-title span")
            .evaluateAll((spans) =>
              spans.every(
                (s) =>
                  s.scrollWidth <= s.clientWidth + 1 &&
                  s.getBoundingClientRect().height <=
                    parseFloat(getComputedStyle(s).lineHeight) + 1,
              ),
            ),
        );
      }
      if (width < 768) {
        assert(
          await page.locator(".page-visual img").evaluate((i) => {
            const r = i.getBoundingClientRect();
            const picture = i.parentElement.getBoundingClientRect();
            return (
              Math.abs(
                r.width / r.height / (i.naturalWidth / i.naturalHeight) - 1,
              ) < 0.005 && Math.abs(picture.height - r.height) < 1
            );
          }),
          `${lang}/${id}/${width}: complete mobile hero`,
        );
      }
      if (id === "4s" && [375, 1440].includes(width))
        await page.screenshot({ path: `${output}/${lang}-hero-${width}.png` });
      if (lang === "zh" && width === 1440 && ["6s", "bd8"].includes(id)) {
        await page.locator(".product-idea").scrollIntoViewIfNeeded();
        await page
          .locator(".product-idea")
          .screenshot({ path: `${output}/title-${id}.png` });
      }
      report.products.push({ lang, id, width, passed: true });
    }
    await page.goto(`${base}/${lang}/contact/`);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => ({
      qrTop: document.querySelector(".wechat-code").getBoundingClientRect().top,
      portraitTop: document
        .querySelector(".contact-portrait")
        .getBoundingClientRect().top,
      sectionHeight: document.querySelector("#wechat").getBoundingClientRect()
        .height,
      cardTops: [...document.querySelectorAll(".contact-person")].map(
        (e) => e.getBoundingClientRect().top,
      ),
    }));
    if (width < 768)
      assert(
        geometry.qrTop < geometry.portraitTop,
        "WeChat precedes decorative image",
      );
    else
      assert(
        Math.max(...geometry.cardTops) - Math.min(...geometry.cardTops) < 1,
        "contacts share one row",
      );
    report.contacts.push({ lang, width, ...geometry });
  }
}
await page.goto(`${base}/zh/qualifications/`);
assert.equal(await page.locator(".patent-register").count(), 0);
assert.equal(await page.locator("#reports, #research, #awards").count(), 3);
await browser.close();
await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
assert.deepEqual(report.errors, []);
console.log(
  JSON.stringify({
    products: report.products.length,
    contacts: report.contacts.length,
    errors: report.errors,
  }),
);
