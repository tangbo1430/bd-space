/**
 * v3.0.1 视觉专项测试（章节序列、明暗交替、案例分组、产品索引行、响应式、双模式、红线）。
 * 运行前提：预览服务 http://localhost:4321（caddy 挂 dist）。
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('PASS ', label); } else { fail++; console.error('FAIL ', label); } };

(async () => {
  const browser = await chromium.launch();

  /* ---- 1. 首页章节序列与明暗交替（桌面 1440，v3 十章） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const secs = [...document.querySelectorAll('main.v3 > section')].map((s) => s.getAttribute('aria-label') || '');
      return {
        secs,
        dark: document.querySelectorAll('main.v3 > .chap-dark').length,
        ink: document.querySelectorAll('main.v3 > .chap-ink').length,
        paper: document.querySelectorAll('main.v3 > .chap-paper').length,
        bandNums: document.querySelectorAll('.band .num').length,
        pcards: document.querySelectorAll('.chap-ink .prow .pcard').length,
        caseBleed: document.querySelectorAll('section[aria-label="工程案例"] > a.bleed.r219').length,
        caseCc: document.querySelectorAll('section[aria-label="工程案例"] .g2 .cc').length,
        conv: !!document.querySelector('.conv form[data-consult-form]'),
        convImg: !!document.querySelector('.conv img[src*="case-cabin-site-aerial"]'),
      };
    });
    const expectSeq = ['首页横幅', '把建造，变成制造', '关键数据', '模块，即空间', '全线产品', '工程案例', '从工厂到现场：交付流程', '资质与能力', '新闻资讯', '预约咨询'];
    ok(JSON.stringify(r.secs) === JSON.stringify(expectSeq), `S1-S10 章节序列完整（v3 十章）| ${r.secs.join('>')}`);
    ok(r.dark === 1 && r.ink === 1 && r.paper === 4, `明暗交替：dark×1 ink×1 paper×4 | ${r.dark}/${r.ink}/${r.paper}`);
    ok(r.bandNums === 4, '数据带 4 列（数字待确认占位，v3 设计决策恢复）');
    ok(r.pcards === 4, '全线产品 4 张真图大卡');
    ok(r.caseBleed === 1 && r.caseCc === 2, '工程案例：通栏首卡 + 双 4:3');
    ok(r.conv && r.convImg, 'S10 转化章：航拍底图 + 白卡表单');
    await page.close();
  }

  /* ---- 2. 案例页分组（组标 + 通栏首图 + g2 双图，每组 3 张） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/cases/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('.cg2-group')];
      return {
        groupCount: groups.length,
        perGroup: groups.map((g) => g.querySelectorAll('img').length),
        leadFull: document.querySelectorAll('.cg2-group > .bleed.r219').length,
        glabelNos: [...document.querySelectorAll('.glabel .gi-no')].map((el) => el.textContent.trim()),
        coverBleed: document.querySelectorAll('section[aria-label="项目封面"] > .bleed.r219').length,
        coverCc: document.querySelectorAll('section[aria-label="项目封面"] .g2 .cc').length,
      };
    });
    ok(r.groupCount === 10, '案例施工实景十组');
    ok(r.perGroup.every((n) => n === 3), '每组 3 张（通栏首图 + 双 4:3，不堆叠）');
    ok(r.leadFull === 10, '每组通栏首图 bleed.r219');
    ok(JSON.stringify(r.glabelNos) === JSON.stringify(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']), `glabel 组标 01-10 顺序 | ${r.glabelNos.join(',')}`);
    ok(r.coverBleed === 1 && r.coverCc === 8, '项目封面：通栏首卡 + 8 张 4:3 两列');
    await page.close();
  }

  /* ---- 3. 产品列表（v3：主打 split3 + 实拍三卡 + 索引行 + 建造体系） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/products/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const idx = [...document.querySelectorAll('.idx > a')];
      return {
        hero56: !!document.querySelector('.v3hero.h56 img[src*="product-4s-hero"]'),
        featured: !!document.querySelector('section[aria-label^="主打产品"] .split3 img[src*="product-4s-dusk"]'),
        realCards: document.querySelectorAll('.chap-ink .prow.p3 .pcard').length,
        idxRows: idx.length,
        idxChips: idx.filter((a) => a.querySelector('.chip') && a.querySelector('.no') && a.querySelector('.go')).length,
        ncards: document.querySelectorAll('section[aria-label="三种建造体系"] .ncard').length,
      };
    });
    ok(r.hero56, '产品中心首屏 h56 + product-4s-hero');
    ok(r.featured, '主打产品 split3（4S 黄昏大图 + 文字列）');
    ok(r.realCards === 3, '已验收实拍三卡（chap-ink prow.p3）');
    ok(r.idxRows === 5 && r.idxChips === 5, '更多产品线五行索引（编号+色片+箭头）');
    ok(r.ncards === 3, '三种建造体系无图附录卡 ×3');

    const contact = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await contact.goto(BASE + '/zh/contact/', { waitUntil: 'domcontentloaded' });
    await contact.waitForTimeout(500);
    const cr = await contact.evaluate(() => ({
      convPage: !!document.querySelector('.conv.conv-page form[data-consult-form]'),
      bg: !!document.querySelector('.conv.conv-page img[src*="product-4s-dusk-door"]'),
      ci: document.querySelectorAll('.conv-page .ci li').length,
      mapnote: !!document.querySelector('.mapnote'),
      phMapGone: !document.querySelector('[data-ph-card="PH-MAP"]'),
    }));
    ok(cr.convPage && cr.bg, '联系页整页转化章（dusk-door 底图 + 白卡表单）');
    ok(cr.ci === 5, `联系信息五行（含企业微信/WhatsApp）| ${cr.ci}`);
    ok(cr.mapnote && cr.phMapGone, '地图说明细条替代 PH-MAP 大色块');
    await contact.close();
    await page.close();
  }

  /* ---- 4. 四视口响应式（案例页 g2 网格与通栏） ---- */
  for (const [w, h, name] of [[1440, 900, '1440'], [1280, 800, '1280'], [768, 1024, '768'], [375, 812, '375']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + '/zh/cases/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const lead = document.querySelector('.cg2-group > .bleed.r219');
      const bigs = document.querySelector('.cg2-group .g2');
      if (!lead || !bigs) return null;
      const lb = lead.getBoundingClientRect();
      const cols = getComputedStyle(bigs).gridTemplateColumns.split(' ').length;
      return { leadW: Math.round(lb.width), cols };
    });
    if (w > 767) {
      ok(r && r.cols === 2, `${name} 案例大图两列`);
    } else {
      ok(r && r.cols === 1, `${name} 案例大图单列`);
    }
    ok(r && r.leadW >= Math.min(w - 40, 1280) * 0.8, `${name} 通栏首图近全宽 | leadW=${r && r.leadW}`);
    await page.close();
  }

  /* ---- 5. 双模式不回退（preview 默认完整动态 / 生产模拟静态 / motion=full 兼容） ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/zh/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const def = await page.evaluate(() => ({ motion: document.documentElement.getAttribute('data-motion'), badge: !!document.querySelector('[data-motion-badge]') }));
    ok(def.motion === 'preview' && def.badge, 'preview 构建默认完整动态（reduce 系统也生效）+ 验收标识');

    await page.goto(BASE + '/zh/?motion=full', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const full = await page.evaluate(() => ({ motion: document.documentElement.getAttribute('data-motion'), badge: !!document.querySelector('[data-motion-badge]') }));
    ok(full.motion === 'full' && full.badge, 'motion=full 显式覆盖仍兼容（完整动态 + 验收标识）');

    const pageP = await ctx.newPage();
    await pageP.route('**/zh/', async (route) => {
      const resp = await route.fetch();
      let body = await resp.text();
      body = body.replace('data-build-mode="preview"', 'data-build-mode="production"');
      body = body.replace(/<div data-motion-badge[^>]*>.*?<\/div>/, '');
      await route.fulfill({ response: resp, body });
    });
    await pageP.goto(BASE + '/zh/', { waitUntil: 'domcontentloaded' });
    await pageP.waitForTimeout(600);
    const prod = await pageP.evaluate(() => ({ motion: document.documentElement.getAttribute('data-motion'), badge: !!document.querySelector('[data-motion-badge]') }));
    ok(prod.motion === 'off' && !prod.badge, '生产模式模拟：reduce 默认静态降级、无验收标识');
    await ctx.close();
  }

  /* ---- 6. 敏感红线（全站文本） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    for (const p of ['/zh/', '/zh/cases/', '/zh/products/', '/zh/products/4s/', '/zh/about/', '/zh/contact/']) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      const text = await page.evaluate(() => document.body.innerText);
      ok(!text.includes('中建三局') && !text.includes('志特') && !text.includes('全球独有'), `红线词未出现在 ${p}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n${pass} 项通过，${fail} 项失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
