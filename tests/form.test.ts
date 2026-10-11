import { describe, it, expect } from 'vitest';
import {
  validateInquiry,
  hasErrors,
  isValidContact,
  isFormEnabled,
  isSubmitSuccess,
  type InquiryInput,
} from '../src/lib/form';

const base: InquiryInput = {
  name: '张先生',
  contact: '13800138000',
  message: '想咨询叠合板供货',
  agree: true,
};

describe('表单校验：统一口径（称呼/联系方式/内容/同意必填，企业/所在地选填）', () => {
  it('合法输入通过', () => {
    expect(hasErrors(validateInquiry(base))).toBe(false);
  });

  it('选填字段为空仍通过', () => {
    expect(hasErrors(validateInquiry({ ...base, company: '', location: '' }))).toBe(false);
  });

  it('称呼必填', () => {
    const r = validateInquiry({ ...base, name: '  ' });
    expect(r.fieldErrors.name).toBeTruthy();
  });

  it('联系方式必填且需为手机或邮箱', () => {
    expect(validateInquiry({ ...base, contact: '' }).fieldErrors.contact).toBeTruthy();
    expect(validateInquiry({ ...base, contact: 'abc@' }).fieldErrors.contact).toBeTruthy();
    expect(validateInquiry({ ...base, contact: '123' }).fieldErrors.contact).toBeTruthy();
    expect(hasErrors(validateInquiry({ ...base, contact: 'user@example.com' }))).toBe(false);
    expect(hasErrors(validateInquiry({ ...base, contact: '13912345678' }))).toBe(false);
  });

  it('咨询内容必填', () => {
    expect(validateInquiry({ ...base, message: '' }).fieldErrors.message).toBeTruthy();
  });

  it('隐私同意必选', () => {
    expect(validateInquiry({ ...base, agree: false }).fieldErrors.agree).toBeTruthy();
  });

  it('honeypot 非空视为机器人并整体拦截', () => {
    const r = validateInquiry({ ...base, honeypot: 'spam' });
    expect(r.spam).toBe(true);
    expect(hasErrors(r)).toBe(true);
  });

  it('超长输入被拦截', () => {
    expect(validateInquiry({ ...base, name: 'a'.repeat(51) }).fieldErrors.name).toBeTruthy();
    expect(validateInquiry({ ...base, message: 'a'.repeat(1001) }).fieldErrors.message).toBeTruthy();
  });
});

describe('联系方式格式', () => {
  it('中国大陆手机号', () => {
    expect(isValidContact('13800138000')).toBe(true);
    expect(isValidContact('23800138000')).toBe(false);
  });
  it('邮箱', () => {
    expect(isValidContact('a.b+c@corp.example.cn')).toBe(true);
    expect(isValidContact('no-at-symbol')).toBe(false);
  });
});

describe('表单启用判定（端点与 key 均满足才允许提交，BR-16）', () => {
  it('端点与 key 均有效时启用', () => {
    expect(isFormEnabled('https://api.web3forms.com/submit', 'key-123')).toBe(true);
  });
  it('仅端点无 key 时禁用（默认模板不得放行提交）', () => {
    expect(isFormEnabled('https://api.web3forms.com/submit', '')).toBe(false);
    expect(isFormEnabled('https://api.web3forms.com/submit', '   ')).toBe(false);
  });
  it('无端点或端点为空白时禁用', () => {
    expect(isFormEnabled('', 'key-123')).toBe(false);
    expect(isFormEnabled(undefined, 'key-123')).toBe(false);
    expect(isFormEnabled(null, null)).toBe(false);
  });
});

describe('提交结果判定（失败闭合，BR-10）', () => {
  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  it('2xx + success:true 才判定成功', async () => {
    expect(await isSubmitSuccess(jsonResponse(200, { success: true }))).toBe(true);
  });
  it('2xx 但 success:false / 缺 success 字段 → 失败', async () => {
    expect(await isSubmitSuccess(jsonResponse(200, { success: false }))).toBe(false);
    expect(await isSubmitSuccess(jsonResponse(200, { message: 'ok' }))).toBe(false);
    expect(await isSubmitSuccess(jsonResponse(200, {}))).toBe(false);
  });
  it('2xx 但响应非 JSON → 失败（不以 HTTP 状态冒充成功）', async () => {
    const res = new Response('<html>OK</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    expect(await isSubmitSuccess(res)).toBe(false);
  });
  it('非 2xx → 失败', async () => {
    expect(await isSubmitSuccess(jsonResponse(500, { success: true }))).toBe(false);
    expect(await isSubmitSuccess(jsonResponse(403, { success: false }))).toBe(false);
  });
});
