/* v1.3 导航带行为验证（AC-34~47 覆盖）：时序、轨迹、键盘、触屏、无 JS、四视口 */
const { chromium } = require('playwright');

const results = [];
const check = (name, cond) => { results.push([name, cond]); console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); };

(async () => {
  const browser = await chromium.launch();

  // ============ 桌面 1440 ============
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });

  const isOpen = () => page.locator('.sub-panel').evaluate((el) => getComputedStyle(el).visibility === 'visible' && +getComputedStyle(el).opacity > 0.5);
  const trig = await page.locator('.sub-trigger').boundingBox();
  const tcx = trig.x + trig.width / 2, tcy = trig.y + trig.height / 2;

  // AC-35: 掠过 <100ms 不闪现
  await page.mouse.move(tcx, tcy);
  await page.waitForTimeout(40);
  await page.mouse.move(tcx + 300, tcy); // 快速掠过离开
  await page.waitForTimeout(250);
  check('AC-35 掠过<100ms 不闪现', !(await isOpen()));

  // AC-35: 停留 ≥100ms 打开
  await page.mouse.move(tcx, tcy);
  await page.waitForTimeout(180);
  check('AC-35 停留100ms后打开', await isOpen());

  // AC-36: 慢速直向移入面板（经 12px 连接层）
  const card = await page.locator('.sub-panel-card').boundingBox();
  for (let s = 1; s <= 14; s++) {
    await page.mouse.move(tcx, tcy + (card.y + 28 - tcy) * (s / 14));
    await page.waitForTimeout(15);
  }
  check('AC-36 慢速直向移入保持开启', await isOpen());

  // AC-36: 斜向轨迹（从一级项右缘斜向进入面板右端——穿越走廊）
  await page.mouse.move(tcx, tcy);
  await page.waitForTimeout(180);
  const targetX = card.x + card.width - 30;
  for (let s = 1; s <= 20; s++) {
    await page.mouse.move(tcx + (targetX - tcx) * (s / 20), tcy + (card.y + 28 - tcy) * (s / 20));
    await page.waitForTimeout(12);
  }
  check('AC-36 斜向轨迹不关闭（安全走廊）', await isOpen());

  // AC-37: 离开后 ≥300ms 才关闭；延迟内返回取消
  await page.mouse.move(tcx, tcy);
  await page.waitForTimeout(180);
  await page.mouse.move(700, 500); // 离开组
  await page.waitForTimeout(150); // <300ms
  check('AC-37 离开150ms内仍保持', await isOpen());
  await page.mouse.move(card.x + 60, card.y + 28); // 延迟内回到面板
  await page.waitForTimeout(400); // 超过 300ms
  check('AC-37 延迟内返回取消关闭', await isOpen());
  await page.mouse.move(700, 600);
  await page.waitForTimeout(450);
  check('AC-37 离开满300ms后关闭', !(await isOpen()));

  // AC-39: 点击外部即时关闭且不阻断目标
  await page.mouse.move(tcx, tcy);
  await page.waitForTimeout(180);
  await page.click('text=工程案例', { position: { x: 5, y: 5 } });
  await page.waitForURL('**/zh/cases/**');
  check('AC-39 点击外部导航正常跳转（不阻断）', page.url().includes('/zh/cases/'));

  // AC-34: 点击一级「关于我们」直接导航（不展开、无拦截）
  await page.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  await page.click('.sub-trigger');
  await page.waitForURL('**/zh/about/**');
  check('AC-34 点击一级文字直接进 /zh/about/', page.url().endsWith('/zh/about/'));
  const hasAriaExpanded = await page.locator('.sub-trigger[aria-expanded]').count();
  check('AC-34 桌面触发器无 aria-expanded', hasAriaExpanded === 0);

  // AC-38: 键盘 Tab 聚焦即时打开；Tab 顺序进入子项；Escape 关闭并焦点返回
  await page.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  await page.evaluate(() => (document.querySelector('.sub-trigger')).focus());
  await page.waitForTimeout(60); // focus 即时（<100ms）
  check('AC-38 focus 即时打开', await isOpen());
  await page.keyboard.press('Tab');
  const focused1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('AC-38 Tab 进入「公司介绍」', focused1 === '公司介绍');
  await page.keyboard.press('Tab');
  const focused2 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('AC-38 Tab 进入「投资者关系」', focused2 === '投资者关系');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const backToTrigger = await page.evaluate(() => document.activeElement?.classList.contains('sub-trigger'));
  check('AC-38 Escape 关闭且焦点返回一级链接', !(await isOpen()) && backToTrigger);
  // Enter 导航
  await page.keyboard.press('Enter');
  await page.waitForURL('**/zh/about/**');
  check('AC-38 Enter 正常导航', page.url().endsWith('/zh/about/'));

  // AC-46/47 截图证据：深色 Hero 上的导航带
  await page.goto('http://localhost:4321/zh/about/', { waitUntil: 'networkidle' });
  await page.locator('.sub-trigger').hover();
  await page.waitForTimeout(250);
  await page.screenshot({ path: '../shots/v13-desktop-1440-band.png', clip: { x: 0, y: 0, width: 1440, height: 300 } });
  const noCardShadow = await page.evaluate(() => {
    const el = document.querySelector('.sub-panel-card');
    const cs = getComputedStyle(el);
    return cs.boxShadow === 'none' && cs.borderRadius === '0px';
  });
  check('AC-46 无白卡/重阴影/大圆角', noCardShadow);

  // ============ 1280 视口 ============
  const p1280 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p1280.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  await p1280.locator('.sub-trigger').hover();
  await p1280.waitForTimeout(250);
  check('AC-47 1280 导航带可打开', await p1280.locator('.has-sub.open').count() === 1 || await (async () => { const el = p1280.locator('.sub-panel'); return await el.evaluate((e) => getComputedStyle(e).visibility === 'visible'); })());
  await p1280.screenshot({ path: '../shots/v13-desktop-1280-band.png', clip: { x: 0, y: 0, width: 1280, height: 280 } });
  await p1280.close();

  // ============ 无 JS（AC-43） ============
  const ctxNoJs = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const nojs = await ctxNoJs.newPage();
  await nojs.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  await nojs.locator('.sub-trigger').hover();
  await nojs.waitForTimeout(300);
  const cssOpen = await nojs.locator('.sub-panel').evaluate((el) => getComputedStyle(el).visibility === 'visible' && +getComputedStyle(el).opacity > 0.5);
  check('AC-43 无 JS 纯 CSS :hover 展开', cssOpen);
  const href = await nojs.locator('.sub-trigger').getAttribute('href');
  check('AC-43 一级链接无脚本有效', href === '/zh/about/');
  const footerInvestors = await nojs.locator('footer a[href="/zh/about/investors/"]').count();
  check('AC-43 页脚子页直链存在', footerInvestors > 0);
  await ctxNoJs.close();

  // ============ 移动 375（AC-40/41） ============
  const m375 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const mp = await m375.newPage();
  await mp.goto('http://localhost:4321/zh/about/investors/', { waitUntil: 'networkidle' });
  await mp.tap('[data-drawer-open]');
  await mp.waitForTimeout(350);
  const defaultExpanded = await mp.locator('.p-sub.open').count();
  check('AC-41 about 路由抽屉默认展开', defaultExpanded === 1);
  const btnBox = await mp.locator('.p-sub-btn').boundingBox();
  check('AC-40 展开按钮 ≥44×44', btnBox.width >= 44 && btnBox.height >= 44);
  await mp.screenshot({ path: '../shots/v13-mobile-375-expanded.png' });
  // 文字仅导航
  await mp.tap('.p-sub-link');
  await mp.waitForTimeout(1200);
  check('AC-40 移动文字链接直接导航', mp.url().endsWith('/zh/about/'));
  // 按钮仅展开/收起
  await mp.tap('[data-drawer-open]');
  await mp.waitForTimeout(300);
  const beforeClose = await mp.locator('.p-sub.open').count();
  await mp.tap('.p-sub-btn');
  await mp.waitForTimeout(250);
  const afterToggle = await mp.locator('.p-sub.open').count();
  check('AC-40 按钮仅切换展开（不导航）', beforeClose === 1 && afterToggle === 0 && mp.url().endsWith('/zh/about/'));
  await mp.close();

  // ============ 768 平板（抽屉方案，N6） ============
  const t768 = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true });
  const tp = await t768.newPage();
  await tp.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  const burgerVisible = await tp.locator('[data-drawer-open]').isVisible();
  check('AC-47 768 采用抽屉方案（burger 可见）', burgerVisible);
  await tp.tap('[data-drawer-open]');
  await tp.waitForTimeout(300);
  const collapsed = await tp.locator('.p-sub:not(.open)').count();
  check('AC-41 非 about 路由默认收起', collapsed === 1);
  await tp.tap('.p-sub-btn');
  await tp.waitForTimeout(250);
  const expanded = await tp.locator('.p-sub.open').count();
  check('AC-40 768 按钮展开子项', expanded === 1);
  await tp.screenshot({ path: '../shots/v13-tablet-768-drawer.png' });
  await t768.close();

  // ============ 触屏桌面宽度（hover:none 模拟，AC-45） ============
  const tch = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const tp2 = await tch.newPage();
  await tp2.goto('http://localhost:4321/zh/', { waitUntil: 'networkidle' });
  await tp2.tap('.sub-trigger'); // 触屏点击一级文字
  await tp2.waitForURL('**/zh/about/**');
  check('AC-45 触屏点击一级直接导航（非首击展开）', tp2.url().endsWith('/zh/about/'));
  await tch.close();

  await ctx.close();
  await browser.close();

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
