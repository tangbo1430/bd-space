/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.REVIEW_OUTPUT ?? "artifacts/r59-refinement/home-checks";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
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
      [1920, 900],
      [2560, 1440],
      [844, 390],
      [720, 450],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (error) => results.errors.push(error.message));
      await page.goto(`${base}/${lang}/`, {
        waitUntil: "networkidle",
      });
      const initial = await page.locator(".desktop-navigation").boundingBox();
      const initialLogo = await page.locator(".gnb .logo").boundingBox();
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
          const cover = getComputedStyle(img).objectFit === "cover";
          const scale = cover
            ? Math.max(
                ir.width / img.naturalWidth,
                ir.height / img.naturalHeight,
              )
            : ir.width / img.naturalWidth;
          const rw = img.naturalWidth * scale,
            rh = img.naturalHeight * scale;
          const left = ir.left + (ir.width - rw) / 2,
            top = ir.top + (ir.height - rh) / 2;
          const hr = hero.getBoundingClientRect();
          return {
            cover,
            heroHeight: hr.height,
            frameWidth: fr.width,
            visibleLeft: (ir.left - left) / rw,
            visibleRight: (ir.right - left) / rw,
            verticalCrop: Math.abs(rh - ir.height),
            divider: getComputedStyle(hero).borderBottomWidth,
            dividerColor: getComputedStyle(hero).borderBottomColor,
            sectionGap: Math.abs(
              document.querySelector(".h-products").getBoundingClientRect()
                .top - hr.bottom,
            ),
            brand: header.dataset.brandTone,
            controls: hero
              .querySelector(".hero-controls")
              .getBoundingClientRect()
              .toJSON(),
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
            header: header.getBoundingClientRect().toJSON(),
            logo: header
              .querySelector(".logo")
              .getBoundingClientRect()
              .toJSON(),
            nav: header
              .querySelector(".desktop-navigation")
              .getBoundingClientRect()
              .toJSON(),
            copy: copy.getBoundingClientRect().toJSON(),
            stage: fr.toJSON(),
            ink: [
              ...header.querySelectorAll(".desktop-navigation .nav-ink"),
            ].filter((e) => e.hasAttribute("data-photo-ink")).length,
            navLetters: [
              ...header.querySelectorAll(".desktop-navigation .nav-ink"),
            ].map((el) => {
              const style = getComputedStyle(el);
              return {
                color: style.color,
                filter: style.filter,
                background: style.backgroundImage,
                weight: style.fontWeight,
                shadow: style.textShadow,
              };
            }),
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
                Math.abs(offsets[0] - (left - r.left)),
                Math.abs(offsets[1] - (top - r.top)),
              );
            }),
          };
        });
        assert(state.overflow <= 1, "no horizontal overflow");
        if (index === 0) {
          assert.equal(
            state.photo.includes("r65-layered-4s.webp"),
            width >= 1280,
            "approved layered image is desktop-only; smaller screens retain responsive source photos",
          );
        }
        const full = width >= 1280 && width / height <= 1.9;
        assert.equal(state.cover, full);
        assert(
          state.gap < 1 && Math.abs(state.frameWidth - width) < 1,
          "no image bars",
        );
        if (full) {
          assert(
            Math.abs(
              state.heroHeight -
                Math.min(Math.max(width * 0.40625, height), width * 0.568),
            ) < 1,
            "bounded full-screen frame",
          );
          assert(state.verticalCrop < 1, "complete source image height");
          const roof = [
            [0.225, 0.72],
            [0.2, 0.85],
            [0.19, 0.8],
            [0.24, 0.76],
            [0.175, 0.77],
          ][index];
          assert(
            state.visibleLeft < roof[0] && state.visibleRight > roof[1],
            "roof silhouette inside crop",
          );
        } else assert(state.crop < 1, "complete original photograph");
        assert.equal(state.divider, "2px");
        assert.equal(state.dividerColor, "rgb(255, 255, 255)");
        assert(
          state.sectionGap < 1,
          "adjacent sections separated only by white rule",
        );
        if (width >= 1280) {
          const brands = ["dark", "dark", "dark", "dark", "dark"];
          assert.equal(state.brand, brands[index]);
          assert(
            state.controls.bottom <= state.stage.bottom &&
              state.controls.height >= 44,
          );
        }
        assert.equal(state.imageFilter, "none");
        assert.equal(state.overlay, "none");
        assert.equal(state.titleShadow, "none");
        if (width >= 1280) {
          assert.equal(state.headerBg, "rgba(0, 0, 0, 0)");
          assert(
            Math.abs(state.nav.x - initial.x) < 1 &&
              Math.abs(state.nav.y - initial.y) < 1 &&
              Math.abs(state.nav.height - initial.height) < 1 &&
              Math.abs(state.nav.width - initial.width) < 1,
            "navigation stays in place",
          );
          assert.equal(state.header.y, 0);
          assert.equal(state.header.height, 80);
          for (const property of ["x", "y", "width", "height"])
            assert(
              Math.abs(state.logo[property] - initialLogo[property]) < 1,
              "logo stays in place across slides",
            );
          assert(
            state.copy.bottom < state.stage.bottom,
            "copy and action fit in photograph",
          );
          assert.equal(state.ink, 0);
          for (const letter of state.navLetters) {
            const darkNavigation = true;
            assert.equal(
              letter.color,
              darkNavigation ? "rgb(24, 34, 30)" : "rgb(255, 255, 255)",
            );
            assert.equal(letter.filter, "none");
            assert.equal(letter.background, "none");
            assert.equal(letter.weight, "500");
            assert.equal(letter.shadow === "none", darkNavigation);
          }
          assert.equal(state.subtitleInk, [1, 3].includes(index));
          assert(
            state.inkAlignment.every((error) => error < 1),
            "foreground stays aligned after copy moves",
          );
        } else {
          assert.equal(state.ink, 0);
          assert.equal(state.subtitleInk, false);
        }
        if ([375, 1280, 1440, 1920, 2560].includes(width))
          await page.screenshot({
            path: `${out}/${lang}-${width}x${height}-${index}.jpg`,
            quality: 85,
          });
        results.slides.push({ lang, width, height, index, ...state });
      }
      if (width === 1440) {
        await page.locator('[data-dot="1"]').click();
        await page.waitForTimeout(150);
        await page.evaluate(() => window.scrollTo(0, 120));
        await page.waitForTimeout(250);
        assert(await page.locator(".gnb.scrolled").count());
        assert.equal(await page.locator(".nav-ink[data-photo-ink]").count(), 0);
        assert(
          await page
            .locator(".desktop-navigation .nav-ink")
            .evaluateAll((els) =>
              els.every(
                (el) =>
                  getComputedStyle(el).textShadow === "none" &&
                  getComputedStyle(el).color === "rgb(24, 34, 30)",
              ),
            ),
          "solid header restores dark lettering without shadows",
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        assert.equal(await page.locator(".nav-ink[data-photo-ink]").count(), 0);
        assert(
          await page
            .locator(".desktop-navigation .nav-ink")
            .evaluateAll((els) =>
              els.every(
                (el) =>
                  getComputedStyle(el).textShadow !== "none" &&
                  getComputedStyle(el).color === "rgb(255, 255, 255)",
              ),
            ),
          "transparent header restores complete white lettering",
        );
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
    await page.goto(`${base}/${lang}/?motion=full`, {
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
