/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out = "artifacts/r84-type";
const base = process.env.TEST_URL || "http://127.0.0.1:4354";
const b = await chromium.launch({ channel: "msedge" });
const report = { layouts: [], frames: [], accessibility: [], errors: [] };
for (const lang of ["zh", "en"])
  for (const route of ["", "products/"])
    for (const [width, height] of [
      [320, 812],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [1920, 900],
      [2560, 1300],
      [812, 375],
      [960, 540],
    ]) {
      const key = route ? "catalog" : "home";
      const context = await b.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const p = await context.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(`${base}/${lang}/${route}`, { waitUntil: "networkidle" });
      await p.evaluate(() => document.fonts.ready);
      const slides = await p.locator("[data-dot]").count();
      const expected = route ? 4 : 5;
      assert.equal(slides, expected);
      const everyFrame = [375, 1440, 1920].includes(width);
      const frames = everyFrame ? slides : 1;
      for (let i = 0; i < frames; i++) {
        await p.locator("[data-dot]").nth(i).click();
        await p.waitForFunction(
          (i) => {
            const slide = document.querySelectorAll("[data-slide]").item(i);
            return slide?.classList.contains("on");
          },
          i,
        );
        await p.locator(".slide.on img").evaluate((e) => e.decode());
        await p.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        const data = await p.evaluate(() => {
          const box = (s) => {
            const e = document.querySelector(s),
              r = e.getBoundingClientRect(),
              cs = getComputedStyle(e);
            return {
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
              bottom: r.bottom,
              size: parseFloat(cs.fontSize),
              line: parseFloat(cs.lineHeight),
              weight: cs.fontWeight,
              color: cs.color,
            };
          };
          return {
            hero: box(".editorial-hero"),
            heading: box(".hero-intro h1"),
            sub: box(".h-hero-sub"),
            action: box(".hero-action"),
            nav: box(".gnb"),
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            font: document.fonts.check('400 16px "Banda Sans"'),
          };
        });
        assert.ok(data.overflow <= 1, `${lang} ${key} ${width} overflow`);
        assert.ok(data.font);
        assert.ok(
          data.heading.bottom <= data.sub.y + 1,
          `${lang} ${key} ${width} ${i} heading/sub overlap`,
        );
        assert.ok(
          data.heading.x >= 0 && data.heading.x + data.heading.w <= width + 1,
        );
        assert.ok(
          data.heading.y >= data.nav.bottom - 1,
          `${lang} ${key} ${width} ${i} nav overlap`,
        );
        assert.ok(
          data.action.bottom <= data.hero.bottom + 1,
          `${lang} ${key} ${width} ${i} action outside hero`,
        );
        if (width >= 1280 && !route)
          assert.ok(
            Math.abs(
              data.hero.h -
                Math.max(width * 0.40625, Math.min(height, width * 0.568)),
            ) < 3,
            "home height changed",
          );
        report.frames.push({ lang, key, width, frame: i, ...data });
        if (everyFrame)
          await p.screenshot({
            path: `${out}/final-${lang}-${key}-${width}-${i}.png`,
          });
      }
      if ([375, 1440].includes(width)) {
        await p.locator("[data-dot]").first().click();
        const axe = await new AxeBuilder({ page: p })
          .include(".editorial-hero")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.accessibility.push({
          lang,
          key,
          width,
          violations: axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(
          axe.violations.length,
          0,
          `${lang} ${key} ${width} axe violations`,
        );
        const button = p.locator("[data-dot]").first();
        await button.focus();
        await p.keyboard.press("ArrowRight");
        await p.waitForFunction(() =>
          document
            .querySelectorAll("[data-slide]")[1]
            ?.classList.contains("on"),
        );
        assert.equal(await p.locator(".slide.on").count(), 1);
      }
      report.layouts.push({ lang, key, width, height });
      await context.close();
      console.log(lang, key, width, "pass");
    }
assert.deepEqual(report.errors, []);
await b.close();
await fs.writeFile(`${out}/regression.json`, JSON.stringify(report, null, 2));
