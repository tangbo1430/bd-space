/**
 * SEO 辅助：canonical / hreflang。
 * 规则（PRD FR-13 / BR-14 / AC-10）：
 *   - 每个可索引语言页使用自引用 canonical；
 *   - hreflang 双向且含自身；未发布英文页不得出现在 hreflang 中。
 *   中英文核心页双向关联；中文独有栏目仅保留中文与 x-default。
 */
export function canonicalUrl(base: string, path: string): string {
  return new URL(path, base).href;
}

export interface HreflangLink {
  lang: string;
  href: string;
}

/** 仅对已发布语言生成 hreflang；en 未发布时不会出现在结果中。 */
export function hreflangLinks(base: string, zhPath: string, published: { zh: boolean; en: boolean }): HreflangLink[] {
  const links: HreflangLink[] = [];
  if (published.zh) links.push({ lang: 'zh-CN', href: canonicalUrl(base, zhPath) });
  if (published.en) links.push({ lang: 'en', href: canonicalUrl(base, zhPath.replace(/^\/zh\//, '/en/')) });
  if (published.zh) links.push({ lang: 'x-default', href: canonicalUrl(base, zhPath) });
  return links;
}
