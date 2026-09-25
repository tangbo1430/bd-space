import type { APIRoute } from 'astro';

/** robots.txt：由构建期 site 配置生成，指向站点地图。 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const sitemap = new URL('/sitemap-index.xml', base).href;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /en/\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
