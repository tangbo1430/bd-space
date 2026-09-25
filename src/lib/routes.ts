/**
 * 全局路由清单（单一来源）。
 * 7 个一级栏目以 PRD §5 信息架构为基线；语言前缀 /zh/，/en/ 为未发布预留态。
 */

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

/** 7 个一级栏目（首页 / 关于 / 产品 / 案例 / 资质 / 新闻 / 联系） */
export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', href: '/zh/' },
  { key: 'about', label: '关于我们', href: '/zh/about/' },
  { key: 'products', label: '产品中心', href: '/zh/products/' },
  { key: 'cases', label: '工程案例', href: '/zh/cases/' },
  { key: 'qualifications', label: '资质能力', href: '/zh/qualifications/' },
  { key: 'news', label: '新闻资讯', href: '/zh/news/' },
  { key: 'contact', label: '联系我们', href: '/zh/contact/' },
];

/** 「关于我们」二级导航（PRD v0.4 §3.2 / UI v1.2 D3，桌面与移动同一 IA） */
export interface AboutSubItem extends NavItem {
  /** 精确路径匹配用 key 前缀 */
  matchPrefix: string;
}

export const ABOUT_SUB_ITEMS: AboutSubItem[] = [
  { key: 'about', label: '公司介绍', href: '/zh/about/', matchPrefix: '/zh/about/' },
  { key: 'investors', label: '投资者关系', href: '/zh/about/investors/', matchPrefix: '/zh/about/investors/' },
  { key: 'careers', label: '人才招聘', href: '/zh/about/careers/', matchPrefix: '/zh/about/careers/' },
];

/**
 * 当前子项判定：长前缀优先（/zh/about/investors/ 不会误判为 about）。
 * pathname 为当前页路径。
 */
export function currentAboutSub(pathname: string): string | null {
  const sorted = [...ABOUT_SUB_ITEMS].sort((a, b) => b.matchPrefix.length - a.matchPrefix.length);
  for (const item of sorted) {
    if (item.key === 'about') {
      if (pathname === '/zh/about/' || pathname === '/zh/about') return item.key;
    } else if (pathname.startsWith(item.matchPrefix)) {
      return item.key;
    }
  }
  return null;
}

export const LEGAL_LINKS: NavItem[] = [
  { key: 'privacy', label: '隐私政策', href: '/zh/privacy/' },
  { key: 'cookies', label: 'Cookie 政策', href: '/zh/cookies/' },
];

/** 未发布语言提示（BR-09：不提供指向空英文页的入口） */
export const EN_COMING_SOON = '英文版筹备中';
