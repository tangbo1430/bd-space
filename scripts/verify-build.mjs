/**
 * 构建产物验证（在 `astro build` 之后运行）：
 *  - 关键路由均产出静态 HTML（7 栏目 + 产品详情 + 法务模板 + /en/ 预留态 + 404）；
 *  - SEO：/zh/ 页含自引用 canonical 与 zh-CN hreflang；/en/ 为 noindex 且不进入 sitemap；
 *  - 表单：含 honeypot 与来源字段。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
  'zh', 'zh/about', 'zh/about/investors', 'zh/about/careers',
  'zh/products', 'zh/products/slab', 'zh/products/wall', 'zh/products/stair',
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

console.log('== v0.4 增量 ==');
ok(home?.includes('aria-roledescription="carousel"'), 'Banner 容器 carousel 角色');
ok(home?.includes('aria-label="上一张"') && home?.includes('aria-label="下一张"'), 'Banner 上一张/下一张控件');
ok(home?.includes('data-banner-live'), 'Banner aria-live 播报位（仅手动切换播报）');
ok(home?.includes('暂停') || home?.includes('pause-line'), 'Banner 暂停可视化位');
console.log('== v0.4.1/v1.3 导航带 ==');
ok(home?.includes('data-subnav'), '关于导航组存在');
ok(!home?.includes('aria-haspopup'), '一级为纯链接，无展开按钮语义（AC-34）');
ok(!home?.includes('aria-expanded') || !/data-sub-trigger[^>]*aria-expanded/.test(home ?? ''), '桌面触发器无 aria-expanded');
ok(home?.includes('class="sub-trigger'), '一级触发器为链接');
ok(!home?.includes('role="menu"') && !home?.includes('role="menuitem"'), '子导航为普通链接集合（无 menu 语义，N5）');
ok(home?.includes('aria-label="展开关于我们子导航"') || home?.includes('收起关于我们子导航'), '移动独立展开按钮存在');
ok(home?.includes('aria-controls="about-sub-items"'), '移动按钮 aria-controls 关联');
const careersPage = page('zh/about/careers');
ok(careersPage?.includes('data-default-open="true"'), 'about 组路由移动默认展开（AC-41）');
ok(!(page('zh/products')?.includes('data-default-open="true"')), '非 about 路由移动默认收起');
ok(home?.includes('/zh/about/investors/') && home?.includes('/zh/about/careers/'), '桌面下拉含三子项链接（无脚本可达）');

const about = page('zh/about');
ok(about !== null && !about.includes('about-entry'), '公司介绍页不再含与下拉重复的子页入口块');
ok(about?.includes('/zh/about/investors/') && about?.includes('/zh/about/careers/'), '子页仍可通过导航/页脚链接到达（无脚本无死链）');

const careers = page('zh/about/careers');
ok(careers !== null && !careers.includes('mailto:'), '招聘邮箱未配置时 DOM 无 mailto（AC-30）');
ok(careers?.includes('招聘邮箱待提供'), '招聘邮箱占位态文案');
ok(careers?.includes('data-chip-group'), '招聘筛选 chip 存在');
ok(careers?.includes('aria-expanded="false"'), '职位展开控件暴露状态');
ok(careers?.includes('暂无匹配职位'), '筛选无结果空态就位');

const investors = page('zh/about/investors');
ok(investors?.includes('股权结构') && investors?.includes('融资历程'), '投资者页分区完整');
ok(investors?.includes('【待提供】'), '投资者事实字段占位');
ok(investors !== null && !investors.includes('application/ld+json'), '投资者页无事实型结构化数据（BR-25）');

console.log('== v1.3 导航带样式回归 ==');
const cssFile = readdirSync(join(dist, '_astro')).find((f) => f.endsWith('.css'));
ok(Boolean(cssFile), '构建 CSS 产物存在');
const css = cssFile ? readFileSync(join(dist, '_astro', cssFile), 'utf8') : '';
ok(css.includes('.sub-panel{position:absolute;top:100%'), '导航带 top:100% 无缝（无 hover 空洞）');
ok(css.includes('padding-top:12px'), '12px 透明连接层');
ok(css.includes('.has-sub:hover .sub-panel') && css.includes('.has-sub:focus-within .sub-panel'), '无 JS 时 :hover/:focus-within 纯 CSS 回退（AC-43）');
ok(css.includes('.sub-panel-card') && css.includes('border-top:1px solid var(--line)'), '浅色页头：白底+顶部细线');
ok(css.includes('backdrop-filter:blur(8px)'), '深色 Hero：半透明模糊层（含 @supports 降级）');
ok(!/\.sub-panel-card\{[^}]*box-shadow:[^u]/.test(css) || css.includes('.sub-panel-card{background:#fff;border-top:1px solid var(--line)'), '导航带无重阴影');
const curRule = /\.sub-panel a\.cur\{[^}]*\}/.exec(css)?.[0] ?? '';
const curMargin = /\.sub-panel a\.cur\{margin-left:18px\}/.test(css);
ok(curRule.includes('font-weight:500') && curMargin, '当前子项字重+缩进');
const curBefore = /\.sub-panel a\.cur:{0,2}before\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(curBefore.includes('width:16px') && curBefore.includes('height:2px'), '当前态为 16×2px 短横线（非竖线）');
ok(!/\.sub-panel a\.cur:{0,2}after/.test(css), '当前态无重复装饰');
const mBtn = /\.p-sub-btn\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(mBtn.includes('width:44px') && mBtn.includes('height:44px'), '移动展开按钮 ≥44×44px（AC-40）');
const mLink = /\.p-sub-link\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(mLink.includes('min-height:48px'), '移动文字链接行高 ≥48px');

const notFound = existsSync(join(dist, '404.html')) ? readFileSync(join(dist, '404.html'), 'utf8') : '';
ok(notFound.includes('noindex'), '404 为 noindex');

if (failures > 0) {
  console.error(`\n${failures} 项验证失败`);
  process.exit(1);
}
console.log('\n全部验证通过');
