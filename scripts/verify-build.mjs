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
  'zh/products', 'zh/products/slab', 'zh/products/wall', 'zh/products/stair', 'zh/products/bd8', 'zh/products/bd9',
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

console.log('== v1.4 Mega Subnav 样式回归 ==');
const cssFile = readdirSync(join(dist, '_astro')).find((f) => f.endsWith('.css'));
ok(Boolean(cssFile), '构建 CSS 产物存在');
const css = cssFile ? readFileSync(join(dist, '_astro', cssFile), 'utf8') : '';
ok(css.includes('.sub-panel{position:absolute;top:100%'), '面板 top:100% 与页头底边相接');
ok(css.includes('padding-top:12px'), '12px 透明连接层');
ok(css.includes('.has-sub:hover .sub-panel') && css.includes('.has-sub:focus-within .sub-panel'), '无 JS 时 :hover/:focus-within 纯 CSS 回退（AC-43）');
ok(css.includes('translateY(-6px)'), '打开动效 opacity+translateY(-6px→0)（M4）');
const cardRule = /\.sub-panel-card\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(cardRule.includes('border-top:1px solid var(--line)') && cardRule.includes('background:#fff'), '浅色页头：白底 + 顶部 1px 细线');
ok(!/box-shadow:[^n]/.test(cardRule) && !/border-radius:[^0]/.test(cardRule), '面板无阴影/圆角（AC-46）');
ok(css.includes('grid-template-columns:repeat(3,1fr)'), '三列 1fr 均布（AC-V2）');
ok(css.includes('min-height:96px'), '面板高 96px（v1.5.4 上下收窄）');
ok(css.includes('column-gap:32px'), 'v1.5.3 列间距收窄至 32px');
ok(/\.mega-ic\{[^}]*width:32px[^}]*height:32px/.test(css), '桌面图标 32×32 视框（v1.5.4）');
ok(/\.mega-t b\{[^}]*font-size:17px[^}]*font-weight:400/.test(css) || /\.mega-t b\{[^}]*font-weight:400[^}]*font-size:17px/.test(css), '中文标题 17px/400');
ok(/\.mega-en\{[^}]*font-size:11px/.test(css) && /\.mega-en\{[^}]*letter-spacing:\.2em/.test(css), '英文标签 11px/大写/字距 .2em');
ok(/--ink-muted2:\s*#6F7572/i.test(css), '英文标签加深灰令牌 #6F7572（AA 4.5:1）');
ok(/\.mega-en\{[^}]*color:var\(--ink-muted2\)/.test(css), '英文标签使用加深灰（浅色页头）');
/* LightningCSS 将 rgba 归一化为 8 位 hex：.06→0f / .14→24 / .82→d1 / .92→eb */
ok(css.includes('.mega-col:hover{background:#1fa87a0f}'), '浅色 hover 列底 4% 青绿 tint');
/* v1.5.2：面板全场景统一白色，深色变体已移除 */
ok(!css.includes('.mega-col:hover{background:#1fa87a24}'), '无深色 hover 14% tint 残留（已统一浅色）');
ok(!css.includes('background:#111514d1') && !css.includes('background:#111514eb'), '无深色变体 .82/.92 实色残留');
const curB = /\.mega-col\.cur \.mega-t b\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(curB.includes('font-weight:500'), '当前子页标题字重 500');
const curAfter = /\.mega-col\.cur:{0,2}after\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(curAfter.includes('width:24px') && curAfter.includes('height:2px'), '当前子页列底 24×2px 短横线');
ok(!/\.mega-col[^{]*:{0,2}before/.test(css), '当前态无重复装饰（无 ::before 竖线）');
ok(css.includes('outline-offset:4px'), '焦点环统一外扩 outline-offset:4px');
const mBtn = /\.p-sub-btn\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(mBtn.includes('width:44px') && mBtn.includes('height:44px'), '移动展开按钮 ≥44×44px（AC-40）');
const mLink = /\.p-sub-link\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(mLink.includes('min-height:48px'), '移动文字链接行高 ≥48px');
const mItem = /\.p-sub-items a\{[^}]*\}/.exec(css)?.[0] ?? '';
ok(mItem.includes('min-height:48px'), '移动子项触控高 ≥48px');
ok(/\.p-ic\{[^}]*width:24px[^}]*height:24px/.test(css), '移动子项 24×24 原创小图标');

console.log('== v1.4 Mega Subnav 结构 ==');
ok(home?.includes('id="ic-about"') && home?.includes('id="ic-ir"') && home?.includes('id="ic-career"'), '三枚原创线性图标 symbol 存在（AC-V3）');
ok((home?.match(/class="mega-col/g) ?? []).length === 3, '桌面 mega 面板恰三列');
ok(home?.includes('About Banda') && home?.includes('Investors') && home?.includes('Careers'), '英文小标签就位');
ok((home?.match(/class="p-ic"/g) ?? []).length === 3, '移动抽屉子项含图标');
const careersCur = page('zh/about/careers');
ok(careersCur?.includes('mega-col cur'), '当前子页 mega 列当前态标记');

console.log('== 页脚导航 ==');
ok(!home?.includes('└'), '页脚子项平铺展示（无层级符号/缩进）');
ok(home?.includes('>投资者关系</a>') && home?.includes('>人才招聘</a>'), '页脚子项直链与一级栏目同层');

const notFound = existsSync(join(dist, '404.html')) ? readFileSync(join(dist, '404.html'), 'utf8') : '';
ok(notFound.includes('noindex'), '404 为 noindex');

console.log('== v1.5 首批真实素材 ==');
const assetsDir = join(dist, 'assets', 'img');
const distAssets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
ok(distAssets.length === 30, `打包素材恰为 30 个批准文件（实际 ${distAssets.length}）`);
ok(existsSync(join(assetsDir, 'asset-manifest.csv')), 'asset-manifest.csv 已随包');
ok(existsSync(join(assetsDir, 'home-banner-60m-living-01.webp')) && existsSync(join(assetsDir, 'home-banner-60m-living-01.jpg')), 'Banner1 WebP+JPG 就位');
ok(existsSync(join(assetsDir, 'home-banner-60m-living-01-m4x5.webp')), 'Banner1 移动 4:5 就位');
ok(existsSync(join(assetsDir, 'home-banner-60m-dining-02.webp')) && existsSync(join(assetsDir, 'home-banner-60m-dining-02.jpg')), 'Banner2 WebP+JPG 就位');
for (const s of ['dining', 'kitchen', 'bath', 'laundry', 'bedroom']) {
  ok(existsSync(join(assetsDir, `space-60m-${s}.webp`)) && existsSync(join(assetsDir, `space-60m-${s}.jpg`)) && existsSync(join(assetsDir, `space-60m-${s}-960w.webp`)), `氛围图 ${s} 三档就位`);
}
ok(existsSync(join(assetsDir, 'product-bd8-interior-01.webp')) && existsSync(join(assetsDir, 'product-bd8-interior-01.jpg')), 'BD8 室内辅图就位');
ok(existsSync(join(assetsDir, 'product-bd9-floorplan.webp')) && existsSync(join(assetsDir, 'product-bd9-floorplan.jpg')), 'BD9 户型图就位');
/* 含第三方车辆/未批准素材不得打包、不得引用 */
for (const banned of ['product-bd8-hero', 'product-bd8-card', 'product-bd9-hero', 'product-bd9-card']) {
  ok(!distAssets.some((f) => f.startsWith(banned)), `未打包含车辆素材 ${banned}`);
}
const allHtml = readdirSync(dist, { recursive: true }).filter((f) => String(f).endsWith('.html')).map((f) => readFileSync(join(dist, String(f)), 'utf8')).join('\n');
ok(!allHtml.includes('product-bd8-hero') && !allHtml.includes('product-bd8-card') && !allHtml.includes('product-bd9-hero') && !allHtml.includes('product-bd9-card'), '页面未引用含车辆的 BD8/BD9 hero/card');
ok(!allHtml.includes('商业计划') && !allHtml.includes('business-plan'), '未打包商业计划素材');
ok(home?.includes('<picture') && home?.includes('type="image/webp"'), 'Banner 使用 <picture> WebP 优先');
ok(home?.includes('home-banner-60m-living-01.jpg'), 'Banner1 JPG 回退引用');
ok(/media="\(max-width: ?767px\)"/.test(home ?? ''), 'Banner 移动 4:5 媒体查询');
ok(home?.includes('fetchpriority="high"'), '首屏 Banner fetchpriority=high 预加载');
ok(home?.includes('width="1920" height="823"'), 'Banner 明确宽高（防 CLS）');
ok(home?.includes('半打空间 60㎡'), 'Banner/氛围图准确中文 alt');
ok(home?.includes('onerror='), '图片失败回退降级钩子存在');
ok(home?.includes('loading="lazy"'), '非首帧/氛围图懒加载');
const bd8 = page('zh/products/bd8');
ok(bd8?.includes('product-bd8-interior-01'), 'BD8 详情含室内辅图');
ok(bd8 !== null && !bd8.includes('product-bd8-hero'), 'BD8 详情无含车辆主图');
const bd9 = page('zh/products/bd9');
ok(bd9?.includes('product-bd9-floorplan'), 'BD9 详情含户型图辅图');

if (failures > 0) {
  console.error(`\n${failures} 项验证失败`);
  process.exit(1);
}
console.log('\n全部验证通过');
