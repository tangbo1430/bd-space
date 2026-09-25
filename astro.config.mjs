// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 站点绝对地址用于 canonical / sitemap / robots；部署前必须配置 PUBLIC_SITE_URL
const site = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // /en/ 为未发布预留态、404 为错误页：不进入站点地图（PRD FR-13 / AC-10）
      filter: (page) => !page.includes('/en/') && !page.includes('/404'),
    }),
  ],
});
