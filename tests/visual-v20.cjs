/**
 * v2.0 视觉专项测试（大图版式、色卡、案例分组、响应式、双模式、红线）。
 * 运行前提：预览服务 http://localhost:4321（caddy 挂 dist）。
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('PASS ', label); } else { fail++; console.error('FAIL ', label); } };

(async () => {
  const browser = await chromium.launch();

  /* ---- 1. 首页四区块大图版式（桌面 1440） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
      const hero = document.querySelector('.hero');
      const mfg = document.querySelector('[data-v2="mfg"]');
      return {
        statsRemoved: !document.querySelector('[data-v2="stats"]') && !document.querySelector('.stats-v2'),
        heroNextIsMfg: !!(hero && mfg && hero.nextElementSibling && hero.nextElementSibling.contains(mfg) || hero?.nextElementSibling === mfg),
        heroBottomBg: hero ? getComputedStyle(hero.nextElementSibling ?? hero).backgroundColor : null,
        mfgImg: g('.mfg .figx img'),
        mfgCard: g('.mfg-card'),
        mfgNoOverlap: (() => {
          const f = document.querySelector('.mfg .figx'); const c = document.querySelector('.mfg-card');
          if (!f || !c) return false;
          const fb = f.getBoundingClientRect(); const cb = c.getBoundingClientRect();
          return cb.left >= fb.right - 1; // 文字列起点在图片右缘之右（rv 过渡仅垂直位移，不影响水平判断）
        })(),
        pmBig: document.querySelectorAll('.pm-big > a').length,
        pmBigImg: g('.pm-big .figx img'),
        bltLead: g('.blt-lead'),
        bltGrid: document.querySelectorAll('.blt-grid > a').length,
        ctaBg: g('.cta-bg img'),
      };
    });
    ok(r.statsRemoved, 'S2 数据带已整块移除（v2.0.1）');
    ok(r.heroNextIsMfg, 'Hero 之后直接进入 S3 暖米白内容区（无深色过渡带）');
    ok(r.mfgImg && r.mfgImg[1] >= 460 && r.mfgImg[1] <= 500, 'S3 制造主图 ~480px 高（7:5 编辑式大图，v2.0.2 去 min-height）');
    ok(r.mfgCard && r.mfgCard[0] >= 300 && r.mfgNoOverlap, 'S3 文字列并排不叠压图片（v2.0.2）');
    ok(r.pmBig === 3, 'S4 产品矩阵首行 3 大卡');
    ok(r.pmBigImg && r.pmBigImg[1] >= 280, 'S4 大卡图 ≥280px 高');
    ok(r.bltLead && r.bltLead[0] >= 1100 && r.bltLead[1] >= 480, 'S5 通栏首图 21:9 大图');
    ok(r.bltGrid === 2, 'S5 两列半宽卡');
    ok(r.ctaBg && r.ctaBg[1] >= 500, 'S8 CTA 航拍背景就位');
    await page.close();
  }

  /* ---- 2. 案例页分组（通栏首图 + 两列大图，每组 3-5 张） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/cases/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('.cg2-group')];
      return {
        groupCount: groups.length,
        perGroup: groups.map((g) => g.querySelectorAll('img').length),
        leadFull: document.querySelectorAll('.cg2-group > .figx.r-219').length,
        covers: document.querySelectorAll('.cw2-grid .case-card').length,
      };
    });
    ok(r.groupCount === 10, '案例施工实景十组');
    ok(r.perGroup.every((n) => n >= 3 && n <= 5), '每组 3-5 张（不堆叠）');
    ok(r.leadFull === 10, '每组通栏首图 r-219');
    ok(r.covers === 9, '案例封面通栏首卡 + 8 大卡（共 9 项）');
    await page.close();
  }

  /* ---- 3. 色卡系统（比例 + 角标 + 替换标识） ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/zh/products/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.plist-item .ph-card[data-ph-ratio="fill"]')];
      const row2 = document.querySelectorAll('.p-img-row2 .ph-card[data-ph-ratio="3:2"]').length;
      return {
        fillCount: cards.length,
        hues: [...new Set(cards.map((c) => c.dataset.phCard))],
        tags: cards.filter((c) => c.querySelector('.ph-card-tag')?.textContent === '图片待替换').length,
        row2,
      };
    });
    ok(r.fillCount === 8, '产品列表 8 张色卡（fill 铺满图侧）');
    ok(r.hues.length === 8, '8 个产品色相各不相同');
    ok(r.tags === 8, '每张色卡含「图片待替换」角标');
    ok(r.row2 === 16, '色卡行下细节/场景双色卡 ×8 组');

    const contact = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await contact.goto(BASE + '/zh/contact/', { waitUntil: 'domcontentloaded' });
    await contact.waitForTimeout(500);
    const map = await contact.evaluate(() => { const el = document.querySelector('[data-ph-card="PH-MAP"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { ratio: el.dataset.phRatio, ar: (b.width / b.height).toFixed(2) }; });
    ok(map && map.ratio === '16:5' && Math.abs(parseFloat(map.ar) - 3.2) < 0.1, '联系页 PH-MAP 16:5 锁定');
    await contact.close();
    await page.close();
  }

  /* ---- 4. 四视口大图布局 ---- */
  for (const [w, h, name] of [[1440, 900, '1440'], [1280, 800, '1280'], [768, 1024, '768'], [375, 812, '375']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + '/zh/cases/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const lead = document.querySelector('.cg2-group > .figx.r-219');
      const bigs = document.querySelector('.cg2-bigs');
      if (!lead || !bigs) return null;
      const lb = lead.getBoundingClientRect();
      const cols = getComputedStyle(bigs).gridTemplateColumns.split(' ').length;
      return { leadW: Math.round(lb.width), leadH: Math.round(lb.height), cols };
    });
    if (w >= 1280) {
      ok(r && r.cols === 2, `${name} 案例大图两列`);
    } else {
      ok(r && r.cols === 1, `${name} 案例大图单列`);
    }
    ok(r && r.leadW >= Math.min(w - 40, 1200) * 0.8, `${name} 通栏首图近全宽`);
    await page.close();
  }

  /* ---- 5. 双模式不回退（v2.0.1：preview 默认完整动态 / 生产模拟静态 / motion=full 兼容） ---- */
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
    for (const p of ['/zh/', '/zh/cases/', '/zh/products/', '/zh/about/']) {
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
