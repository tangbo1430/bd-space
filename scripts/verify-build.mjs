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
ok(css.includes('grid-template-columns:repeat(3,auto)'), '三列 auto + 两端对齐（v1.6 DSN-165 命中区收窄）');
ok(css.includes('justify-content:space-between'), '三列两端对齐（v1.6）');
ok(css.includes('min-height:96px'), '面板高 96px（v1.5.4 上下收窄，v1.6 不回退）');
ok(css.includes('max-width:840px'), 'Mega 容器收窄至 840px（v1.6 DSN-165）');
ok(/\.mega-col\{[^}]*width:200px/.test(css), '单项命中区约 200px 宽（v1.6）');
ok(/\.mega-ic\{[^}]*width:28px[^}]*height:28px/.test(css), '桌面图标 28×28 视框（v1.6）');
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
ok(distAssets.length === 216, `打包素材恰为 216 个文件（v1.5-v1.9 累计批次 + 7 份 manifest，实际 ${distAssets.length}）`);
ok(existsSync(join(assetsDir, 'asset-manifest.csv')), 'asset-manifest.csv 已随包');
ok(existsSync(join(assetsDir, 'asset-manifest-v16.csv')), 'asset-manifest-v16.csv 已随包');
ok(existsSync(join(assetsDir, 'asset-manifest-rar.csv')), 'asset-manifest-rar.csv 已随包');
ok(existsSync(join(assetsDir, 'asset-manifest-v18.csv')), 'asset-manifest-v18.csv 已随包（v1.8 增量）');
ok(existsSync(join(assetsDir, 'asset-manifest-v2.csv')), 'asset-manifest-v2.csv 已随包（v1.8 终态全量）');
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
ok(home?.includes('home-hero-01.jpg') && home?.includes('home-hero-02.jpg') && home?.includes('home-hero-03.jpg'), 'v1.7 RAR Banner 三帧 JPG 回退引用');
ok(home?.includes('home-hero-01-m.webp'), 'Banner 移动档 -m.webp 引用');
ok(/media="\(max-width: ?767px\)"/.test(home ?? ''), 'Banner 移动媒体查询');
ok(home?.includes('fetchpriority="high"'), '首屏 Banner fetchpriority=high 预加载');
ok(home?.includes('width="1920" height="823"'), 'Banner 明确宽高（防 CLS）');
ok(home?.includes('半打空间 4S 模块化建筑') && home?.includes('半打空间 60㎡'), 'Banner/氛围图准确中文 alt');
ok(home?.includes('onerror='), '图片失败回退降级钩子存在');
ok(home?.includes('loading="lazy"'), '非首帧/氛围图懒加载');
ok(home?.includes('case-cover-cayman') && home?.includes('case-cover-brisbane'), '首页 S5 案例接入 RAR 封面');
ok(!home?.includes('项目名称 A') && !home?.includes('构件用量'), '首页 S5 案例无虚构 KPI/项目名');
const bd8 = page('zh/products/bd8');
ok(bd8?.includes('product-bd8-interior-01'), 'BD8 详情含室内辅图');
ok(bd8 !== null && !bd8.includes('product-bd8-hero'), 'BD8 详情无含车辆主图');
const bd9 = page('zh/products/bd9');
ok(bd9?.includes('product-bd9-floorplan'), 'BD9 详情含户型图辅图');

console.log('== v1.6 内容模块 ==');
/* M1 愿景（公司介绍页） */
ok(about?.includes('我们的愿景'), 'M1 愿景小标题');
ok(about?.includes('让房屋制造更标准、更高效、更易交付'), 'M1 主文案（PM 中性稿）');
ok(about?.includes('标准化制造') && about?.includes('高效率交付') && about?.includes('模块化与可复制'), 'M1 三枚价值主张');
/* M2 研发演进（无年份，ol 顺序 01→04） */
ok(about?.includes('研发与产品演进'), 'M2 时间线标题');
ok(about?.includes('data-evo-list'), 'M2 时间线容器');
const evoOl = /<ol[^>]*data-evo-list[^>]*>[\s\S]*?<\/ol>/.exec(about ?? '')?.[0] ?? '';
ok(evoOl.startsWith('<ol'), 'M2 使用 ol');
ok(evoOl.indexOf('研发探索') < evoOl.indexOf('体系验证') && evoOl.indexOf('体系验证') < evoOl.indexOf('产品化') && evoOl.indexOf('产品化') < evoOl.indexOf('项目交付'), 'M2 DOM 顺序 01→04');
ok(!/<span[^>]*class="evo-yr"/.test(about ?? '') && !/(19|20)\d{2}\s*年/.test(evoOl), 'M2 无未核实年份');
/* M3 首页交付流程（APG Tabs） */
ok(home?.includes('从工厂到现场'), 'M3 区块标题');
ok(home?.includes('role="tablist"'), 'M3 tablist 语义');
ok((home?.match(/role="tab"/g) ?? []).length === 6, 'M3 六个 tab');
ok((home?.match(/role="tabpanel"/g) ?? []).length === 6, 'M3 六个 tabpanel');
ok(home?.includes('aria-selected="true"'), 'M3 默认选中态');
ok(home?.includes('tabindex="-1"'), 'M3 roving tabindex（非当前 tab -1）');
ok(home?.includes('flow-factory-module') && home?.includes('flow-mech-piping'), 'M3 实拍步骤图（02 工厂/04 机电）');
ok(home?.includes('flow-step01-mold') && home?.includes('flow-step03-panel-lift') && home?.includes('flow-step05-frames-load') && home?.includes('flow-step06-crane-panel'), 'M3 v1.8 实拍步骤图（01 制模/03 检验/05 装载/06 吊装）');
ok(home?.includes('设计与制模') && home?.includes('出厂检验'), 'M3 步骤名与 v1.8 素材口径一致');
ok(!home?.includes('flow-delivery-module'), 'M3 step05 旧运输图已被 v1.8 替换');
ok(!home?.includes('flow-step-01-design.svg') && !home?.includes('flow-step-03-inspection.svg') && !home?.includes('flow-step-06-install.svg'), 'M3 01/03/06 线稿已被 v1.8 实拍替换（SVG 文件保留为底稿）');
ok(!home?.includes('flow-step-02-factory.svg'), 'M3 step02 线稿已被工厂实拍替换');
ok(/aria-controls="flow-panel-\d{2}"/.test(home ?? ''), 'M3 tab aria-controls 关联 panel');
/* M4 案例墙（v1.7 RAR 封面；仅地点+类型） */
const cases = page('zh/cases');
ok(cases?.includes('开曼群岛') && cases?.includes('布里斯班') && cases?.includes('中山') && cases?.includes('斐济'), 'M4 四案例地点');
ok(cases?.includes('海外住宅') && cases?.includes('低层住宅') && cases?.includes('模块化建筑'), 'M4 项目类型');
ok(cases?.includes('case-cover-cayman') && cases?.includes('case-cover-brisbane') && cases?.includes('case-cover-zhongshan-fd') && cases?.includes('case-cover-fiji'), 'M4 四案例 RAR 封面引用');
ok(cases !== null && !cases.includes('maxw-568') && !cases.includes('maxw-711'), 'M4 低清限宽已随 RAR 全尺寸封面解除');
ok(cases !== null && !cases.includes('案例整理中'), 'M4 案例墙已替换旧空态');
ok(cases !== null && !/href="\/zh\/cases\/[^"]+"/.test(cases), 'M4 案例卡无详情链接（本轮不接详情）');
ok(cases !== null && !cases.includes('case-cayman-hero') && !cases.includes('case-zhongshan-house') && !/case-fiji-interior(?!-06)/.test(cases), 'M4 不再引用已删除的 v1.6 低清案例图');
/* M5 建造体系（产品页原创 SVG） */
const productsIdx = page('zh/products');
ok(productsIdx?.includes('三种建造体系'), 'M5 区块标题');
ok(productsIdx?.includes('system-2d-panel.svg') && productsIdx?.includes('system-3d-module.svg') && productsIdx?.includes('system-combined.svg'), 'M5 三枚原创 SVG');
ok(productsIdx?.includes('2D 板式体系') && productsIdx?.includes('3D 模块体系') && productsIdx?.includes('组合建造'), 'M5 三体系名');
/* 敏感信息红线：金额/估值/股权数字不出现、不预留（断言避开本脚本注释，检查 HTML 正文） */
ok(investors !== null && !investors.includes('金额：') && !investors.includes('投资方：'), 'IR 融资卡片无金额/投资方字段（v1.6 红线）');
ok(investors !== null && !investors.includes('持股说明') && !/class="ratio"/.test(investors), 'IR 股权卡片无比例字段（v1.6 红线）');
ok(!/融资轮次/.test(investors ?? ''), 'IR 摘要无融资轮次统计');
const stripMeta = (s) => s.replace(/<meta[^>]*>/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
ok(!new RegExp(['估', '值'].join('') + '|' + ['营', '收'].join('') + '|' + ['利', '润'].join('') + '|' + ['股权', '比例'].join('') + '|' + ['持股', '比例'].join('')).test(stripMeta(allHtml)), '全站正文无敏感财务词');
ok(!/[￥¥$]\s*\d|\d+\s*(万元|亿元|万美元|亿美元)/.test(stripMeta(allHtml)), '全站无金额数字');
/* v1.6 素材就位 */
for (const f of ['flow-mech-piping.webp', 'flow-transport-frames.webp']) {
  ok(existsSync(join(assetsDir, f)), `v1.6 素材 ${f} 就位`);
}
ok(!distAssets.some((f) => f.startsWith('flow-delivery-module')), '被 v1.8 替换的 flow-delivery-module 已删除未打包');
for (const f of ['flow-step-01-design.svg', 'flow-step-02-factory.svg', 'flow-step-03-inspection.svg', 'flow-step-06-install.svg', 'system-2d-panel.svg', 'system-3d-module.svg', 'system-combined.svg']) {
  ok(existsSync(join(assetsDir, f)), `v1.6 原创 SVG ${f} 就位`);
}
ok(!distAssets.some((f) => f.includes('biz-p')), '未打包商业计划原始提取文件');
ok(!distAssets.some((f) => /^case-(cayman-hero|brisbane-hero|zhongshan-house)/.test(f) || /case-fiji-interior(?!-06)/.test(f)), '已删除的 v1.6 低清案例图未打包');

console.log('== v1.7 RAR 批次素材 ==');
/* 首页 Banner 三帧 + 关于我们首图 */
for (const f of ['home-hero-01', 'home-hero-02', 'home-hero-03', 'about-hero']) {
  ok(existsSync(join(assetsDir, `${f}.webp`)) && existsSync(join(assetsDir, `${f}.jpg`)) && existsSync(join(assetsDir, `${f}-m.webp`)), `v1.7 ${f} 三档就位`);
}
/* 案例封面 ×9 上墙（v1.7 四张 + v1.9 新增五张）；shenzhen-camp 客户名待确认不上站（v1.9 起页面以中性「深圳营房」+ 实景图组呈现，封面卡不打包） */
for (const f of ['case-cover-cayman', 'case-cover-brisbane', 'case-cover-zhongshan-fd', 'case-cover-zhongshan-mg', 'case-cover-zhongshan-cabin', 'case-cover-chengdu-dorm', 'case-cover-fiji', 'case-cover-jiangmen', 'case-cover-changzhou']) {
  ok(existsSync(join(assetsDir, `${f}.webp`)) && existsSync(join(assetsDir, `${f}.jpg`)) && existsSync(join(assetsDir, `${f}-m.webp`)), `案例封面 ${f} 三档就位`);
}
ok(!distAssets.some((f) => f.startsWith('case-cover-shenzhen-camp')), '深圳营房封面卡未打包（客户名待确认）');
/* 产品详情主图 ×4 + 工厂实拍 ×2 */
for (const f of ['product-4s-hero', 'product-5s-hero', 'product-6s-hero', 'product-grayscale-hero', 'flow-factory-module']) {
  ok(existsSync(join(assetsDir, `${f}.webp`)) && existsSync(join(assetsDir, `${f}.jpg`)) && existsSync(join(assetsDir, `${f}-m.webp`)), `v1.7 ${f} 三档就位`);
}
ok(existsSync(join(assetsDir, 'flow-factory-panels.webp')) && existsSync(join(assetsDir, 'flow-factory-panels.jpg')), 'v1.7 flow-factory-panels 双档就位（无移动档，上限1280）');
/* 证书与黑底 Logo 本轮不上站 */
for (const f of ['award-gd-civil-society', 'award-gd-tech-2nd', 'brand-logo']) {
  ok(!distAssets.some((x) => x.startsWith(f)), `v1.7 ${f} 未打包（待口径确认/黑底禁入浅底）`);
  ok(!allHtml.includes(f), `v1.7 ${f} 页面未引用`);
}
/* 产品详情主图接入 */
for (const slug of ['4s', '5s', '6s', 'grayscale']) {
  const pd = page(`zh/products/${slug}`);
  ok(pd !== null && pd.includes(`product-${slug}-hero`), `产品 ${slug} 详情主图接入`);
  ok(pd !== null && pd.includes('fetchpriority="high"'), `产品 ${slug} 详情主图首屏 eager`);
}
const productsIdxV17 = page('zh/products');
ok(productsIdxV17?.includes('product-4s-hero') && productsIdxV17?.includes('product-grayscale-hero'), '产品列表卡片接入主图');
ok(about?.includes('about-hero'), '关于我们首图接入');
/* 敏感词红线：中建三局不得出现在任何页面文案/alt/title/URL */
ok(!new RegExp(['中', '建', '三', '局'].join('')).test(allHtml), '全站无「中建三局」（深圳营房用中性表述）');
/* manifest 源文件名列含客户名，属内部溯源、不渲染到页面；但确认其不进入打包 HTML（上条已覆盖 HTML），此处确认深圳案例页文案中性 */
ok(cases !== null && !cases.includes('shenzhen-camp') && !cases.includes('中建三局'), '案例页不含受限客户名（深圳以中性「营房建筑」呈现）');

console.log('== v1.8 素材增强（沉浸式 Hero + 案例实景 + 流程替换 + 4S 图组） ==');
/* v1.8 上站图像（剔除 v1.9 删除的 case-cayman-install-wall×3 / case-brisbane-install-lift×2） */
const v18Files = [
  'case-cayman-install-crane.webp', 'case-cayman-install-crane.jpg', 'case-cayman-install-crane-m.webp',
  'case-cayman-install-roof.webp', 'case-cayman-install-roof.jpg', 'case-cayman-install-roof-m.webp',
  'case-brisbane-install-frame.webp', 'case-brisbane-install-frame.jpg', 'case-brisbane-install-frame-m.webp',
  'case-cabin-site-aerial.webp', 'case-cabin-site-aerial.jpg', 'case-cabin-site-aerial-m.webp',
  'case-cabin-rows.webp', 'case-cabin-rows.jpg', 'case-cabin-rows-m.webp',
  'case-chengdu-site-wide.webp', 'case-chengdu-site-wide.jpg', 'case-chengdu-site-wide-m.webp',
  'case-fiji-box-ext.webp', 'case-fiji-box-ext.jpg',
  'case-fiji-box-door.webp', 'case-fiji-box-door.jpg',
  'flow-step01-mold.webp', 'flow-step01-mold.jpg',
  'flow-step03-panel-lift.webp', 'flow-step03-panel-lift.jpg',
  'flow-step05-frames-load.webp', 'flow-step05-frames-load.jpg', 'flow-step05-frames-load-m.webp',
  'flow-step06-crane-panel.webp', 'flow-step06-crane-panel.jpg', 'flow-step06-crane-panel-m.webp',
  'product-4s-dusk.webp', 'product-4s-dusk.jpg', 'product-4s-dusk-m.webp',
  'product-4s-detail-wall.webp', 'product-4s-detail-wall.jpg', 'product-4s-detail-wall-m.webp',
  'product-4s-dusk-door.webp', 'product-4s-dusk-door.jpg',
];
ok(v18Files.length === 40, 'v1.8 上站文件清单恰 40 个');
for (const f of v18Files) ok(existsSync(join(assetsDir, f)), `v1.8 素材 ${f} 就位`);
ok(!distAssets.some((f) => /^case-(cayman-install-wall|brisbane-install-lift)/.test(f)), 'v1.9 删除的同案例旧图未打包（择优不堆叠）');
ok(!distAssets.some((f) => f.startsWith('case-shenzhen-steel-frame')), '深圳营房素材（客户名待确认）未打包');
ok(!allHtml.includes('case-shenzhen-steel-frame'), '深圳营房素材页面未引用');
/* 沉浸式 Hero 终态（CSS 已压缩，匹配无空格形式） */
ok(/\.hero\{[^}]*min\(92vh,880px\)[^}]*min\(92dvh,880px\)/.test(css) || /\.hero\{[^}]*min\(92d?v?h,880px\)/.test(css), 'Hero 桌面 min(92vh,880px)');
ok(/88dvh/.test(css) && /72dvh/.test(css) && /78dvh/.test(css), 'Hero 88vh@1280 / 72vh@768 / 78vh@375 断点');
ok(/linear-gradient\(to top,rgba\(20,24,22,\.55\),transparent 55%\)/.test(css), 'Hero scrim 渐变（对比度 ≥4.5）');
ok(/\.hero-controls\{[^}]*display:flex/.test(css), 'Hero 右下控件组');
ok(/\.dots button\{[^}]*width:44px[^}]*height:44px/.test(css), '分页点 44×44 触控区');
ok(/\.bnav button\{[^}]*width:44px[^}]*height:44px/.test(css), '箭头 44×44 触控区');
ok(/\.ph-1 \.ph-pic img[^{]*\{[^}]*object-position:50% 33%/.test(css), '帧 1/3 焦点中上 1/3 裁切');
ok(home?.includes('hero-controls'), '首页控件组 DOM 就位');
/* 案例施工实景图组 */
ok(cases?.includes('data-case-gallery'), '案例页施工实景模块');
ok((cases?.match(/cg-group/g) ?? []).length >= 5, '五组案例实景（开曼/布里斯班/中山/成都/斐济）');
ok(cases?.includes('case-cayman-install-crane') && cases?.includes('case-cabin-rows') && cases?.includes('case-chengdu-site-wide') && cases?.includes('case-fiji-box-door') && cases?.includes('case-brisbane-install-frame'), '案例实景图组引用 v1.8 素材');
ok(cases?.includes('方舱建筑') && cases?.includes('宿舍建筑'), '案例实景仅地点+类型中性标注');
/* 4S 产品详情图组（dusk-door 限宽 608px，不放大） */
const p4s = page('zh/products/4s');
ok(p4s?.includes('product-4s-dusk') && p4s?.includes('product-4s-detail-wall') && p4s?.includes('product-4s-dusk-door'), '4S 详情图组三张接入');
ok(p4s?.includes('max-width:608px') && p4s?.includes('aspect-ratio:608/810'), '4S dusk-door 限宽 608px 且保持 3:4');
/* 红线：核心优势「全球独有」不得上页（v1.8 文案源处理口径） */
ok(!allHtml.includes('全球独有'), '全站无「全球独有」表述');
/* 版本证据：version.json 与页面 meta 一致 */
const versionRaw = existsSync(join(dist, 'version.json')) ? readFileSync(join(dist, 'version.json'), 'utf8') : '';
let version = null;
try { version = JSON.parse(versionRaw); } catch { version = null; }
ok(version && typeof version.commit === 'string' && version.commit.length >= 7 && typeof version.builtAt === 'string', 'version.json 含 commit/builtAt');
ok(version !== null && (home ?? '').includes(`name="build-commit" content="${version.commit}"`), '页面 meta build-commit 与 version.json 一致');
/* 双模式验收（v1.8.2）：?motion=full 覆盖系统偏好 + 验收标识 + reduce 保留手动控件 */
const jsFile = readdirSync(join(dist, '_astro')).find((f) => f.endsWith('.js'));
const bundle = jsFile ? readFileSync(join(dist, '_astro', jsFile), 'utf8') : '';
ok(bundle.includes('motion=full') || bundle.includes('完整动态模式'), 'JS 含 motion=full 验收逻辑');
ok(bundle.includes('data-motion-badge') || bundle.includes('完整动态模式'), 'JS 含验收标识（完整动态模式·commit）');
ok(css.includes('[data-motion-badge]'), 'CSS 含验收标识样式');
ok(css.includes('data-motion=full'), 'CSS reduced-motion 对 motion=full 放行');

console.log('== v1.9 人物口径批次（恢复清晰人物版 + 25 新增源） ==');
ok(existsSync(join(assetsDir, 'asset-manifest-v19.csv')), 'asset-manifest-v19.csv 已随包');
ok(existsSync(join(assetsDir, 'asset-manifest-v3.csv')), 'asset-manifest-v3.csv 已随包（全量 115 源）');
/* 恢复人物版 6 项就位 */
for (const f of ['product-4s-dusk', 'product-4s-detail-wall', 'case-cayman-install-crane', 'case-cayman-install-roof', 'flow-step06-crane-panel']) {
  ok(existsSync(join(assetsDir, `${f}.webp`)) && existsSync(join(assetsDir, `${f}-m.webp`)), `v1.9 恢复人物版 ${f} 就位`);
}
ok(existsSync(join(assetsDir, 'product-4s-dusk-door.webp')), 'v1.9 恢复人物版 product-4s-dusk-door 就位（608 限宽无移动档）');
/* 创始人文件不上线不入库 */
ok(!distAssets.some((f) => f.startsWith('team-founder')), '创始人文件未打包');
ok(!allHtml.includes('team-founder'), '创始人文件页面未引用');
/* 新增案例图组关键素材就位 */
for (const f of ['case-mige-install-03', 'case-fangcang-install-02', 'case-brisbane-lift-01', 'case-changzhou-install-02', 'case-chengdu-assembly-01', 'case-jiangmen-install-02', 'case-fiji-interior-06']) {
  ok(existsSync(join(assetsDir, `${f}.webp`)), `v1.9 新增 ${f} 就位`);
}
/* 江门不写合作方、深圳中性命名、无受限客户名 */
ok(!allHtml.includes('志特'), '全站无「志特」（江门合作方）');
ok(cases !== null && cases.includes('营房建筑'), '案例页深圳以中性「营房建筑」标注');
ok(!new RegExp(['中', '建', '三', '局'].join('')).test(allHtml), '全站无「中建三局」');
/* 案例墙九卡 + 实景图组扩充 */
ok((cases?.match(/case-card/g) ?? []).length >= 9, '案例墙九卡');
ok((cases?.match(/cg-group/g) ?? []).length >= 10, '案例实景十组');

if (failures > 0) {
  console.error(`\n${failures} 项验证失败`);
  process.exit(1);
}
console.log('\n全部验证通过');
