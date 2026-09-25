import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, LEGAL_LINKS, DEFAULT_LOCALE, LOCALES } from '../src/lib/routes';
import { hreflangLinks, canonicalUrl } from '../src/lib/seo';

describe('全局路由清单（PRD §5：7 个一级栏目）', () => {
  it('恰好 7 个一级栏目且均为 /zh/ 前缀', () => {
    expect(NAV_ITEMS).toHaveLength(7);
    for (const item of NAV_ITEMS) {
      expect(item.href.startsWith('/zh/')).toBe(true);
    }
  });

  it('栏目 key 与文案完整', () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual([
      'home', 'about', 'products', 'cases', 'qualifications', 'news', 'contact',
    ]);
    for (const item of NAV_ITEMS) expect(item.label.length).toBeGreaterThan(0);
  });

  it('href 无重复（避免导航重复指向）', () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('语言前缀固定为 zh/en，默认中文', () => {
    expect(LOCALES).toEqual(['zh', 'en']);
    expect(DEFAULT_LOCALE).toBe('zh');
  });

  it('法务页面提供路由（仅模板，不编造正文）', () => {
    expect(LEGAL_LINKS.map((l) => l.href)).toEqual(['/zh/privacy/', '/zh/cookies/']);
  });
});

describe('SEO 规则（AC-10 / BR-14）', () => {
  const base = 'https://example.com';

  it('canonical 为自引用绝对地址', () => {
    expect(canonicalUrl(base, '/zh/about/')).toBe('https://example.com/zh/about/');
  });

  it('英文未发布时 hreflang 仅含 zh-CN 自引用与 x-default，不含 en', () => {
    const links = hreflangLinks(base, '/zh/', { zh: true, en: false });
    expect(links.map((l) => l.lang)).toEqual(['zh-CN', 'x-default']);
    expect(links.every((l) => !l.href.includes('/en/'))).toBe(true);
  });

  it('英文发布后 hreflang 双向且含自身', () => {
    const links = hreflangLinks(base, '/zh/about/', { zh: true, en: true });
    expect(links.map((l) => l.lang)).toEqual(['zh-CN', 'en', 'x-default']);
    expect(links.find((l) => l.lang === 'en')?.href).toBe('https://example.com/en/about/');
  });
});
