/** Static release checks: routes, navigation, SEO and honest content states. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const routes = [
  "zh",
  "zh/about",
  "zh/about/investors",
  "zh/about/careers",
  "zh/products",
  "zh/products/4s",
  "zh/products/5s",
  "zh/products/6s",
  "zh/products/grayscale",
  "zh/products/bd8",
  "zh/products/bd9",
  "zh/products/slab",
  "zh/products/wall",
  "zh/products/stair",
  "zh/cases",
  "zh/news",
  "zh/qualifications",
  "zh/contact",
  "zh/privacy",
  "zh/cookies",
  "en",
  ...[
    "products",
    "products/4s",
    "products/5s",
    "products/6s",
    "products/grayscale",
    "products/bd8",
    "products/bd9",
    "cases",
    "about",
    "contact",
  ].map((p) => `en/${p}`),
];
let failures = 0;
const ok = (condition, label) => {
  if (condition) console.log(`PASS ${label}`);
  else {
    failures++;
    console.error(`FAIL ${label}`);
  }
};
const page = (route) => {
  const path = join(dist, route, "index.html");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
};
const links = new Set();
for (const route of routes) {
  const html = page(route);
  ok(Boolean(html), `/${route}/ is generated`);
  ok(
    (html.match(/<h1(?:\s|>)/g) ?? []).length === 1,
    `/${route}/ has one main heading`,
  );
  ok(
    html.includes('rel="canonical"') && html.includes('name="description"'),
    `/${route}/ has canonical and description`,
  );
  for (const [, url] of html.matchAll(
    /href="(\/zh\/[^"#?]*)(?:[?#][^"]*)?"/g,
  )) {
    links.add(url);
  }
}
for (const url of links)
  ok(
    existsSync(join(dist, url.replace(/^\//, ""), "index.html")),
    `navigation resolves: ${url}`,
  );
const home = page("zh");
ok(
  home.includes('hreflang="zh-CN"') && home.includes('hreflang="x-default"'),
  "Chinese locale and x-default are declared",
);
ok(home.includes('href="/en/"'), "English counterpart is linked");
ok(
  home.includes('aria-roledescription="carousel"') &&
    home.includes("data-carousel-pause"),
  "carousel has a pause control",
);
ok(
  (home.match(/data-dot=/g) ?? []).length === 3 &&
    home.includes('aria-label="选择住宅照片"'),
  "three direct carousel selectors are available",
);
ok(page("en").includes('<html lang="en"'), "English home is localized");
const contact = page("zh/contact");
ok(
  contact.includes("data-direct-contact") &&
    !contact.includes("data-consult-form"),
  "contact offers direct communication without a form",
);
ok(
  contact.includes('href="tel:18503005860"') &&
    contact.includes('href="mailto:411547750@qq.com"') &&
    contact.includes('id="wechat"'),
  "contact includes phone, email and WeChat",
);
ok(
  !page("zh/about/careers").includes("【待提供】") &&
    !page("zh/about/careers").includes("【待确认】"),
  "placeholder jobs are not offered as vacancies",
);
const sitemapFiles = readdirSync(dist).filter((f) =>
  /^sitemap.*\.xml$/.test(f),
);
const sitemap = sitemapFiles
  .map((f) => readFileSync(join(dist, f), "utf8"))
  .join("");
ok(sitemapFiles.length > 0 && sitemap.includes("/zh/"), "sitemap is generated");
ok(
  sitemap.includes("/en/") && !sitemap.includes("/404"),
  "sitemap excludes unavailable routes",
);
ok(
  existsSync(join(dist, "robots.txt")) && existsSync(join(dist, "404.html")),
  "robots and 404 output exist",
);
console.log(
  `\n${failures ? `${failures} release checks failed` : "All release checks passed"}`,
);
process.exitCode = failures ? 1 : 0;
