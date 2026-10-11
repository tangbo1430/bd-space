import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://localhost:4321";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { layouts: [], progress: [] };
await mkdir("artifacts", { recursive: true });
for (const [width, height] of [
  [320, 812],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [812, 375],
  [720, 450],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "no-preference",
  });
  await page.goto(base + "/zh/", { waitUntil: "networkidle" });
  await page.locator("[data-carousel-pause]").click();
  await page.mouse.move(0, 0);
  const geometry = await page.evaluate(() => {
    const controls = document
      .querySelector(".hero-controls")
      .getBoundingClientRect();
    const caption = document
      .querySelector(".slide.on .hero-bottom")
      .getBoundingClientRect();
    const overlap =
      controls.left < caption.right &&
      controls.right > caption.left &&
      controls.top < caption.bottom &&
      controls.bottom > caption.top;
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      overlap,
      clipped: controls.left < 0 || controls.right > innerWidth,
      targets: [
        ...document.querySelectorAll(".hero-scenes button,.hero-pause"),
      ].every((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 44 && r.height >= 44;
      }),
    };
  });
  assert(
    !geometry.overflow &&
      !geometry.overlap &&
      !geometry.clipped &&
      geometry.targets,
    JSON.stringify({ width, ...geometry }),
  );
  for (let i = 0; i < 3; i++) {
    await page.locator(`[data-dot="${i}"]`).click();
    assert.equal(
      await page.locator(`[data-dot="${i}"]`).getAttribute("aria-current"),
      "true",
    );
    assert.equal(
      await page.locator("[data-dot][aria-current=true]").count(),
      1,
    );
    const inactive = await page
      .locator(".hero-scene:not(.on) [data-scene-progress]")
      .evaluateAll((els) =>
        els.map(
          (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a,
        ),
      );
    assert(
      inactive.every((value) => value === 0),
      "Inactive timelines must clear after switching",
    );
  }
  await page.locator('[data-dot="2"]').press("Home");
  assert.equal(
    await page
      .locator('[data-dot="0"]')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("End");
  assert.equal(
    await page.locator('[data-dot="2"]').getAttribute("aria-current"),
    "true",
  );
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator('[data-dot="0"]').getAttribute("aria-current"),
    "true",
  );
  await page.locator('[data-dot="0"]').blur();
  await page.mouse.move(0, 0);
  if (width === 375 || width === 1440)
    await page.screenshot({ path: `artifacts/carousel-index-${width}.png` });
  report.layouts.push({ width, height, ...geometry });
  await page.close();
}
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});
await page.goto(base + "/zh/", { waitUntil: "networkidle" });
const progress = () =>
  page
    .locator(".hero-scene.on [data-scene-progress]")
    .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
const p0 = await progress();
await page.waitForTimeout(400);
const p1 = await progress();
assert(p1 > p0 + 0.04);
await page.locator("[data-carousel-pause]").click();
await page.mouse.move(0, 0);
await page.waitForTimeout(80);
const paused = await progress();
await page.waitForTimeout(400);
assert(Math.abs((await progress()) - paused) < 0.01);
await page.locator(".hero-scene.on").click();
await page.mouse.move(0, 0);
assert(
  Math.abs((await progress()) - paused) < 0.01,
  "Clicking the active scene must not reset the timer",
);
await page.locator("[data-carousel-pause]").click();
await page.mouse.move(0, 0);
await page.waitForTimeout(400);
assert((await progress()) > paused + 0.04);
await page.evaluate(() => scrollTo(0, 2000));
await page.waitForTimeout(150);
const hidden = await progress();
await page.waitForTimeout(400);
assert(Math.abs((await progress()) - hidden) < 0.01);
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(400);
assert((await progress()) > hidden + 0.04);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.waitForTimeout(100);
assert.equal(await progress(), 1);
assert.equal(await page.locator("[data-carousel-pause]").isVisible(), false);
assert.equal(
  await page
    .locator(".hero-scene.on [data-scene-progress]")
    .evaluate((el) => el.getAnimations().length),
  0,
);
await page.locator('[data-dot="2"]').click();
assert.equal(await progress(), 1);
report.progress.push(
  "Timeline advances, pauses, resumes and stops offscreen with the carousel; current selection does not reset; reduced motion shows a static selected rail.",
);
await page.close();
await browser.close();
await writeFile(
  "artifacts/carousel-navigation-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "8 carousel layouts, direct selection, keyboard focus and synchronized progress states passed.",
);
