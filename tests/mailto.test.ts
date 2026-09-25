import { describe, it, expect } from 'vitest';
import { isValidEmail, buildMailto, buildJobApplyMailto } from '../src/lib/mailto';

describe('招聘邮箱有效性（BR-27/AC-30）', () => {
  it('有效邮箱通过', () => {
    expect(isValidEmail('hr@banda.example.com')).toBe(true);
  });
  it('缺失/占位/无效一律拒绝', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail('【待提供】')).toBe(false);
    expect(isValidEmail('hr@')).toBe(false);
    expect(isValidEmail('  ')).toBe(false);
  });
});

describe('mailto 构造（失败闭合，不生成无效链接）', () => {
  it('邮箱有效时生成含职位名称主题与预填正文', () => {
    const url = buildJobApplyMailto('hr@banda.example.com', '结构工程师', '/zh/about/careers/');
    expect(url).toMatch(/^mailto:/);
    expect(url).toContain(encodeURIComponent('应聘：结构工程师'));
    expect(url).toContain(encodeURIComponent('/zh/about/careers/'));
  });
  it('邮箱无效或缺失时返回 null（DOM 不生成 mailto）', () => {
    expect(buildJobApplyMailto('', '职位', '/zh/about/careers/')).toBeNull();
    expect(buildJobApplyMailto('【待提供】', '职位', '/zh/about/careers/')).toBeNull();
    expect(buildJobApplyMailto('not-an-email', '职位', '/zh/about/careers/')).toBeNull();
  });
  it('buildMailto 正确编码主题与正文', () => {
    const url = buildMailto({ to: 'a@b.co', subject: '主题 含空格', body: '第一行\n第二行' });
    expect(url).toContain('subject=' + encodeURIComponent('主题 含空格'));
    expect(url).toContain('body=' + encodeURIComponent('第一行\n第二行'));
  });
});
