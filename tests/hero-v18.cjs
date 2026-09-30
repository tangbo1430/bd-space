/* v3.0.1 Hero 与素材专项（需本机预览 http://localhost:4321 运行最新 dist）：
 * 四视口 Hero 高度（v3：100/100/80/88vh，min 660/660/560/520）、scrim、44px 控件、
 * 5s 自动轮播、reduced-motion 静态、案例实景图组（glabel 01-10 + 通栏 bleed + g2 双图）、
 * 4S 详情图鉴/场景图组、version.json ↔ meta 版本一致 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, extra = '') => { results.push([name, cond]); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' | ' + extra : ''}`); };

(async () => {
  const browser = await chromium.launch();

  // ============ 版本证据一致 ============
  const ctx0 = await browser.newContext();
  const vj = await (await ctx0.request.get(`${BASE}/version.json`)).json();
  const p0 = await ctx0.newPage();
  await p0.goto(`${BASE}/zh/`, { waitUntil: 'domcontentloaded' });
  const metaCommit = await p0.getAttribute('meta[name="build-commit"]', 'content');
  check('version.json 可读且含 commit/builtAt', Boolean(vj.commit && vj.builtAt), JSON.stringify(vj));
  check('meta build-commit 与 version.json 一致', metaCommit === vj.commit, metaCommit);
  await ctx0.close();

  // ============ 四视口 Hero 高度（v3.0：一屏一事，首屏整幅） ============
  const viewports = [
    { w: 1440, h: 900, expect: 900, label: '桌面1440 100vh' },
    { w: 1280, h: 800, expect: 800, label: '1280 100vh' },
    { w: 768, h: 1024, expect: 0.8 * 1024, label: '平板768 80vh' },
    { w: 375, h: 667, expect: 0.88 * 667, label: '移动375 88vh' },
  ];
  for (const v of viewports) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/zh/`, { waitUntil: 'domcontentloaded' });
    const hh = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
    check(`Hero 高度 ${v.label}`, Math.abs(hh - v.expect) <= 1.5, `${hh}px vs ${v.expect}px`);
    await ctx.close();
  }

  // ============ 桌面 1440：scrim / 控件 / 5s 轮播 ============
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });

  const scrim = await page.evaluate(() => getComputedStyle(document.querySelector('.slide'), '::after').backgroundImage);
  check('scrim 渐变存在（rgba(20,24,22,.55)）', scrim.includes('linear-gradient') && scrim.includes('20, 24, 22'));

  const dotBox = await page.locator('[data-dot]').first().boundingBox();
  const prevBox = await page.locator('[data-prev]').boundingBox();
  check('分页点 44×44 触控区', Math.abs(dotBox.width - 44) <= 1 && Math.abs(dotBox.height - 44) <= 1, `${dotBox.width}x${dotBox.height}`);
  check('箭头 44×44 触控区', Math.abs(prevBox.width - 44) <= 1 && Math.abs(prevBox.height - 44) <= 1, `${prevBox.width}x${prevBox.height}`);

  const grp = await page.locator('.hero-controls').boundingBox();
  check('控件组位于右下', grp.x + grp.width > 1440 - 220 && grp.y + grp.height > 900 - 140, `x=${Math.round(grp.x)} y=${Math.round(grp.y)}`);

  // 文字安全区：v3 1280 容器居中（左右各 80px 内边距）
  const copyBox = await page.locator('.slide.on .hero-copy').boundingBox();
  check('文字安全区 1280 容器居中（v3）', Math.abs(copyBox.width - 1280) <= 1 && Math.abs(copyBox.x - 80) <= 1, `w=${copyBox.width} x=${copyBox.x}`);

  const activeIdx = () => page.evaluate(() => [...document.querySelectorAll('[data-slide]')].findIndex((s) => s.classList.contains('on')));
  check('初始帧为 0', (await activeIdx()) === 0);
  await page.waitForTimeout(5600); // 5s 自动轮播
  check('5s 自动轮播切到第 2 帧', (await activeIdx()) === 1, `index=${await activeIdx()}`);

  // 帧 1 焦点中上 1/3
  const op1 = await page.evaluate(() => getComputedStyle(document.querySelector('.ph-1 .ph-pic img')).objectPosition);
  check('帧 1 object-position 50% 33%', op1.replace(/px/g, '').trim().startsWith('50%') && op1.includes('33'), op1);
  await ctx.close();

  // ============ reduced-motion：静态首帧不自动（preview 构建默认完整动态，
  // 此处覆写 build-mode=production 模拟生产构建验证降级行为） ============
  const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pageR = await ctxR.newPage();
  await pageR.route('**/zh/', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    body = body.replace('data-build-mode="preview"', 'data-build-mode="production"');
    body = body.replace(/<div data-motion-badge[^>]*>.*?<\/div>/, '');
    await route.fulfill({ response: resp, body });
  });
  await pageR.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageR.waitForTimeout(6200);
  const idxR = await pageR.evaluate(() => [...document.querySelectorAll('[data-slide]')].findIndex((s) => s.classList.contains('on')));
  check('reduced-motion 静态首帧（生产模式，6s 不自动切换）', idxR === 0, `index=${idxR}`);
  await ctxR.close();

  // ============ 案例页实景图组（v3：组标 + 通栏首图 + g2 双图） ============
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();
  const bad = [];
  page2.on('response', (r) => { if (r.url().includes('/assets/img/case-') && r.status() !== 200) bad.push(`${r.status()} ${r.url()}`); });
  await page2.goto(`${BASE}/zh/cases/`, { waitUntil: 'networkidle' });
  const groups = await page2.locator('.cg2-group').count();
  const items = await page2.locator('.cg2-group img').count();
  const leads = await page2.locator('.cg2-group > .bleed.r219').count();
  const glabels = await page2.locator('.cg2-group .glabel').count();
  check('案例实景十组（v3 组标+通栏首图+双 4:3）', groups === 10, `groups=${groups}`);
  check('每组通栏首图 bleed.r219', leads === 10, `leads=${leads}`);
  check('每组 glabel 组标', glabels === 10, `glabels=${glabels}`);
  check('案例实景 30 张图（10 首图 + 20 大图）', items === 30, `imgs=${items}`);
  check('案例图片请求全部 200', bad.length === 0, bad.join('; '));
  const hasShenzhen = await page2.locator('img[src*="shenzhen-steel-frame"]').count();
  const shenzhenAlt = await page2.locator('img[alt*="深圳"]').count();
  check('实景图组深圳中性命名（客户名不上页，图可上）', hasShenzhen === 1 && shenzhenAlt >= 2, `steelFrame=${hasShenzhen} shenzhenAlt=${shenzhenAlt}`);
  await ctx2.close();

  // 移动 375：实景图组大图单列、通栏首图近全宽
  const ctx3 = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page3 = await ctx3.newPage();
  await page3.goto(`${BASE}/zh/cases/`, { waitUntil: 'networkidle' });
  const cols = await page3.locator('.cg2-group .g2').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  const leadW = await page3.locator('.cg2-group > .bleed.r219').first().evaluate((el) => Math.round(el.getBoundingClientRect().width));
  check('移动实景图组单列', cols === 1, `cols=${cols}`);
  check('移动通栏首图近全宽', leadW >= 330, `leadW=${leadW}`);
  // 移动 Hero 无箭头
  const prevVisible = await page3.locator('[data-prev]').isVisible().catch(() => false);
  check('移动档箭头隐藏', !prevVisible);
  await ctx3.close();

  // ============ 4S 详情：首图 dusk 82vh + 图鉴通栏 hero + 双 4:3 + 场景 2×2 ============
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page4 = await ctx4.newPage();
  await page4.goto(`${BASE}/zh/products/4s/`, { waitUntil: 'networkidle' });
  const hero82 = await page4.locator('.v3hero.h82 img[src*="product-4s-dusk."]').count();
  check('4S 首图 82vh 黄昏全景（v3）', hero82 === 1, `count=${hero82}`);
  const galBleed = await page4.locator('section[aria-label="产品图鉴"] .bleed.r219 img[src*="product-4s-hero"]').count();
  check('4S 图鉴通栏首图 product-4s-hero', galBleed === 1, `count=${galBleed}`);
  const galPair = await page4.locator('section[aria-label="产品图鉴"] .g2 .gi img').count();
  check('4S 图鉴双 4:3（detail-wall + dusk-door）', galPair === 2, `count=${galPair}`);
  const door = page4.locator('img[src*="product-4s-dusk-door"]');
  check('4S dusk-door 已渲染（图鉴卡，v3 取消 608 限宽）', (await door.count()) === 1);
  const scenes = await page4.locator('section[aria-label="应用场景"] .g4 .gi img').count();
  check('4S 应用场景 2×2 四张实拍', scenes === 4, `count=${scenes}`);
  await ctx4.close();

  // ============ 首页流程步骤图（实拍） ============
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page5 = await ctx5.newPage();
  const flowBad = [];
  page5.on('response', (r) => { if (/flow-step0[1356]-/.test(r.url()) && r.status() !== 200) flowBad.push(`${r.status()} ${r.url()}`); });
  await page5.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  for (const no of ['01', '03', '05', '06']) {
    await page5.locator(`#flow-tab-${no}`).click();
    await page5.waitForTimeout(350);
    const img = page5.locator(`#flow-panel-${no} .flow-img img`);
    const okImg = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    check(`流程 step${no} 实拍图加载成功`, okImg, await img.getAttribute('src'));
  }
  check('流程步骤图请求全部 200', flowBad.length === 0, flowBad.join('; '));
  await ctx5.close();

  await browser.close();
  const failed = results.filter(([, c]) => !c);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过`);
  if (failed.length) process.exit(1);
})();
