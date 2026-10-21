/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = "artifacts/r51-legibility/checks";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = { layouts: [], slides: [], interactions: [], errors: [] };
try {
  for (const lang of ["zh", "en"])
    for (const [width, height] of [
      [320, 740],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1280, 900],
      [1440, 1000],
      [1920, 1080],
      [2560, 1440],
      [844, 390],
      [720, 450],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (error) => results.errors.push(error.message));
      await page.goto(`http://127.0.0.1:4322/${lang}/`, {
        waitUntil: "networkidle",
      });
      const initial = await page.locator(".desktop-navigation").boundingBox();
      for (const index of [1, 3, 0, 4, 2]) {
        await page.locator(`[data-dot="${index}"]`).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelector(`[data-dot="${i}"]`)
              ?.classList.contains("on"),
          index,
        );
        await page.locator(".slide.on img").evaluate((img) => img.decode());
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(140);
        const state = await page.evaluate(() => {
          const hero = document.querySelector("[data-carousel]"),
            img = hero.querySelector(".slide.on img"),
            ir = img.getBoundingClientRect(),
            fr = hero.querySelector(".hero-stage").getBoundingClientRect();
          const header = document.querySelector(".gnb"),
            copy = hero.querySelector(".hero-content");
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            crop: Math.abs(
              ir.height - (ir.width * img.naturalHeight) / img.naturalWidth,
            ),
            gap: Math.abs(fr.height - ir.height),
            imageFilter: getComputedStyle(img).filter,
            overlay: getComputedStyle(
              hero.querySelector(".slide.on"),
              "::after",
            ).content,
            headerBg: getComputedStyle(header).backgroundColor,
            nav: header
              .querySelector(".desktop-navigation")
              .getBoundingClientRect()
              .toJSON(),
            copy: copy.getBoundingClientRect().toJSON(),
            stage: fr.toJSON(),
            ink: [
              ...header.querySelectorAll(".desktop-navigation .nav-ink"),
            ].filter((e) => e.hasAttribute("data-photo-ink")).length,
            subtitleInk: hero
              .querySelector(".h-hero-sub")
              .hasAttribute("data-photo-ink"),
            titleShadow: getComputedStyle(hero.querySelector("h1")).textShadow,
            photo: img.currentSrc,
            inkAlignment: [
              ...document.querySelectorAll("[data-photo-ink]"),
            ].map((e) => {
              const r = e.getBoundingClientRect();
              const offsets = getComputedStyle(e)
                .backgroundPosition.split(" ")
                .map(parseFloat);
              return Math.max(
                Math.abs(offsets[0] - (ir.left - r.left)),
                Math.abs(offsets[1] - (ir.top - r.top)),
              );
            }),
          };
        });
        assert(state.overflow <= 1, "no horizontal overflow");
        assert(state.crop < 1 && state.gap < 1, "complete original photograph");
        assert.equal(state.imageFilter, "none");
        assert.equal(state.overlay, "none");
        assert.equal(state.titleShadow, "none");
        if (width >= 1280) {
          assert.equal(state.headerBg, "rgba(0, 0, 0, 0)");
          assert(
            Math.abs(state.nav.x - initial.x) < 1 &&
              Math.abs(state.nav.width - initial.width) < 1,
            "navigation stays in place",
          );
          assert(
            state.copy.bottom < state.stage.bottom,
            "copy and action fit in photograph",
          );
          assert.equal(state.ink > 0, [1, 3].includes(index));
          assert.equal(state.subtitleInk, [1, 3].includes(index));
          assert(
            state.inkAlignment.every((error) => error < 1),
            "foreground stays aligned after copy moves",
          );
        } else {
          assert.equal(state.ink, 0);
          assert.equal(state.subtitleInk, false);
        }
        results.slides.push({ lang, width, index, ...state });
      }
      if (width === 1440) {
        await page.locator('[data-dot="1"]').click();
        await page.waitForTimeout(150);
        await page.evaluate(() => window.scrollTo(0, 120));
        await page.waitForTimeout(250);
        assert(await page.locator(".gnb.scrolled").count());
        assert.equal(await page.locator(".nav-ink[data-photo-ink]").count(), 0);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        assert((await page.locator(".nav-ink[data-photo-ink]").count()) > 0);
        await page.locator(".desktop-navigation nav > a").first().focus();
        await page.keyboard.press("Tab");
        assert(
          await page.locator(".desktop-navigation a:focus-visible").count(),
        );
        if (lang === "zh") {
          await page.locator(".sub-trigger").hover();
          assert(await page.locator(".sub-panel").isVisible());
          await page.screenshot({ path: `${out}/dropdown.jpg`, quality: 90 });
        }
        results.interactions.push(
          `${lang}: transparent / scroll / restore / keyboard focus${lang === "zh" ? " / submenu" : ""}`,
        );
      }
      if (width === 375) {
        await page.locator("[data-drawer-open]").click();
        assert.equal(
          await page.locator("[data-drawer]").getAttribute("aria-hidden"),
          "false",
        );
        await page.keyboard.press("Escape");
        assert(
          await page
            .locator("[data-drawer-open]")
            .evaluate((el) => el === document.activeElement),
        );
        results.interactions.push(
          `${lang}: mobile menu / Escape / focus restore`,
        );
      }
      results.layouts.push({ lang, width, height });
      await page.close();
    }
  for (const lang of ["zh", "en"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    await page.goto(`http://127.0.0.1:4322/${lang}/?motion=full`, {
      waitUntil: "networkidle",
    });
    await page.locator("[data-carousel-pause]").click();
    assert.equal(
      await page.locator("[data-carousel-pause]").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator('[data-dot="1"]').click();
    await page.waitForTimeout(700);
    assert(await page.locator('[data-dot="1"].on').count());
    await page.locator("[data-carousel]").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    assert(await page.locator('[data-dot="2"].on').count());
    assert.equal(await page.locator(".nav-ink[data-photo-ink]").count(), 0);
    results.interactions.push(
      `${lang}: pause / crossfade / keyboard next / theme reset`,
    );
    await page.close();
  }
  assert.deepEqual(results.errors, []);
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
}
console.log(
  `${results.layouts.length} layouts; ${results.slides.length} slide checks; ${results.interactions.length} interaction groups; ${results.errors.length} script errors`,
);
