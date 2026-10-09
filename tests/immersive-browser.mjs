import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://localhost:4321";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = [];
const routes = [
  "",
  "products/",
  "products/4s/",
  "products/5s/",
  "products/6s/",
  "products/grayscale/",
  "about/",
  "products/bd8/",
  "products/bd9/",
];
const layouts = [
  [320, 812],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [812, 375],
  [720, 450],
];
for (const [width, height] of layouts) {
  // 720 CSS pixels at DPR 2 represents the reflow space of a 1440px window at 200%.
  const zoomEquivalent = width === 720;
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "reduce",
    deviceScaleFactor: zoomEquivalent ? 2 : 1,
  });
  for (const route of routes) {
    await page.goto(base + "/zh/" + route, { waitUntil: "networkidle" });
    const geometry = await page.evaluate(() => {
      const section = document.querySelector(".editorial-hero, .cover-visual");
      const bounds = section.getBoundingClientRect();
      const header = document
        .querySelector("[data-gnb]")
        .getBoundingClientRect();
      const heading = section.querySelector("h1");
      const title = heading.getBoundingClientRect();
      const actions = section
        .querySelector(".cover-actions")
        .getBoundingClientRect();
      const control = section
        .querySelector(".hero-controls")
        ?.getBoundingClientRect();
      const caption = section
        .querySelector(".slide.on .hero-bottom")
        ?.getBoundingClientRect();
      const overlaps = (a, b) =>
        Boolean(
          a &&
          b &&
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top,
        );
      const elements = [title, actions, control, caption].filter(Boolean);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped: elements.some(
          (r) =>
            r.left < bounds.left - 1 ||
            r.right > bounds.right + 1 ||
            r.bottom > bounds.bottom + 1,
        ),
        overlap:
          overlaps(title, actions) ||
          overlaps(actions, control) ||
          overlaps(actions, caption) ||
          overlaps(control, caption),
        headerOverlap: title.top < header.bottom,
        headingColor: getComputedStyle(heading).color,
        headerBackground: getComputedStyle(document.querySelector("[data-gnb]"))
          .backgroundColor,
        targets: [
          ...section.querySelectorAll(
            ".cover-actions a, .hero-control, .hero-scene",
          ),
        ]
          .filter((el) => el.getClientRects().length)
          .every((el) => el.getBoundingClientRect().height >= 44),
      };
    });
    report.push({ route, width, height, zoomEquivalent, ...geometry });
    assert(
      !geometry.overflow &&
        !geometry.clipped &&
        !geometry.overlap &&
        !geometry.headerOverlap,
      JSON.stringify(report.at(-1)),
    );
    assert.equal(geometry.headingColor, "rgb(255, 255, 255)");
    assert.equal(
      geometry.headerBackground,
      width >= 1280 ? "rgba(0, 0, 0, 0)" : "rgb(255, 255, 255)",
    );
    assert(geometry.targets);
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForFunction(() =>
      document.querySelector("[data-gnb]").classList.contains("scrolled"),
    );
  }
  await page.close();
}
await writeFile(
  new URL("../artifacts/immersive-audit.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
await browser.close();
console.log(
  `${report.length} cover, header, touch-target and 200% equivalent reflow checks passed.`,
);
