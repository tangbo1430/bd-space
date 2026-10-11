/* global document, innerWidth */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/copy-r30";
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
  downloads: [],
  accessibility: [],
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
for (const lang of ["zh", "en"]) {
  for (const width of [320, 375, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/${lang}/contact/`);
    const form = page.locator("[data-consult-form]");
    await form.scrollIntoViewIfNeeded();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(await form.locator('a[href$="/privacy/"]').count(), 0);
    if (width === 375 || width === 1440) {
      const axe = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(axe.violations, []);
      report.accessibility.push({
        lang,
        width,
        violations: 0,
        incomplete: axe.incomplete.map((x) => x.id),
      });
      await form.screenshot({
        path: path.join(output, `${lang}-contact-${width}.png`),
      });
    }
    report.layouts.push({
      route: `/${lang}/contact/`,
      width,
      copy: "passed",
      overflow: false,
    });
  }
  await page.locator("[data-download-inquiry]").click();
  assert((await page.locator(".field.err").count()) > 0);
  await page.locator('[name="name"]').fill(lang === "en" ? "Review" : "验收");
  await page.locator('[name="contact"]').fill("review@example.com");
  await page
    .locator('[name="message"]')
    .fill(lang === "en" ? "Review project brief" : "验收项目需求");
  const waitDownload = page.waitForEvent("download");
  await page.locator("[data-download-inquiry]").click();
  const download = await waitDownload;
  const text = await fs.readFile(await download.path(), "utf8");
  assert(text.includes(lang === "en" ? "has not been sent" : "尚未发送"));
  assert.doesNotMatch(text, /本地需求草稿|local project brief/);
  assert(
    (await page.locator("[data-download-status]").innerText()).includes(
      lang === "en" ? "has not been sent" : "尚未发送",
    ),
  );
  await page.locator('[name="message"]').fill("Updated project brief");
  assert(
    (await page.locator("[data-download-status]").innerText()).includes(
      lang === "en" ? "changed" : "已修改",
    ),
  );
  report.downloads.push({
    lang,
    filename: download.suggestedFilename(),
    validation: true,
    notSent: true,
    modifiedReminder: true,
  });
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
    downloads: report.downloads.length,
    accessibility: report.accessibility.length,
    errors: report.errors,
    posts: report.posts,
  }),
);
