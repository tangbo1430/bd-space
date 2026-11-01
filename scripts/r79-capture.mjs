/* global document */
import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = "artifacts/r79-review";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function open(path, port = 4351) {
  await page.goto(`http://127.0.0.1:${port}${path}`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
    await Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    );
    document.querySelectorAll(".rv").forEach((e) => e.classList.add("in"));
  });
  await page.waitForTimeout(600);
}
for (const width of [1440, 2560, 375]) {
  await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
  for (const [key, path, selector] of [
    ["home", "/zh/", ".home-hero"],
    ["catalog", "/zh/products/", ".catalog-hero"],
    ["compare", "/zh/products/#product-comparison", ".product-comparison"],
    ["film", "/zh/products/4s/#installation-video", "#installation-video"],
    ["drawings", "/zh/products/grayscale/#diagrams", "#diagrams"],
    ["eco", "/zh/products/grayscale-eco/#diagrams", "#diagrams"],
    ["contact", "/zh/contact/#wechat", "#wechat"],
  ]) {
    await open(path);
    await page
      .locator(selector)
      .screenshot({ path: `${out}/${key}-${width}.png` });
    if (key === "home")
      await page.screenshot({
        path: `${out}/home-full-${width}.png`,
        fullPage: true,
      });
    if (key === "catalog" && width === 1440)
      for (let i = 1; i < 4; i++) {
        await page.locator(`[data-dot="${i}"]`).click();
        await page.waitForTimeout(650);
        await page
          .locator(selector)
          .screenshot({ path: `${out}/catalog-${width}-${i}.png` });
      }
  }
}
await fs.writeFile(
  `${out}/capture-errors.json`,
  JSON.stringify(errors, null, 2),
);
await browser.close();
console.log("Captured first-batch actual pages; script errors:", errors);
