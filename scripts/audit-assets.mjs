/**
 * 素材引用审计（v1.9，纳入 npm run check）：
 * 基于「源码资产登记（src/lib/assets.ts 的 base）+ dist 实际引用」交叉核对，
 * 输出三类真实利用率与孤儿/缺失/重复/未利用清单。
 *
 * 口径（与主管约定）：
 *  - 「上线」= 资产 base 在 dist 的 HTML/JS 中被实际引用（非仅文件存在于 img 目录）；
 *  - 响应式变体（-m.webp / .webp / .jpg）按「源文件」只计一次，不虚增；
 *  - 115 = 全量源文件；81 = type=image 视觉源；v1.9 65 = direct+salvaged 计划采用源。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dist = join(root, 'dist');
const imgDir = join(root, 'public', 'assets', 'img');
let failures = 0;
const ok = (cond, label) => { if (cond) console.log(`  PASS  ${label}`); else { console.error(`  FAIL  ${label}`); failures++; } };
const fmt = (n, d) => `${n}/${d} = ${d ? ((n / d) * 100).toFixed(1) : '0.0'}%`;

/* ---------- 解析 CSV（处理引号内逗号） ---------- */
function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()); // eslint-disable-line no-irregular-whitespace -- 剥离 CSV BOM
  const header = splitLine(lines[0]);
  for (let i = 1; i < lines.length; i++) rows.push(Object.fromEntries(header.map((h, k) => [h, splitLine(lines[i])[k] ?? ''])));
  return rows;
}
function splitLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/* ---------- 1) 全量源 manifest（v3，115 行） ---------- */
const v3 = parseCsv(readFileSync(join(imgDir, 'asset-manifest-v3.csv'), 'utf8'));
const total115 = v3.length;
const images81 = v3.filter((r) => r.type === 'image');
// 每个源文件派生的「上线 base」集合（export_files 列 → 取首个文件去扩展名/变体后缀）
function exportBases(row) {
  if (!row.export_files) return [];
  return row.export_files.split(';').map((s) => s.trim().split(/\s/)[0]).filter(Boolean)
    .map((f) => f.replace(/\.(webp|jpg|png)$/i, '').replace(/-m$/, ''));
}

/* ---------- 2) dist 实际引用集合 ---------- */
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|js|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const distText = walk(dist).map((f) => readFileSync(f, 'utf8')).join('\n');
const referencedBases = new Set();
for (const m of distText.matchAll(/assets\/img\/([a-z0-9-]+?)(?:-m)?\.(?:webp|jpg|png)/g)) referencedBases.add(m[1]);

/* ---------- 3) 三口径利用率 ---------- */
const online = (row) => exportBases(row).some((b) => referencedBases.has(b));

const online115 = v3.filter(online);
const online81 = images81.filter(online);
// v1.9 计划采用源：direct + salvaged（65 项）
const plan65 = v3.filter((r) => r.class === 'direct' || r.class === 'salvaged');
const onlinePlan65 = plan65.filter(online);

console.log('== 素材实际利用率（基于 dist 实际引用，响应式变体按源计一次） ==');
console.log(`  原始 115 源文件实际上线：${fmt(online115.length, total115)}`);
console.log(`  81 张视觉源素材实际上线：${fmt(online81.length, images81.length)}`);
console.log(`  v1.9 计划采用源（direct+salvaged=${plan65.length}）实际上线：${fmt(onlinePlan65.length, plan65.length)}`);

/* ---------- 4) 每页引用数量 ---------- */
console.log('\n== 每页引用数量（dist HTML） ==');
const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));
const perPage = htmlFiles.map((f) => {
  const txt = readFileSync(f, 'utf8');
  const bases = new Set();
  for (const m of txt.matchAll(/assets\/img\/([a-z0-9-]+?)(?:-m)?\.(?:webp|jpg|png)/g)) bases.add(m[1]);
  const rel = f.replace(dist, '').replace(/\\/g, '/').replace(/\/index\.html$/, '/').replace(/^\//, '');
  return [rel || '/', bases.size];
}).sort((a, b) => b[1] - a[1]);
for (const [p, n] of perPage) console.log(`  ${String(n).padStart(3)}  ${p}`);

/* ---------- 5) 孤儿资源（img 目录存在但 dist 未引用） ---------- */
const allImgFiles = readdirSync(imgDir).filter((f) => /\.(webp|jpg|png|svg)$/i.test(f));
const orphanBases = new Set();
for (const f of allImgFiles) {
  const base = f.replace(/\.(webp|jpg|png)$/i, '').replace(/-m$/, '');
  if (!referencedBases.has(base) && !f.endsWith('.svg')) orphanBases.add(base);
}
console.log(`\n== 孤儿资源（存在但未在 dist 引用）：${orphanBases.size} 个源 ==`);
for (const b of [...orphanBases].sort()) console.log(`  ORPHAN  ${b}`);

/* ---------- 6) 缺失引用（manifest 计划上线但 dist 缺文件） ---------- */
const missing = [];
for (const row of plan65) {
  for (const b of exportBases(row)) {
    if (referencedBases.has(b)) {
      // 至少应有 webp 或 jpg 实体
      const hasFile = ['.webp', '.jpg'].some((ext) => existsSync(join(imgDir, b + ext)));
      if (!hasFile) missing.push(b);
    }
  }
}
console.log(`\n== 缺失引用（已引用但文件缺失）：${missing.length} ==`);
for (const b of missing) console.log(`  MISSING  ${b}`);

/* ---------- 7) 重复引用（同 base 在单页出现多次，仅提示） ---------- */
let dupCount = 0;
for (const f of htmlFiles) {
  const txt = readFileSync(f, 'utf8');
  const seen = {};
  for (const m of txt.matchAll(/assets\/img\/([a-z0-9-]+?)(?:-m)?\.(?:webp|jpg|png)/g)) seen[m[1]] = (seen[m[1]] || 0) + 1;
  // 同图出现在 srcset(桌面+移动)+img 回退是正常 3 次；>6 视为堆叠
  for (const [b, n] of Object.entries(seen)) if (n > 6) { dupCount++; console.log(`  DUP  ${f.replace(dist, '')} :: ${b} ×${n}`); }
}
console.log(`\n== 重复引用（单页 >6 次，疑似堆叠）：${dupCount} ==`);

/* ---------- 8) 未利用源清单（可公开但本轮未上线） ---------- */
const unused = v3.filter((r) => (r.class === 'direct' || r.class === 'salvaged') && !online(r));
console.log(`\n== 计划采用但未上线源（${unused.length}）：==`);
for (const r of unused) console.log(`  UNUSED  ${r.source_file}  :: ${(r.page_position || '').trim()}`);

/* ---------- 恢复替换的 6 项只按源计一次的核验 ---------- */
const restored = ['product-4s-dusk', 'product-4s-detail-wall', 'product-4s-dusk-door', 'case-cayman-install-crane', 'case-cayman-install-roof', 'flow-step06-crane-panel'];
const restoredOnline = restored.filter((b) => referencedBases.has(b));
console.log(`\n== v1.9 恢复人物版 6 项上线核验（按源计）：${restoredOnline.length}/6 ==`);

/* ---------- 硬断言 ---------- */
console.log('\n== 审计断言 ==');
ok(total115 === 115, `全量 manifest 为 115 源（实际 ${total115}）`);
ok(images81.length === 81, `视觉源为 81（实际 ${images81.length}）`);
ok(plan65.length === 65, `v1.9 计划采用源为 65（实际 ${plan65.length}）`);
ok(restoredOnline.length === 6, '恢复人物版 6 项全部实际上线');
ok(missing.length === 0, `无缺失引用（实际 ${missing.length}）`);
ok(!referencedBases.has('team-founder') && !existsSync(join(imgDir, 'team-founder.jpg')), '创始人文件未上线未入库');
ok(dupCount === 0, `无单页堆叠重复引用（实际 ${dupCount}）`);

// 输出机读 JSON 供回传
const report = {
  commit: process.env.BUILD_COMMIT ?? null,
  raw115: { online: online115.length, total: total115, pct: +(online115.length / total115 * 100).toFixed(1) },
  visual81: { online: online81.length, total: 81, pct: +(online81.length / 81 * 100).toFixed(1) },
  plan65: { online: onlinePlan65.length, total: 65, pct: +(onlinePlan65.length / 65 * 100).toFixed(1) },
  orphans: [...orphanBases].sort(),
  missing,
  restoredOnline: restoredOnline.length,
  perPage: Object.fromEntries(perPage),
};
console.log('\n__AUDIT_JSON__' + JSON.stringify(report));

if (failures > 0) { console.error(`\n${failures} 项审计断言失败`); process.exit(1); }
console.log('\n素材审计通过');
