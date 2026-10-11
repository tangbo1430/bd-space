/* global document, innerWidth */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/copy-browser";
await fs.mkdir(output, { recursive: true });
const files = (await fs.readdir("dist", { recursive: true })).filter((f) =>
  f.endsWith(".html"),
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage();
const report = {
  base,
  layouts: [],

  errors: [],
  missing: [],
  posts: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().endsWith("/404.html"))
    report.missing.push(r.url());
});
page.on("request", (r) => {
  if (r.method() === "POST") report.posts.push(r.url());
});
const banned =
  /在线提交暂未开通|备案信息待完善|准备中|资料独立口径|资料另列|资料所列|新版资料|原口径列示|完整保留资料|依据提供的扫描证书|据提供的股权|产品图与技术资料正在整理|经确认的开放职位|source figure|source total|supplied material|formal source|annotations are retained|Online submission is not available/;
for (const width of [375, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const file of files) {
    const route = "/" + file.replaceAll("\\", "/").replace(/index.html$/, "");
    await page.goto(base + route);
    if (route === "/") await page.waitForURL("**/zh/");
    await page.evaluate(() => document.fonts.ready);
    assert.doesNotMatch(await page.locator("body").innerText(), banned, route);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} @ ${width}: overflow`,
    );
    assert.equal(
      await page
        .locator('footer a[href$="/privacy/"], footer a[href$="/cookies/"]')
        .count(),
      0,
    );
    report.layouts.push({ route, width, copy: "passed", overflow: false });
  }
}
assert.deepEqual(report.errors, []);
assert.deepEqual(report.missing, []);
assert.deepEqual(report.posts, []);
await browser.close();
await fs.writeFile(
  path.join(output, "report.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    layouts: report.layouts.length,

    errors: report.errors,
    posts: report.posts,
  }),
);
