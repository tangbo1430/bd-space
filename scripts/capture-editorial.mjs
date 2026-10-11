import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = new URL("../artifacts/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = [];
for (const width of [1440, 375]) {
  const page = await browser.newPage({
    viewport: { width, height: width === 375 ? 812 : 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  for (const route of [
    "",
    "products/",
    "about/",
    "cases/",
    "contact/",
    "products/4s/",
    "qualifications/",
    "about/investors/",
  ]) {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      (process.env.TEST_BASE_URL ?? "http://localhost:4321") + "/zh/" + route,
      {
        waitUntil: "networkidle",
      },
    );
    await page.addStyleTag({
      content: "astro-dev-toolbar{display:none!important}",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of document.images) image.loading = "eager";
      await Promise.all(
        [...document.images].map((image) => image.decode().catch(() => {})),
      );
      for (let y = 0; y < document.body.scrollHeight; y += 650) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 35));
      }
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: new URL(
        `${route.replaceAll("/", "-") || "home"}-${width}.png`,
        out,
      ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
      fullPage: true,
    });
    report.push({
      route,
      width,
      errors,
      ...(await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        broken: [...document.images]
          .filter((i) => !i.complete || i.naturalWidth === 0)
          .map((i) => i.currentSrc),
        h1: document.querySelectorAll("h1").length,
      }))),
    });
    if (route === "products/") {
      for (const system of ["panels", "modules", "hybrid"]) {
        await page.locator(`label[for="system-${system}"]`).click();
        await page.locator("[data-systems-explorer]").screenshot({
          path: new URL(`system-${system}-${width}.png`, out).pathname.replace(
            /^\/([A-Za-z]:)/,
            "$1",
          ),
        });
      }
    }
    if (route === "products/4s/") {
      await page.locator("[data-gallery]").first().click();
      await page.locator(".viewer-image").evaluate((el) => el.decode());
      await page.screenshot({
        path: new URL(`photo-viewer-${width}.png`, out).pathname.replace(
          /^\/([A-Za-z]:)/,
          "$1",
        ),
      });
      await page.keyboard.press("Escape");
    }
  }
  await page.close();
}
await writeFile(
  new URL("visual-audit.json", out),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
