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
ok(!home.includes('href="/en/"'), "unpublished English page is not advertised");
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
ok(page("en").includes("noindex"), "unpublished English page is noindex");
const contact = page("zh/contact");
ok(
  contact.includes('name="bd_website"') && contact.includes('name="source"'),
  "inquiry form has anti-abuse and source fields",
);
ok(
  contact.includes("data-download-inquiry") ||
    contact.includes('type="submit"'),
  "inquiry has a usable local-draft or submission action",
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
  !sitemap.includes("/en/") && !sitemap.includes("/404"),
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
