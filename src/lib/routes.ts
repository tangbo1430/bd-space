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

export const LEGAL_LINKS: NavItem[] = [
  { key: 'privacy', label: '隐私政策', href: '/zh/privacy/' },
  { key: 'cookies', label: 'Cookie 政策', href: '/zh/cookies/' },
];

/** 未发布语言提示（BR-09：不提供指向空英文页的入口） */
export const EN_COMING_SOON = '英文版筹备中';
