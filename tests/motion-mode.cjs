/* v2.0.1 双模式验收专项（需本机预览 http://localhost:4321 运行最新 dist）：
 * 主管口径——预览/验收构建（PUBLIC_BUILD_MODE=preview）默认完整动态、自动轮播、显示版本标识；
 * 生产构建尊重 prefers-reduced-motion（静态首帧+保留手动控件）；
 * ?motion=full 显式覆盖入口兼容保留。本文件对 preview 构建断言默认行为，
 * 并通过 build-mode 覆写页模拟生产构建行为。 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, extra = '') => { results.push([name, cond]); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' | ' + extra : ''}`); };

const activeIdx = (page) => page.evaluate(() => [...document.querySelectorAll('[data-slide]')].findIndex((s) => s.classList.contains('on')));
const controlsVisible = (page) => page.evaluate(() => {
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none';
  return {
    prev: vis(document.querySelector('[data-prev]')),
    next: vis(document.querySelector('[data-next]')),
    dots: [...document.querySelectorAll('[data-dot]')].every(vis),
  };
});
const badge = (page) => page.evaluate(() => document.querySelector('[data-motion-badge]')?.textContent ?? null);

(async () => {
  const browser = await chromium.launch();
  const vp = { width: 1440, height: 900 };

  // ============ 模式1：preview 构建默认入口 + 系统 reduce（仍自动播放，覆盖系统偏好） ============
  const ctxA = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  const pageA = await ctxA.newPage();
  await pageA.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  const metaCommit = await pageA.getAttribute('meta[name="build-commit"]', 'content');
  const metaMode = await pageA.getAttribute('meta[name="build-mode"]', 'content');
  check('A preview默认: meta build-mode=preview', metaMode === 'preview', String(metaMode));
  await pageA.waitForTimeout(6200);
  check('A preview默认: 5s 自动轮播切帧（reduce 系统也生效）', (await activeIdx(pageA)) === 1, `index=${await activeIdx(pageA)}`);
  const ctrlA = await controlsVisible(pageA);
  check('A preview默认: 全部控件可用（prev/next/dots 可见）', ctrlA.prev && ctrlA.next && ctrlA.dots, JSON.stringify(ctrlA));
  await pageA.click('[data-next]');
  check('A preview默认: 手动点击下一张可切换', (await activeIdx(pageA)) === 2, `index=${await activeIdx(pageA)}`);
  const badgeA = await badge(pageA);
  check('A preview默认: 显示验收标识含 commit', badgeA !== null && badgeA.includes('完整动态模式') && badgeA.includes(metaCommit), badgeA ?? 'null');
  check('A preview默认: html[data-motion=preview]', await pageA.evaluate(() => document.documentElement.dataset.motion === 'preview'));
  await ctxA.close();

  // ============ 模式2：系统 reduce + motion=full（自动播放 + 全部控件 + 标识） ============
  const ctxB = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  const pageB = await ctxB.newPage();
  await pageB.goto(`${BASE}/zh/?motion=full`, { waitUntil: 'networkidle' });
  check('B motion=full: 初始帧为 0', (await activeIdx(pageB)) === 0);
  await pageB.waitForTimeout(5600);
  check('B motion=full: 5s 自动轮播切到第 2 帧（覆盖系统 reduce）', (await activeIdx(pageB)) === 1, `index=${await activeIdx(pageB)}`);
  const ctrlB = await controlsVisible(pageB);
  check('B motion=full: 全部控件可用', ctrlB.prev && ctrlB.next && ctrlB.dots, JSON.stringify(ctrlB));
  await pageB.click('[data-prev]');
  check('B motion=full: 手动上一张', (await activeIdx(pageB)) === 0, `index=${await activeIdx(pageB)}`);
  await pageB.locator('[data-dot]').nth(2).click();
  check('B motion=full: 分页点跳第 3 帧', (await activeIdx(pageB)) === 2, `index=${await activeIdx(pageB)}`);
  const badgeB = await badge(pageB);
  check('B motion=full: 显示验收标识含 commit', badgeB !== null && badgeB.includes('完整动态模式') && badgeB.includes(metaCommit), badgeB ?? 'null');
  check('B motion=full: html[data-motion=full]', await pageB.evaluate(() => document.documentElement.dataset.motion === 'full'));
  check('B motion=full: 覆盖系统 reduce（非 off）', await pageB.evaluate(() => document.documentElement.dataset.motion !== 'off'));
  // 键盘
  await pageB.locator('[data-next]').focus();
  await pageB.keyboard.press('Enter');
  check('B motion=full: 键盘 Enter 切换', (await activeIdx(pageB)) === 0, `index=${await activeIdx(pageB)}`);
  await ctxB.close();

  // ============ 模式3：preview 构建默认入口 + 普通系统（自动播放 + 标识） ============
  const ctxC = await browser.newContext({ viewport: vp });
  const pageC = await ctxC.newPage();
  await pageC.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageC.waitForTimeout(5600);
  check('C 普通系统+preview默认: 自动轮播切到第 2 帧', (await activeIdx(pageC)) === 1, `index=${await activeIdx(pageC)}`);
  check('C 普通系统+preview默认: 显示验收标识', (await badge(pageC)) !== null);
  check('C 普通系统+preview默认: 无 data-motion=off', await pageC.evaluate(() => document.documentElement.dataset.motion !== 'off'));
  await ctxC.close();

  // ============ 模式4：普通系统 + motion=full（正常 + 标识，兼容保留） ============
  const ctxD = await browser.newContext({ viewport: vp });
  const pageD = await ctxD.newPage();
  await pageD.goto(`${BASE}/zh/?motion=full`, { waitUntil: 'networkidle' });
  check('D 普通系统+full: 显示验收标识', (await badge(pageD)) !== null);
  await ctxD.close();

  // ============ 模式5：生产构建模拟（覆写 build-mode=production）+ 系统 reduce ============
  // 预览容器服务的是 preview 构建；此处将 HTML 中构建模式标识改写为 production 并去掉 SSR 标识，
  // 走与生产构建完全相同的 JS 路径（previewBuild=false），验证生产行为不回退。
  const ctxE = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  const pageE = await ctxE.newPage();
  await pageE.route('**/zh/', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    body = body.replace('data-build-mode="preview"', 'data-build-mode="production"');
    body = body.replace('name="build-mode" content="preview"', 'name="build-mode" content="production"');
    body = body.replace(/<div data-motion-badge[^>]*>.*?<\/div>/, '');
    await route.fulfill({ response: resp, body });
  });
  await pageE.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageE.waitForTimeout(6200);
  check('E 生产模拟+reduce: 不自动轮播（6s 仍在首帧）', (await activeIdx(pageE)) === 0, `index=${await activeIdx(pageE)}`);
  const ctrlE = await controlsVisible(pageE);
  check('E 生产模拟+reduce: 手动控件保留（prev/next/dots 可见）', ctrlE.prev && ctrlE.next && ctrlE.dots, JSON.stringify(ctrlE));
  await pageE.click('[data-next]');
  check('E 生产模拟+reduce: 手动点击下一张可切换', (await activeIdx(pageE)) === 1, `index=${await activeIdx(pageE)}`);
  check('E 生产模拟+reduce: 无验收标识', (await badge(pageE)) === null);
  check('E 生产模拟+reduce: html[data-motion=off]', await pageE.evaluate(() => document.documentElement.dataset.motion === 'off'));
  await ctxE.close();

  // ============ 模式6：生产构建模拟 + 普通系统（自动播放不回退，无标识） ============
  const ctxF = await browser.newContext({ viewport: vp });
  const pageF = await ctxF.newPage();
  await pageF.route('**/zh/', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    body = body.replace('data-build-mode="preview"', 'data-build-mode="production"');
    body = body.replace(/<div data-motion-badge[^>]*>.*?<\/div>/, '');
    await route.fulfill({ response: resp, body });
  });
  await pageF.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageF.waitForTimeout(5600);
  check('F 生产模拟+普通系统: 自动轮播切到第 2 帧（不回退）', (await activeIdx(pageF)) === 1, `index=${await activeIdx(pageF)}`);
  check('F 生产模拟+普通系统: 无验收标识', (await badge(pageF)) === null);
  await ctxF.close();

  // ============ 模式7（v2.0.4 用户实机场景）：指针停在画面区不暂停；悬停控件区才暂停 ============
  // 旧逻辑整块 Hero mouseenter 即 paused-hover——真实用户指针常态停在首屏大图上，
  // 表现为「从不轮播」。整改后：画面区悬停继续自动轮播，仅悬停控件区（箭头/圆点）暂停。
  const ctxG = await browser.newContext({ viewport: vp });
  const pageG = await ctxG.newPage();
  await pageG.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageG.mouse.move(720, 400); // 静止悬停在首屏画面区（远离底部控件）
  await pageG.waitForTimeout(5600);
  check('G 画面区悬停不暂停: 5s 仍自动切到第 2 帧', (await activeIdx(pageG)) === 1, `index=${await activeIdx(pageG)}`);
  check('G 画面区悬停不暂停: 无 paused 态', await pageG.evaluate(() => !document.querySelector('.hero')?.classList.contains('paused')));
  const dotBox = await pageG.locator('[data-dot]').first().boundingBox();
  if (dotBox) await pageG.mouse.move(dotBox.x + dotBox.width / 2, dotBox.y + dotBox.height / 2);
  await pageG.waitForTimeout(100);
  check('G 悬停控件区: 进入 paused 态', await pageG.evaluate(() => document.querySelector('.hero')?.classList.contains('paused') === true));
  await pageG.mouse.move(720, 400);
  await pageG.waitForTimeout(100);
  check('G 离开控件区: 恢复播放态', await pageG.evaluate(() => !document.querySelector('.hero')?.classList.contains('paused')));
  await ctxG.close();

  await browser.close();
  const pass = results.filter((r) => r[1]).length;
  console.log(`\n${pass}/${results.length} 项通过`);
  process.exit(pass === results.length ? 0 : 1);
})();
