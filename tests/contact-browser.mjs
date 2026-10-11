/* global document, innerWidth, window */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { assertDirectContact } from "./contact-helpers.mjs";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/contact-design";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const report = {
  base,
  layouts: [],
  accessibility: [],
  interactions: [],
  errors: [],
  missing: [],
  posts: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) report.missing.push(r.url());
});
page.on("request", (r) => {
  if (r.method() === "POST") report.posts.push(r.url());
});
for (const lang of ["zh", "en"]) {
  for (const [width, height] of [
    [320, 812],
    [375, 812],
    [768, 1024],
    [1024, 900],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [844, 390],
    [800, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/${lang}/contact/`);
    await page.evaluate(() => document.fonts.ready);
    assert(
      await page.evaluate(() => {
        const header = document
          .querySelector(".gnb")
          .getBoundingClientRect().bottom;
        return (
          document
            .querySelector(".contact-sheet > .eyebrow")
            .getBoundingClientRect().top >= header &&
          document.querySelector(".contact-portrait").getBoundingClientRect()
            .top >= header
        );
      }),
      `${lang} ${width}: hero must clear navigation`,
    );
    assert.equal(
      await page.locator("form, [data-download-inquiry]").count(),
      0,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${lang} ${width}x${height}: horizontal overflow`,
    );
    await page.locator(".contact-location").scrollIntoViewIfNeeded();
    await page.locator(".wechat-grid").scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) {
      const person = page.locator(".contact-person").nth(i);
      if (!(await person.evaluate((el) => el.open)))
        await person.locator("summary").click();
      const image = person.locator("img");
      await image.evaluate((i) => i.decode());
      assert(
        await image.evaluate(
          (i) =>
            i.naturalWidth > 0 &&
            Math.abs(
              i.clientWidth / i.clientHeight - i.naturalWidth / i.naturalHeight,
            ) < 0.01,
        ),
      );
    }
    await page.locator(".contact-person summary").first().click();
    assert.equal(await page.locator(".contact-person[open]").count(), 1);
    await page.locator(".contact-portrait img").evaluate((i) => i.decode());
    assert(
      await page
        .locator(".contact-portrait img")
        .evaluate(
          (i) =>
            Math.abs(
              i.clientWidth / i.clientHeight - i.naturalWidth / i.naturalHeight,
            ) < 0.01,
        ),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 375 || width === 1440) {
      const results = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(results.violations, []);
      report.accessibility.push({
        lang,
        width,
        violations: 0,
        incomplete: results.incomplete.map((i) => i.id),
      });
      await page.screenshot({
        path: `${output}/${lang}-${width}.png`,
        fullPage: true,
      });
    }
    report.layouts.push({
      lang,
      width,
      height,
      overflow: false,
      qrUncropped: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/${lang}/contact/?product=bd9`);
  await assertDirectContact(page, lang === "en" ? "BD-9" : "半打 9");
  report.interactions.push({
    lang,
    product: "bd9",
    mailDraft: true,
    copy: true,
    qrFocusRestored: 3,
  });
  for (const product of ["4s", "5s", "6s", "grayscale", "bd8"]) {
    await page.goto(`${base}/${lang}/contact/?product=${product}`);
    assert(await page.locator("[data-contact-context]").isVisible());
    const href = await page
      .locator("[data-contact-email]")
      .getAttribute("href");
    assert(new URL(href).searchParams.get("subject").length > 5);
  }
  const project = JSON.parse(
    await fs.readFile("src/data/projects.json", "utf8"),
  )[0].id;
  await page.goto(`${base}/${lang}/contact/?project=${project}`);
  assert(await page.locator("[data-contact-context]").isVisible());
  assert(
    new URL(
      await page.locator("[data-contact-email]").getAttribute("href"),
    ).searchParams.has("body"),
  );
  await page.goto(
    `${base}/${lang}/contact/?product=%3Cscript%3Ebad%3C%2Fscript%3E`,
  );
  assert(await page.locator("[data-contact-context]").isHidden());
  await page.locator('a[href="#wechat"]').click();
  const top = await page
    .locator("#wechat")
    .evaluate((el) => el.getBoundingClientRect().top);
  assert(top >= 76 && top < 200);
  await page.locator(".contact-map-disclosure summary").click();
  await page.locator(".contact-map").click();
  assert(
    (
      await page.locator("[data-viewer-original]").getAttribute("href")
    ).includes("contact-map"),
  );
  await page.keyboard.press("Escape");
  assert(
    await page
      .locator(".contact-map")
      .evaluate((el) => el === document.activeElement),
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
    document.execCommand = () => false;
  });
  await page.locator("[data-copy-contact]").first().click();
  await page.waitForFunction(() =>
    /未能复制|Unable to copy/.test(
      document.querySelector("[data-contact-copy-status]").textContent,
    ),
  );
  report.interactions.push({
    lang,
    productAndProjectContext: true,
    unknownIgnored: true,
    anchorOffset: true,
    mapFocusRestored: true,
    copyFailureFeedback: true,
  });
}
assert.deepEqual(report.errors, []);
assert.deepEqual(report.missing, []);
assert.deepEqual(report.posts, []);
await browser.close();
await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    layouts: report.layouts.length,
    accessibility: report.accessibility.length,
    interactions: report.interactions.length,
    errors: report.errors,
  }),
);
