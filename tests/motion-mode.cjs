/* v1.8.2 双模式验收专项（需本机预览 http://localhost:4321 运行最新 dist）：
 * 主管口径——默认尊重系统偏好；reduce 用户保留手动控件不自动播放；
 * ?motion=full 完整动态验收模式（5s 自动轮播+全部控件+动效）+ 验收标识 */
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

  // ============ 模式1：系统 reduce + 默认入口（不自动播放，但可手动切换） ============
  const ctxA = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  const pageA = await ctxA.newPage();
  await pageA.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  const metaCommit = await pageA.getAttribute('meta[name="build-commit"]', 'content');
  await pageA.waitForTimeout(6200);
  check('A reduce默认: 不自动轮播（6s 仍在首帧）', (await activeIdx(pageA)) === 0, `index=${await activeIdx(pageA)}`);
  const ctrlA = await controlsVisible(pageA);
  check('A reduce默认: 手动控件保留（prev/next/dots 可见）', ctrlA.prev && ctrlA.next && ctrlA.dots, JSON.stringify(ctrlA));
  await pageA.click('[data-next]');
  check('A reduce默认: 手动点击下一张可切换', (await activeIdx(pageA)) === 1, `index=${await activeIdx(pageA)}`);
  check('A reduce默认: 无验收标识', (await badge(pageA)) === null);
  check('A reduce默认: html[data-motion=off]', await pageA.evaluate(() => document.documentElement.dataset.motion === 'off'));
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

  // ============ 模式3：普通系统（无偏好）+ 默认入口（行为不回退，无标识） ============
  const ctxC = await browser.newContext({ viewport: vp });
  const pageC = await ctxC.newPage();
  await pageC.goto(`${BASE}/zh/`, { waitUntil: 'networkidle' });
  await pageC.waitForTimeout(5600);
  check('C 普通系统: 自动轮播切到第 2 帧（不回退）', (await activeIdx(pageC)) === 1, `index=${await activeIdx(pageC)}`);
  check('C 普通系统: 无验收标识', (await badge(pageC)) === null);
  check('C 普通系统: 无 data-motion=off', await pageC.evaluate(() => document.documentElement.dataset.motion !== 'off'));
  await ctxC.close();

  // ============ 模式4：普通系统 + motion=full（正常 + 标识） ============
  const ctxD = await browser.newContext({ viewport: vp });
  const pageD = await ctxD.newPage();
  await pageD.goto(`${BASE}/zh/?motion=full`, { waitUntil: 'networkidle' });
  check('D 普通系统+full: 显示验收标识', (await badge(pageD)) !== null);
  await ctxD.close();

  await browser.close();
  const pass = results.filter((r) => r[1]).length;
  console.log(`\n${pass}/${results.length} 项通过`);
  process.exit(pass === results.length ? 0 : 1);
})();
