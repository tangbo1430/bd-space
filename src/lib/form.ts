/**
 * 咨询表单校验（前端侧，与服务端口径一致）。
 * 表单口径（Leader 统一结论）：
 *   必填：称呼、联系方式（手机或邮箱至少一种有效格式）、咨询内容、隐私同意
 *   选填：企业名称、项目所在地
 * 规则：
 *   - 失败必须保留已填输入；仅服务端确认发送成功才能展示成功态（BR-10）。
 *   - honeypot 字段（bd_website）非空视为机器人提交，直接拦截（基础防滥用）。
 */

export interface InquiryInput {
  name: string;
  company?: string;
  contact: string;
  location?: string;
  message: string;
  agree: boolean;
  /** honeypot：正常用户不可见，应保持为空 */
  honeypot?: string;
  /** 来源页面路径 */
  source?: string;
}

export type InquiryField = 'name' | 'contact' | 'message' | 'agree';

export interface InquiryErrors {
  fieldErrors: Partial<Record<InquiryField, string>>;
  /** honeypot 命中时整体拦截 */
  spam: boolean;
}

const CN_MOBILE = /^1[3-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { name: 50, company: 100, contact: 100, location: 100, message: 1000 } as const;

export function isValidContact(value: string): boolean {
  const v = value.trim();
  return CN_MOBILE.test(v) || EMAIL.test(v);
}

export function validateInquiry(input: InquiryInput): InquiryErrors {
  const fieldErrors: Partial<Record<InquiryField, string>> = {};

  const name = input.name.trim();
  if (!name) fieldErrors.name = '请填写您的称呼';
  else if (name.length > MAX_LEN.name) fieldErrors.name = `称呼不超过 ${MAX_LEN.name} 字`;

  const contact = input.contact.trim();
  if (!contact) fieldErrors.contact = '请填写手机号或邮箱';
  else if (contact.length > MAX_LEN.contact) fieldErrors.contact = `联系方式不超过 ${MAX_LEN.contact} 字`;
  else if (!isValidContact(contact)) fieldErrors.contact = '请输入有效的手机号或邮箱';

  const message = input.message.trim();
  if (!message) fieldErrors.message = '请填写咨询内容';
  else if (message.length > MAX_LEN.message) fieldErrors.message = `咨询内容不超过 ${MAX_LEN.message} 字`;

  if (!input.agree) fieldErrors.agree = '请阅读并同意《隐私政策》';

  return { fieldErrors, spam: Boolean(input.honeypot && input.honeypot.trim()) };
}

export function hasErrors(errors: InquiryErrors): boolean {
  return errors.spam || Object.keys(errors.fieldErrors).length > 0;
}

/**
 * 表单启用判定：端点与有效 access key 均满足才允许提交（BR-16）。
 * 仅有端点而无 key 时保持禁用态，不发出无法识别的真实提交。
 */
export function isFormEnabled(endpoint: string | undefined | null, accessKey: string | undefined | null): boolean {
  return Boolean(endpoint?.trim()) && Boolean(accessKey?.trim());
}

/**
 * 提交结果判定（失败闭合，BR-10）：
 * 仅当 HTTP 2xx 且响应为 JSON 且 success === true 才视为服务端确认成功；
 * 非 JSON 响应、缺少 success 字段或 success 非 true 一律判定失败，由调用方保留输入并提示重试。
 */
export async function isSubmitSuccess(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return false; // 响应非 JSON：无法确认服务端接收，失败闭合
  }
  return (
    typeof json === 'object' &&
    json !== null &&
    (json as { success?: unknown }).success === true
  );
}
