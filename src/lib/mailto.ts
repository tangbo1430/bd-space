/**
 * 招聘邮箱与 mailto 构造（PRD v0.4 FR-31 / BR-27/28 / AC-30/31）。
 * 邮箱缺失或格式无效时不生成 mailto（调用方渲染「招聘邮箱待提供」置灰态，DOM 无链接）。
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string | undefined | null): boolean {
  if (!value) return false;
  return EMAIL.test(value.trim());
}

export interface MailtoParts {
  to: string;
  subject: string;
  body: string;
}

/** 仅在邮箱有效时返回 mailto:；否则返回 null（不得输出空地址或无效链接）。 */
export function buildMailto(parts: MailtoParts): string | null {
  const to = parts.to.trim();
  if (!isValidEmail(to)) return null;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(parts.subject)}&body=${encodeURIComponent(parts.body)}`;
}

/** 招聘申请 mailto 约定：主题含职位名称，正文预填职位与来源页面（不含个人信息）。 */
export function buildJobApplyMailto(email: string, jobTitle: string, sourcePath: string): string | null {
  return buildMailto({
    to: email,
    subject: `应聘：${jobTitle}`,
    body: `应聘职位：${jobTitle}\n来源页面：${sourcePath}\n\n（请在此处补充您的自我介绍与联系方式）`,
  });
}
