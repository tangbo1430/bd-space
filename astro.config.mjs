// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// 站点绝对地址用于 canonical / sitemap / robots；部署前必须配置 PUBLIC_SITE_URL
const site = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';

// 构建版本证据：提交 SHA + 构建时间，注入 /version.json 与页面 meta，便于预览链路核对
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch { /* 非 git 环境 */ }
const builtAt = new Date().toISOString();

/** 构建结束时把版本证据写到产物根 */
function versionEvidence() {
  return {
    name: 'version-evidence',
    hooks: {
      'astro:build:done': (/** @type {{ dir: URL }} */ { dir }) => {
        const out = new URL('version.json', dir);
        writeFileSync(out, JSON.stringify({ commit, builtAt, site }, null, 2));
      },
    },
  };
}

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // /en/ 为未发布预留态、404 为错误页：不进入站点地图（PRD FR-13 / AC-10）
      filter: (page) => !page.includes('/en/') && !page.includes('/404'),
    }),
    versionEvidence(),
  ],
  vite: {
    define: {
      __BUILD_COMMIT__: JSON.stringify(commit),
      __BUILD_TIME__: JSON.stringify(builtAt),
    },
  },
});
