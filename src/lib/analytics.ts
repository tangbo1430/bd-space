/**
 * 基础统计（PRD FR-14）：Plausible 兼容事件上报。
 * 未配置 PUBLIC_ANALYTICS_SCRIPT_URL / PUBLIC_ANALYTICS_DOMAIN 时全部 no-op，
 * 不注入任何第三方脚本（无 Cookie、无追踪降级为纯静态站）。
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

export const ANALYTICS_SCRIPT_URL = import.meta.env.PUBLIC_ANALYTICS_SCRIPT_URL ?? '';
export const ANALYTICS_DOMAIN = import.meta.env.PUBLIC_ANALYTICS_DOMAIN ?? '';

export const analyticsEnabled = Boolean(ANALYTICS_SCRIPT_URL && ANALYTICS_DOMAIN);

export type TrackEvent =
  | 'consult_click'        // 咨询入口点击（导航 CTA / Hero CTA / 浮动条）
  | 'product_view'         // 产品详情访问
  | 'case_view'            // 案例详情访问
  | 'form_submit_attempt'
  | 'form_submit_success'  // 仅服务端确认后触发
  | 'form_submit_error';

/** 客户端调用；未启用统计时静默 no-op。 */
export function track(event: TrackEvent, props?: Record<string, string>): void {
  if (!analyticsEnabled) return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // 统计失败不得影响业务功能
  }
}
