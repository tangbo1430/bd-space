import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const projects = JSON.parse(
  await readFile(new URL("../src/data/projects.json", import.meta.url), "utf8"),
);
const base = process.env.TEST_BASE_URL ?? "http://localhost:4321";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const report = { layouts: [], checks: [], accessibility: [], errors: [] };
page.on("pageerror", (error) => report.errors.push(error.message));
const viewports = [320, 375, 768, 1024, 1440, 1920].map((width) => ({
  width,
  height: width < 768 ? 812 : 900,
}));
viewports.push({ width: 844, height: 390 }, { width: 720, height: 450 });
for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  for (const route of [
    "cases",
    "qualifications",
    "contact",
    "about/investors",
  ]) {
    await page.goto(`${base}/zh/${route}/`, { waitUntil: "networkidle" });
    if (route === "qualifications") {
      await page.locator(".evidence-item summary").first().focus();
      await page.keyboard.press("Enter");
      assert(
        await page
          .locator(".evidence-item")
          .first()
          .evaluate((e) => e.open),
      );
    }
    if (route === "cases") {
      const first = await page.locator(".case-project").nth(0).boundingBox();
      const second = await page.locator(".case-project").nth(1).boundingBox();
      assert.equal(
        Math.abs(first.x - second.x) < 1,
        viewport.width < 768,
        "case column count",
      );
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} overflows with content open at ${viewport.width}`,
    );
    report.layouts.push({ route, ...viewport });
  }
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/zh/cases/`, { waitUntil: "networkidle" });
for (const project of projects) {
  const links = page.locator(`[data-gallery="${project.id}"]`);
  assert.equal(await links.count(), project.gallery.length + 1);
  await links.last().click();
  assert(
    (await page.locator("[data-viewer-caption]").textContent()).includes(
      project.name,
    ),
  );
  assert(
    (await page.locator(".viewer-image").getAttribute("src")).includes(
      `project-${project.id}-`,
    ),
  );
  await page.keyboard.press("Escape");
}
report.checks.push(
  "Ten project galleries preserve source grouping and captions",
);
for (const id of ["cayman", "changzhou", "brisbane", "chengdu"]) {
  await page.goto(`${base}/zh/cases/#${id}`, { waitUntil: "networkidle" });
  const bounds = await page.locator(`#${id}`).boundingBox();
  assert(bounds.y >= 80 && bounds.y < 200, `legacy anchor ${id}`);
}
report.checks.push(
  "Four legacy project anchors land below the fixed navigation",
);
for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  await page.setViewportSize(viewport);
  await page.goto(`${base}/zh/products/4s/`, { waitUntil: "networkidle" });
  const totalPhotos = String(
    await page.locator('[data-gallery="4s"]').count(),
  ).padStart(2, "0");
  await page.locator('[data-gallery="4s"]').last().click();
  await page.locator(".viewer-image").evaluate((e) => e.decode());
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `${totalPhotos} / ${totalPhotos}`,
  );
  assert(
    await page.locator("[data-viewer-thumbnails]").evaluate((el) => {
      const current = el
        .querySelector('[aria-pressed="true"]')
        .getBoundingClientRect();
      const frame = el.getBoundingClientRect();
      return current.left >= frame.left - 1 && current.right <= frame.right + 1;
    }),
    "selected thumbnail remains visible",
  );
  assert(
    await page
      .locator("[data-photo-viewer]")
      .evaluate(
        (e) => e.scrollWidth <= innerWidth && e.scrollHeight <= innerHeight,
      ),
  );
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `01 / ${totalPhotos}`,
  );
  await page.keyboard.press("Escape");
  await page.goto(`${base}/zh/contact/`, { waitUntil: "networkidle" });
  for (const contact of ["wang", "huang", "tang"]) {
    await page.locator(`.wechat-code[href$="wechat-${contact}.png"]`).click();
    await page.locator(".viewer-image").evaluate((e) => e.decode());
    assert(
      (await page.locator(".viewer-image").getAttribute("src")).endsWith(
        `wechat-${contact}.png`,
      ),
    );
    assert(
      await page
        .locator(".viewer-image")
        .evaluate((e) => e.naturalWidth === e.naturalHeight),
    );
    assert(
      await page
        .locator("[data-photo-viewer]")
        .evaluate(
          (e) => e.scrollWidth <= innerWidth && e.scrollHeight <= innerHeight,
        ),
    );
    await page.keyboard.press("Escape");
  }
}
report.checks.push(
  "Product gallery wraps, scrolls selected thumbnails into view; QR viewers work in portrait and landscape",
);
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${base}/zh/contact/?project=fiji`, {
  waitUntil: "networkidle",
});
assert(
  (await page.locator('[name="message"]').inputValue()).includes("斐济样箱"),
);
assert.equal(
  await page.locator('.contact-quick a[href="tel:18503005860"]').count(),
  1,
);
assert.equal(
  await page.locator('.contact-information a[href="tel:18503005860"]').count(),
  1,
);
assert.equal(
  await page
    .locator('.contact-information a[href="mailto:411547750@qq.com"]')
    .count(),
  1,
);
assert.equal(
  await page
    .locator('.contact-quick a[href="mailto:411547750@qq.com"]')
    .count(),
  1,
);
assert.equal(
  await page
    .locator('.inquiry-next-step a[href="mailto:411547750@qq.com"]')
    .count(),
  1,
);
report.checks.push(
  "New project inquiry parameters and direct telephone/email links",
);
for (const width of [1440, 375]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/zh/qualifications/`, { waitUntil: "networkidle" });
  await page.locator(".evidence-item summary").first().click();
  let result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    page: "expanded-report",
    width,
    violations: result.violations,
  });
  await page.goto(`${base}/zh/contact/`, { waitUntil: "networkidle" });
  await page.locator(".wechat-code").first().click();
  result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    page: "qr-viewer",
    width,
    violations: result.violations,
  });
}
await browser.close();
await writeFile(
  new URL("../artifacts/materials-browser-audit.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
assert.equal(report.errors.length, 0);
assert(report.accessibility.every((s) => !s.violations.length));
console.log(
  `${report.layouts.length} content layouts, ${report.checks.length} interaction groups and ${report.accessibility.length} additional accessibility scenarios passed.`,
);
