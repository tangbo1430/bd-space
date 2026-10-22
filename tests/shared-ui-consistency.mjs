/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/r76-consistency/local";
await mkdir(output, { recursive: true });
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((p) =>
        p.isDirectory() ? walk(`${dir}/${p.name}`) : [`${dir}/${p.name}`],
      ),
    )
  ).flat();
}
const routes = [];
for (const f of (await walk("dist")).filter((p) => p.endsWith(".html")))
  if ((await readFile(f, "utf8")).includes("data-gnb"))
    routes.push(f.slice(4).replace(/index\.html$/, ""));
const report = {
  base,
  views: [],
  menus: [],
  anchors: [],
  actions: [],
  axe: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rectEqual = (a, b, label) => {
  for (const key of ["x", "y", "width", "height"])
    assert.ok(
      Math.abs(a[key] - b[key]) < 0.6,
      `${label}: ${key} ${a[key]} vs ${b[key]}`,
    );
};
const contrast = (rgb) => {
  const channels = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
    .map((v) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return (
    1.05 /
    (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 + 0.05)
  );
};
async function ready(page, path, width, height = 1000) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(base + path, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  assert.equal(response.status(), 200, path);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll(".rv").forEach((e) => e.classList.add("in"));
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = "eager";
        try {
          await img.decode();
        } catch {
          /* Assert broken images below. */
        }
      }),
    );
  });
}
const reference = {};
const jobs = routes.flatMap((path) =>
  [375, 1440].map((width) => ({ path, width })),
);
let next = 0;
async function worker() {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (e) =>
    report.errors.push({ url: page.url(), message: e.message }),
  );
  while (next < jobs.length) {
    const { path, width } = jobs[next++];
    try {
      await ready(page, path, width);
      const d = await page.evaluate(() => {
        const shown = (e) =>
          e.checkVisibility() && !e.closest("[hidden],[inert]");
        const box = (e) => e.getBoundingClientRect().toJSON();
        return {
          header: box(document.querySelector(".gnb .official-brand")),
          footer: box(document.querySelector(".footer-brand .official-brand")),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          broken: [...document.images]
            .filter((i) => !i.naturalWidth)
            .map((i) => i.currentSrc),
          actions: [...document.querySelectorAll(".action")]
            .filter(shown)
            .map((e) => {
              const s = getComputedStyle(e);
              return {
                text: e.textContent.trim(),
                box: box(e),
                font: s.fontFamily,
                size: parseFloat(s.fontSize),
                tracking: parseFloat(s.letterSpacing),
                radius: s.borderRadius,
                secondary: e.classList.contains("action-secondary"),
              };
            }),
          smallText: [
            ...document.querySelectorAll(
              "main p, main figcaption, .gnb a, footer a",
            ),
          ]
            .filter(shown)
            .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
            .map((e) => e.textContent.trim()),
          foreignFonts: [
            ...document.querySelectorAll(
              "main p, main h1, main h2, button, .action, footer a",
            ),
          ]
            .filter(shown)
            .filter(
              (e) => !getComputedStyle(e).fontFamily.includes("Banda Sans"),
            )
            .map((e) => e.textContent.trim()),
          smallButtons: [...document.querySelectorAll("button")]
            .filter(shown)
            .filter((e) => box(e).width < 43.9 || box(e).height < 43.9)
            .map((e) => e.outerHTML.slice(0, 150)),
        };
      });
      assert.ok(d.overflow <= 1, `${path}: overflow`);
      assert.deepEqual(d.broken, [], `${path}: broken image`);
      assert.deepEqual(d.smallText, [], `${path}: small text`);
      assert.deepEqual(d.foreignFonts, [], `${path}: font mismatch`);
      assert.deepEqual(d.smallButtons, [], `${path}: small button`);
      const ref = (reference[width] ??= d);
      rectEqual(d.header, ref.header, `${path}: header logo`);
      for (const key of ["width", "height"])
        assert.ok(
          Math.abs(d.footer[key] - ref.footer[key]) < 0.6,
          `${path}: footer logo ${key}`,
        );
      for (const action of d.actions) {
        assert.ok(action.box.height >= 44, `${path}: ${action.text} target`);
        assert.ok(
          Math.abs(
            action.tracking -
              action.size * (path.startsWith("/en/") ? 0.01 : 0.06),
          ) < 0.01,
          `${path}: ${action.text} tracking ${action.tracking}`,
        );
        assert.equal(
          action.radius,
          action.secondary ? "0px" : "2px",
          `${path}: ${action.text} radius`,
        );
      }
      report.views.push({ path, width, ...d });
      const core =
        /^\/(zh|en)\/(?:|products\/|products\/(grayscale|grayscale-eco|4s|5s|6s|bd8|bd9)\/|cases\/|about\/|contact\/)$/;
      if (width === 375 && core.test(path)) {
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.axe.push({
          path,
          violations: a.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(a.violations.length, 0, `${path}: accessibility`);
      }
      await page.screenshot({
        path: `${output}/${path.replace(/\W+/g, "-")}-${width}.jpg`,
        quality: 78,
      });
      console.log(path, width, "pass");
    } catch (e) {
      report.errors.push({ path, width, message: e.stack });
    }
  }
  await context.close();
}
try {
  if (!process.env.UI_STATES_ONLY) await Promise.all([worker(), worker()]);
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (e) =>
    report.errors.push({ url: page.url(), message: e.message }),
  );
  for (const lang of ["zh", "en"]) {
    for (const width of [320, 375, 768, 1024, 1279]) {
      await ready(
        page,
        `/${lang}/products/`,
        width,
        width === 768 ? 390 : 1000,
      );
      const logo = await page.locator(".gnb .official-brand").boundingBox();
      const burger = await page.locator("[data-drawer-open]").boundingBox();
      await page.locator("[data-drawer-open]").focus();
      await page.keyboard.press("Enter");
      const openLogo = await page
        .locator(".drawer-brand .official-brand")
        .boundingBox();
      const close = await page.locator("[data-drawer-close]").boundingBox();
      rectEqual(openLogo, logo, `${lang} ${width}: menu logo jump`);
      rectEqual(close, burger, `${lang} ${width}: close button jump`);
      const focus = await page.locator("[data-drawer-close]").evaluate((e) => ({
        active: e === document.activeElement,
        visible: e.matches(":focus-visible"),
        outline: getComputedStyle(e).outlineColor,
      }));
      assert.ok(focus.active && focus.visible, "menu keyboard focus");
      assert.ok(contrast(focus.outline) >= 3, "menu focus contrast");
      assert.ok(
        await page
          .locator(
            `.drawer-link[aria-current="page"][href="/${lang}/products/"]`,
          )
          .isVisible(),
        "current mobile navigation",
      );
      await page.screenshot({
        path: `${output}/${lang}-menu-${width}.jpg`,
        quality: 82,
      });
      await page.keyboard.press("Escape");
      assert.ok(
        await page
          .locator("[data-drawer-open]")
          .evaluate((e) => e === document.activeElement),
        "menu focus restoration",
      );
      report.menus.push({ lang, width, logo, openLogo, burger, close, focus });
    }
    for (const width of [375, 768, 1440]) {
      for (const [route, id] of [
        ["products/", "collection"],
        ["products/", "product-comparison"],
        ["products/4s/", "specifications"],
        ["contact/", "wechat"],
      ]) {
        await ready(page, `/${lang}/${route}`, width);
        const target = page.locator(`#${id}`);
        await target.evaluate((e) =>
          e.scrollIntoView({ block: "start", behavior: "instant" }),
        );
        await page.waitForTimeout(250);
        const d = await target.evaluate((e) => ({
          top: e.getBoundingClientRect().top,
          header: document.querySelector(".gnb").getBoundingClientRect().bottom,
          jump: document
            .querySelector(".product-jump")
            ?.getBoundingClientRect()
            .toJSON(),
        }));
        const expected = d.header + (d.jump?.height ?? 24);
        assert.ok(
          Math.abs(d.top - expected) < 1.5,
          `${lang} ${width} #${id}: anchor offset ${d.top} vs ${expected}`,
        );
        if (d.jump) {
          assert.ok(
            Math.abs(d.jump.top - d.header) < 1.5,
            "chapter bar stays below masthead",
          );
          const first = page.locator(".product-jump a").first();
          await first.focus();
          const box = await first.boundingBox();
          assert.ok(
            box.x >= 0 && box.x + box.width <= width,
            "first chapter reachable",
          );
          await page.locator(".product-jump a").last().focus();
          const last = await page
            .locator(".product-jump a")
            .last()
            .boundingBox();
          assert.ok(
            last.x >= 0 && last.x + last.width <= width + 1,
            "last chapter reachable",
          );
        }
        report.anchors.push({ lang, width, route, id, ...d });
        if (width !== 768)
          await page.screenshot({
            path: `${output}/${lang}-${id}-${width}.jpg`,
            quality: 82,
          });
      }
    }
    await ready(page, `/${lang}/products/`, 1440);
    const button = page.locator(".hero-action .action-primary").first();
    const state = async () =>
      button.evaluate((e) => {
        const s = getComputedStyle(e);
        return {
          bg: s.backgroundColor,
          outline: s.outlineColor,
          focus: e.matches(":focus-visible"),
        };
      });
    const normal = await state();
    await button.hover();
    const hover = await state();
    await page.mouse.down();
    const pressed = await state();
    await page.mouse.move(1, 999);
    await page.mouse.up();
    assert.notEqual(normal.bg, hover.bg, "primary hover feedback");
    assert.notEqual(hover.bg, pressed.bg, "primary pressed feedback");
    await page.keyboard.press("Tab");
    await button.focus();
    const focus = await state();
    assert.ok(focus.focus, "primary keyboard focus");
    report.actions.push({ lang, normal, hover, pressed, focus });
  }
  await page.close();
} catch (e) {
  report.errors.push({ message: e.stack });
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
}
assert.deepEqual(report.errors, []);
console.log(
  JSON.stringify({
    views: report.views.length,
    menus: report.menus.length,
    anchors: report.anchors.length,
    actions: report.actions.length,
    axe: report.axe.length,
  }),
);
