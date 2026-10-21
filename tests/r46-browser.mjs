/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/r46-design/final";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const viewports = [
  [320, 740],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [844, 390],
  [720, 450],
];
const results = {
  layouts: [],
  slides: [],
  interactions: [],
  accessibility: [],
  errors: [],
};
try {
  for (const route of ["/zh/", "/zh/products/", "/en/", "/en/products/"]) {
    const slug = route.replaceAll("/", "_");
    for (const [width, height] of viewports) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + route, { waitUntil: "networkidle" });
      const dots = page.locator("[data-dot]");
      const count = await dots.count();
      assert.equal(count, route.includes("products") ? 4 : 5);
      for (let index = 0; index < count; index++) {
        await dots.nth(index).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelector(`[data-dot="${i}"]`)
              ?.classList.contains("on"),
          index,
        );
        await page.locator(".slide.on img").evaluate((img) => img.decode());
        const evidence = await page.evaluate(() => {
          const hero = document.querySelector("[data-carousel]");
          const image = hero.querySelector(".slide.on img");
          const frame = hero.querySelector(".hero-stage");
          const imgBox = image.getBoundingClientRect();
          const box = frame.getBoundingClientRect();
          const header = document.querySelector(".gnb");
          const links = [...header.querySelectorAll("nav > a, .sub-trigger")];
          const title = hero.querySelector("h1");
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            crop: Math.abs(
              imgBox.height -
                (imgBox.width * image.naturalHeight) / image.naturalWidth,
            ),
            frameGap: Math.abs(box.height - imgBox.height),
            loaded: image.complete && image.naturalWidth > 0,
            title: title.textContent,
            titleShadow: getComputedStyle(title).textShadow,
            imageFilter: getComputedStyle(image).filter,
            overlay: getComputedStyle(
              hero.querySelector(".slide.on"),
              "::after",
            ).content,
            navColors: [
              ...new Set(links.map((l) => getComputedStyle(l).color)),
            ],
            navVisible:
              getComputedStyle(header.querySelector("nav")).display !== "none",
            actionCount: hero.querySelectorAll(".hero-action a, .hero-intro a")
              .length,
            copyAbove:
              hero.querySelector(".hero-intro").getBoundingClientRect()
                .bottom <=
              box.top + 1,
            copyBelow:
              hero.querySelector(".hero-intro").getBoundingClientRect().top >=
              box.bottom - 1,
            visibleControlText: hero
              .querySelector(".hero-controls")
              .textContent.trim(),
            controlBoxes: [...hero.querySelectorAll("[data-dot]")].map((e) => {
              const r = e.getBoundingClientRect();
              return [r.width, r.height];
            }),
          };
        });
        assert(evidence.overflow <= 1, `${route} ${width}: overflow`);
        assert(evidence.loaded);
        assert.equal(evidence.titleShadow, "none");
        assert.equal(evidence.imageFilter, "none");
        assert.equal(evidence.overlay, "none");
        assert.equal(evidence.actionCount, 1);
        assert.equal(evidence.visibleControlText, "");
        assert.equal(
          evidence.navColors.length,
          1,
          "Navigation uses one palette",
        );
        assert.equal(
          evidence.navVisible,
          false,
          "Immersive opening uses the compact menu",
        );
        assert(
          evidence.controlBoxes.every(([w, h]) => w >= 43.9 && h >= 44),
          "44px slide targets",
        );
        if (width < 1280) {
          assert(
            evidence.crop < 1.25,
            "Compact image keeps its intrinsic ratio",
          );
          assert(evidence.frameGap < 1, "No bars inside the image frame");
          assert(evidence.copyAbove, "Compact copy precedes photography");
        }
        if (width >= 1280)
          assert(
            evidence.copyBelow,
            "Caption is below photography, never on the roof",
          );
        results.slides.push({ route, width, height, index, ...evidence });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(220);
        await page.screenshot({
          path: `${output}/${slug}-${width}x${height}-slide${index}.png`,
        });
      }
      await dots.first().click();
      await dots.first().focus();
      await page.keyboard.press("ArrowLeft");
      assert.equal(
        await page.locator("[data-dot].on").getAttribute("data-dot"),
        String(count - 1),
      );
      await page.keyboard.press("Home");
      assert.equal(await page.locator(":focus").getAttribute("data-dot"), "0");
      {
        await page.locator("[data-drawer-open]").click();
        assert.equal(
          await page.locator("[data-drawer]").getAttribute("aria-hidden"),
          "false",
        );
        await page.keyboard.press("Escape");
        assert(
          await page
            .locator("[data-drawer-open]")
            .evaluate((e) => e === document.activeElement),
        );
      }
      await page.evaluate(() => window.scrollTo(0, 110));
      await page.waitForTimeout(250);
      assert(
        await page
          .locator(".gnb")
          .evaluate((e) => e.classList.contains("scrolled")),
      );
      assert.equal(
        await page
          .locator(".gnb")
          .evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(255, 255, 255)",
      );
      assert.equal(
        await page
          .locator(".gnb .brand-original")
          .evaluate((e) => getComputedStyle(e).visibility),
        "visible",
      );
      assert.equal(
        await page
          .locator(".gnb nav")
          .evaluate((e) => getComputedStyle(e).display !== "none"),
        width >= 1280,
        "Full desktop navigation returns after scrolling",
      );
      if ([375, 1440].includes(width)) {
        await page.screenshot({
          path: `${output}/${slug}-${width}-scrolled.png`,
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.equal(audit.violations.length, 0, `${route} accessibility`);
        results.accessibility.push({
          route,
          width,
          violations: audit.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
      }
      assert.deepEqual(errors, []);
      results.layouts.push({ route, width, height, passed: true });
      await context.close();
    }
    console.log(`Completed ${route}`);
  }
  for (const route of ["/zh/", "/zh/products/", "/en/", "/en/products/"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(base + route + "?motion=full", {
      waitUntil: "networkidle",
    });
    const pause = page.locator("[data-carousel-pause]");
    await pause.click();
    assert.equal(await pause.getAttribute("aria-pressed"), "true");
    await page.mouse.move(0, 300);
    const previous = await page
      .locator("[data-dot].on")
      .getAttribute("data-dot");
    await page.waitForTimeout(8200);
    assert.equal(
      await page.locator("[data-dot].on").getAttribute("data-dot"),
      previous,
    );
    await pause.click();
    await page.mouse.move(0, 300);
    await page.waitForFunction(
      (i) =>
        document.querySelector("[data-dot].on")?.getAttribute("data-dot") !== i,
      previous,
      { timeout: 12000 },
    );
    await page.evaluate(() => {
      const hero = document.querySelector("[data-carousel]");
      const dispatch = (type, x) => {
        const e = new Event(type, { bubbles: true });
        Object.defineProperty(
          e,
          type === "touchstart" ? "touches" : "changedTouches",
          { value: [{ clientX: x, clientY: 300 }] },
        );
        hero.dispatchEvent(e);
      };
      dispatch("touchstart", 250);
      dispatch("touchend", 100);
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-dot="2"]')?.classList.contains("on"),
    );
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    const active = await page.locator("[data-dot].on").getAttribute("data-dot");
    await page.waitForTimeout(8200);
    assert.equal(
      await page.locator("[data-dot].on").getAttribute("data-dot"),
      active,
    );
    results.interactions.push({
      route,
      paused: true,
      resumed: true,
      touch: true,
      offscreen: true,
    });
    await context.close();
  }
} catch (e) {
  results.errors.push(e.stack);
  process.exitCode = 1;
} finally {
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(results, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        layouts: results.layouts.length,
        slides: results.slides.length,
        interactions: results.interactions.length,
        accessibility: results.accessibility,
        errors: results.errors,
      },
      null,
      2,
    ),
  );
}
