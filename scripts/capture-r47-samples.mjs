/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:4325";
const output = "artifacts/r47-review/after";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const captures = [];
try {
  for (const lang of ["zh", "en"])
    for (const suffix of ["", "products/", "products/4s/"])
      for (const [width, height] of [
        [375, 812],
        [1440, 900],
        [1920, 1080],
      ]) {
        if (process.env.REVIEW_HOME_ONLY && suffix) continue;
        const route = `/${lang}/${suffix}`;
        const key = route.replaceAll("/", "_");
        const page = await browser.newPage({
          viewport: { width, height },
          reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(base + route, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (const img of document.images) img.loading = "eager";
          await Promise.all(
            [...document.images].map((img) => img.decode().catch(() => {})),
          );
          document
            .querySelectorAll(".rv")
            .forEach((el) => el.classList.add("in"));
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(200);
        const geometry = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          missing: [...document.images]
            .filter((img) => !img.complete || !img.naturalWidth)
            .map((img) => img.src),
          duplicateArea: /m²\s*m²/.test(document.body.textContent),
          sections: Object.fromEntries(
            ["spaces", "specifications"].map((id) => {
              const e = document.getElementById(id),
                r = e?.getBoundingClientRect();
              return [
                id,
                r
                  ? {
                      x: Math.floor(r.x),
                      y: Math.floor(r.y + window.scrollY),
                      width: Math.ceil(r.width),
                      height: Math.ceil(r.height),
                    }
                  : null,
              ];
            }),
          ),
        }));
        assert(geometry.overflow <= 1 && !geometry.duplicateArea, `${route}/${width}: ${JSON.stringify(geometry)}`);
        assert.deepEqual(geometry.missing, []);
        assert.deepEqual(errors, []);
        await page.screenshot({
          path: `${output}/${key}-${width}-fold.jpg`,
          quality: 85,
        });
        await page.screenshot({
          path: `${output}/${key}-${width}-full.jpg`,
          quality: 78,
          fullPage: true,
        });
        const dots = page.locator("[data-dot]");
        for (let i = 0; i < (await dots.count()); i++) {
          await dots.nth(i).click();
          await page.waitForFunction(
            (i) =>
              document
                .querySelector(`[data-dot="${i}"]`)
                ?.classList.contains("on"),
            i,
          );
          await page.locator(".slide.on img").evaluate((img) => img.decode());
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);
          const fit = await page.locator(".hero-content").evaluate((el) => {
            const r = el.getBoundingClientRect(),
              stage = document
                .querySelector(".hero-stage")
                .getBoundingClientRect();
            const heading = el.querySelector("h1"),
              h = heading.getBoundingClientRect();
            return {
              bottom: r.bottom,
              stageBottom: stage.bottom,
              lines:
                h.height / parseFloat(getComputedStyle(heading).lineHeight),
            };
          });
          assert(
            fit.lines <= 2.1,
            `${route}/${width}/${i}: heading exceeds two lines`,
          );
          if (width >= 1280)
            assert(
              fit.bottom <= fit.stageBottom,
              `${route}/${width}/${i}: copy outside photo`,
            );
          await page.screenshot({
            path: `${output}/${key}-${width}-slide${i}.jpg`,
            quality: 85,
          });
        }
        captures.push({ route, key, width, height, ...geometry });
        await page.close();
        console.log(`Captured ${route} ${width}`);
      }
} finally {
  await browser.close();
}
const previous = process.env.REVIEW_HOME_ONLY
  ? JSON.parse(await readFile(`${output}/captures.json`, "utf8")).filter(
      (item) => item.route !== "/zh/" && item.route !== "/en/",
    )
  : [];
await writeFile(
  `${output}/captures.json`,
  JSON.stringify([...previous, ...captures], null, 2),
);
