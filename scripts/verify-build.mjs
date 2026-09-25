/**
 * 构建产物验证（在 `astro build` 之后运行）：
 *  - 关键路由均产出静态 HTML（7 栏目 + 产品详情 + 法务模板 + /en/ 预留态 + 404）；
 *  - SEO：/zh/ 页含自引用 canonical 与 zh-CN hreflang；/en/ 为 noindex 且不进入 sitemap；
 *  - 表单：含 honeypot 与来源字段。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
let failures = 0;

function ok(cond, label) {
  if (cond) console.log(`  PASS  ${label}`);
  else { console.error(`  FAIL  ${label}`); failures++; }
}

function page(path) {
  const file = join(dist, path, 'index.html');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

console.log('== 路由产物 ==');
const routes = [
  'zh', 'zh/about', 'zh/products', 'zh/products/slab', 'zh/products/wall', 'zh/products/stair',
  'zh/cases', 'zh/news', 'zh/qualifications', 'zh/contact', 'zh/privacy', 'zh/cookies', 'en',
];
for (const r of routes) ok(page(r) !== null, `/${r}/ 已生成`);
ok(existsSync(join(dist, '404.html')), '/404.html 已生成');
ok(existsSync(join(dist, 'robots.txt')), 'robots.txt 已生成');

console.log('== SEO ==');
const home = page('zh');
ok(home?.includes('rel="canonical"'), '/zh/ 含 canonical');
ok(home?.includes('hreflang="zh-CN"'), '/zh/ 含 zh-CN hreflang 自引用');
ok(home?.includes('hreflang="x-default"'), '/zh/ 含 x-default');
ok(!home?.includes('/en/'), '/zh/ 未引用未发布的 /en/ 页面');
ok(home?.includes('lang="zh-CN"'), '/zh/ lang=zh-CN');

const en = page('en');
ok(en?.includes('noindex'), '/en/ 为 noindex（未发布预留态）');

const sitemapFiles = ['sitemap-index.xml', 'sitemap-0.xml']
  .map((f) => join(dist, f))
  .filter((f) => existsSync(f));
ok(sitemapFiles.length > 0, 'sitemap 已生成');
if (sitemapFiles.length > 0) {
  const sitemap = sitemapFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  ok(!sitemap.includes('/en/'), 'sitemap 不含 /en/ 页面');
  ok(!sitemap.includes('/404'), 'sitemap 不含 404');
  ok(sitemap.includes('/zh/'), 'sitemap 含 /zh/ 页面');
}

console.log('== 表单 ==');
const contact = page('zh/contact');
ok(contact?.includes('name="bd_website"'), '表单含 honeypot 防滥用字段');
ok(contact?.includes('name="source"'), '表单含来源页面字段');
ok(contact?.includes('隐私政策'), '表单含隐私同意');

const notFound = existsSync(join(dist, '404.html')) ? readFileSync(join(dist, '404.html'), 'utf8') : '';
ok(notFound.includes('noindex'), '404 为 noindex');

if (failures > 0) {
  console.error(`\n${failures} 项验证失败`);
  process.exit(1);
}
console.log('\n全部验证通过');
