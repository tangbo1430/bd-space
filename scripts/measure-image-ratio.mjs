/**
 * 图版率测量（v2.0，SPEC-v2.0 §1，纳入 npm run check）：
 * 图版率 = 内容图面积 ÷ 正文区面积（1440 视口整页；剔除页头导航与页脚）。
 *
 * 口径（与设计规范一致，可复跑）：
 *  - 计入：内容 <img>（照片）+ .ph-card 色卡按 0.5 权重；
 *  - 不计入：图标（<64px）、装饰渐变/纯色背景、display:none/零尺寸（轮播非当前帧）、
 *    同一图片在同一页面的第二次及以后出现（重复引用）、首屏/区块氛围背景（DECOR_BG）；
 *  - 测量方式：Playwright 1440px 视口，全页展开（触发懒加载）后按可见几何面积统计。
 *
 * 输出逐页面积明细 + 加权总值（按正文区面积加权）；加权 <55% 时 exit 1。
 * 依赖预览服务 http://localhost:4321（caddy 挂 dist）。
 */
import { chromium } from 'playwright';

const BASE = process.env.MEASURE_BASE ?? 'http://localhost:4321';
const VIEWPORT = { width: 1440, height: 900 };
const MIN_ICON = 64; // <64px 视为图标
/** 首屏/装饰区块背景：v2.0.5 起无装饰剔除（数据带已删除；CTA 右图 product-4s-dusk 为内容图，产品页复用） */
const DECOR_BG = new Set();
const PAGES = [
  { path: '/zh/', key: 'home', label: '首页', target: 55 },
  { path: '/zh/cases/', key: 'cases', label: '案例列表', target: 55 },
  { path: '/zh/products/', key: 'products', label: '产品中心', target: 50 },
  { path: '/zh/products/4s/', key: 'product-4s', label: '产品详情-4S', target: 45 },
  { path: '/zh/products/5s/', key: 'product-5s', label: '产品详情-5S', target: 45 },
  { path: '/zh/products/6s/', key: 'product-6s', label: '产品详情-6S', target: 45 },
  { path: '/zh/products/grayscale/', key: 'product-gs', label: '产品详情-灰度', target: 45 },
  { path: '/zh/about/', key: 'about', label: '关于我们', target: 45 },
];

const results = [];
const browser = await chromium.launch();

for (const p of PAGES) {
  const page = await browser.newPage({ viewport: VIEWPORT, reducedMotion: 'reduce' });
  console.log(`加载 ${p.path} ...`);
  await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // 全页滚动触发懒加载（rv 渐显在 reduce 下直接可见）
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);

  const m = await page.evaluate(({ minIcon, decorBg }) => {
    const vw = window.innerWidth;
    const bodyH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    // 正文区 = 视口宽 × 全文高 − 页头 − 页脚 − 首屏 Hero（规范：首屏外正文区）
    const header = document.querySelector('header, .gnb');
    const footer = document.querySelector('footer');
    const rectArea = (el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return Math.max(0, r.width) * Math.max(0, r.height);
    };
    const bodyArea = vw * bodyH - rectArea(header) - rectArea(footer);

    // 内容图：可见 <img>，剔除图标、display:none、零面积、装饰背景；同一 src 第二次出现不计。
    // 轮播：每帧均展示同一「大图位」，不同帧不同 src 各计一次（图版率度量的是大图位密度）。
    // 但 section 间的重复 src（同图跨区块）剔除。
    const decor = new Set(decorBg);
    const seen = new Set();
    let imgArea = 0;
    let dupArea = 0;
    const details = [];
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      const absTop = r.top + window.scrollY;
      const absBottom = absTop + r.height;
      // 页头/页脚内的图（如 logo）不计
      if (header && header.contains(img)) continue;
      if (footer && footer.contains(img)) continue;
      const inCarousel = !!img.closest('[data-carousel]');
      const visible = r.width >= minIcon && r.height >= minIcon && absBottom > 0 && absTop < bodyH && (img.offsetParent !== null || inCarousel);
      if (!visible) continue;
      const key = img.currentSrc || img.src;
      // 装饰背景图（CTA 航拍等氛围位）与 SVG 线稿不计入内容图
      const baseName = (key.split('/').pop() ?? '').replace(/\.(webp|jpg|png)$/i, '').replace(/-m$/, '');
      if (decor.has(baseName) || /\.svg$/i.test(key)) continue;
      const a = r.width * r.height;
      // 轮播帧：不同帧不同 src 均计（各自是独立大图位）；同 src 重复剔除
      if (seen.has(key)) { dupArea += a; continue; }
      seen.add(key);
      imgArea += a;
      details.push({ src: key.split('/').pop(), w: Math.round(r.width), h: Math.round(r.height) });
    }

    // 色卡 0.5 权重
    let phArea = 0;
    let phCount = 0;
    for (const el of document.querySelectorAll('.ph-card')) {
      const r = el.getBoundingClientRect();
      if (r.width < minIcon || el.offsetParent === null) continue;
      phArea += r.width * r.height;
      phCount++;
    }
    return { bodyH, bodyArea, imgArea, dupArea, phArea, phCount, imgCount: details.length, details };
  }, { minIcon: MIN_ICON, decorBg: [...DECOR_BG] });

  const weightedImg = m.imgArea + m.phArea * 0.5;
  const ratio = m.bodyArea > 0 ? (weightedImg / m.bodyArea) * 100 : 0;
  results.push({ ...p, ...m, weightedImg, ratio });
  console.log(`\n== ${p.label}（${p.path}）==`);
  console.log(`  正文区面积: ${(m.bodyArea / 1e6).toFixed(2)} Mpx (页高 ${m.bodyH}px)`);
  console.log(`  内容图面积: ${(m.imgArea / 1e6).toFixed(2)} Mpx（${m.imgCount} 张唯一图）`);
  console.log(`  色卡面积×0.5: ${(m.phArea * 0.5 / 1e6).toFixed(2)} Mpx（${m.phCount} 张色卡）`);
  console.log(`  重复引用剔除: ${(m.dupArea / 1e6).toFixed(2)} Mpx`);
  if (process.env.RATIO_DEBUG) console.log('  明细:', JSON.stringify(m.details));
  console.log(`  图版率: ${ratio.toFixed(1)}%（目标 ≥${p.target}%）${ratio >= p.target ? ' ✅' : ' ⚠️ 未达单页目标'}`);
  await page.close();
}
await browser.close();

const totalBody = results.reduce((s, r) => s + r.bodyArea, 0);
const totalWeighted = results.reduce((s, r) => s + r.weightedImg, 0);
const weightedRatio = totalBody > 0 ? (totalWeighted / totalBody) * 100 : 0;
// SPEC §1 五页基线表为「逐页图版率的页面平均」（首页/案例/产品/关于等权），面积加权仅作参考
const simpleAvg = results.reduce((s, r) => s + r.ratio, 0) / results.length;
console.log('\n== 加权总图版率（按正文区面积加权，参考口径）==');
for (const r of results) console.log(`  ${r.label.padEnd(6)} ${r.ratio.toFixed(1)}%  (权重 ${(r.bodyArea / totalBody * 100).toFixed(1)}%)`);
console.log(`  面积加权: ${weightedRatio.toFixed(1)}%`);
console.log(`  页面平均（SPEC §1 口径，逐页等权）: ${simpleAvg.toFixed(1)}%（目标 ≥55%）`);

console.log(`\n__RATIO_JSON__${JSON.stringify({ pages: results.map((r) => ({ key: r.key, label: r.label, ratio: +r.ratio.toFixed(1), imgArea: Math.round(r.imgArea), phArea: Math.round(r.phArea), bodyArea: Math.round(r.bodyArea), target: r.target })), weighted: +weightedRatio.toFixed(1), simpleAvg: +simpleAvg.toFixed(1) })}`);

if (simpleAvg < 55) {
  console.error(`\nFAIL  页面平均图版率 ${simpleAvg.toFixed(1)}% < 55%`);
  process.exit(1);
}
console.log('\n图版率测量通过（页面平均 ≥55%）');
