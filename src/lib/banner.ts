/**
 * Banner 轮播状态机（PRD v0.4 §5 / UI v1.2 D1）。
 * 参数由设计 v1.2 固定标注，开发不得产生第二套参数（BR-19）。
 */
import type { TrackEvent } from './analytics';

export const BANNER_INTERVAL_MS = 6000;
export const BANNER_TRANSITION_MS = 1200;
export const BANNER_SWIPE_THRESHOLD_PX = 40;

export const BANNER_STATES = [
  'playing',
  'paused-hover',
  'paused-focus',
  'paused-hidden',
  'reduced-motion',
  'static-fallback',
  'single-item',
] as const;
export type BannerState = (typeof BANNER_STATES)[number];

export interface BannerEnv {
  slideCount: number;
  reducedMotion: boolean;
  /** 低性能降级（saveData / 低性能启发式），见 v1.2 D2 降级开关 */
  lowPower: boolean;
  visible: boolean;
  hovering: boolean;
  focused: boolean;
}

export function resolveBannerState(env: BannerEnv): BannerState {
  if (env.lowPower) return 'static-fallback';
  if (env.reducedMotion) return 'reduced-motion';
  if (env.slideCount <= 1) return 'single-item';
  if (!env.visible) return 'paused-hidden';
  if (env.hovering) return 'paused-hover';
  if (env.focused) return 'paused-focus';
  return 'playing';
}

/** 自动轮播仅在 playing 状态运行（BR-19）。 */
export function shouldAutoplay(state: BannerState): boolean {
  return state === 'playing';
}

/** 手动控件（箭头/指示器/滑动）在这些状态下可用。 */
export function controlsEnabled(state: BannerState): boolean {
  return state === 'playing' || state === 'paused-hover' || state === 'paused-focus' || state === 'reduced-motion';
}

/**
 * 触摸滑动判定（D1.2）：水平位移 ≥40px 且 |dx|>|dy| 才触发切换，否则回弹。
 * 返回 -1（上一张）/ 1（下一张）/ 0（不触发）。
 */
export function resolveSwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < BANNER_SWIPE_THRESHOLD_PX) return 0;
  if (Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** 手动切换对应统计事件（FR-32，无事件名自造）。 */
export function bannerEvent(kind: 'prev' | 'next' | 'dot'): TrackEvent {
  return kind === 'prev' ? 'banner_prev' : kind === 'next' ? 'banner_next' : 'banner_dot';
}
