import { describe, it, expect } from 'vitest';
import {
  resolveBannerState,
  shouldAutoplay,
  controlsEnabled,
  resolveSwipe,
  BANNER_INTERVAL_MS,
  BANNER_TRANSITION_MS,
  BANNER_SWIPE_THRESHOLD_PX,
  type BannerEnv,
} from '../src/lib/banner';

const env = (over: Partial<BannerEnv> = {}): BannerEnv => ({
  slideCount: 3,
  reducedMotion: false,
  lowPower: false,
  visible: true,
  hovering: false,
  focused: false,
  ...over,
});

describe('Banner 七态状态机（PRD v0.4 §5 / UI v1.2 D1）', () => {
  it('固定参数与设计标注一致（BR-19）', () => {
    expect(BANNER_INTERVAL_MS).toBe(6000);
    expect(BANNER_TRANSITION_MS).toBe(1200);
    expect(BANNER_SWIPE_THRESHOLD_PX).toBe(40);
  });

  it('playing：多项 + 可见 + 无暂停/降级', () => {
    const s = resolveBannerState(env());
    expect(s).toBe('playing');
    expect(shouldAutoplay(s)).toBe(true);
  });

  it('paused-hover / paused-focus：悬停或聚焦暂停，手动控件可用', () => {
    const h = resolveBannerState(env({ hovering: true }));
    expect(h).toBe('paused-hover');
    expect(shouldAutoplay(h)).toBe(false);
    expect(controlsEnabled(h)).toBe(true);
    const f = resolveBannerState(env({ focused: true }));
    expect(f).toBe('paused-focus');
    expect(shouldAutoplay(f)).toBe(false);
  });

  it('paused-hidden：标签页不可见停止计时，优先级高于 hover/focus', () => {
    const s = resolveBannerState(env({ visible: false, hovering: true, focused: true }));
    expect(s).toBe('paused-hidden');
    expect(shouldAutoplay(s)).toBe(false);
    expect(controlsEnabled(s)).toBe(false);
  });

  it('reduced-motion：不自动播放，手动切换保留', () => {
    const s = resolveBannerState(env({ reducedMotion: true }));
    expect(s).toBe('reduced-motion');
    expect(shouldAutoplay(s)).toBe(false);
    expect(controlsEnabled(s)).toBe(true);
  });

  it('static-fallback：低性能降级优先于一切，仅静态首帧', () => {
    const s = resolveBannerState(env({ lowPower: true, reducedMotion: true }));
    expect(s).toBe('static-fallback');
    expect(shouldAutoplay(s)).toBe(false);
    expect(controlsEnabled(s)).toBe(false);
  });

  it('single-item：单帧不轮播且控件隐藏', () => {
    const s = resolveBannerState(env({ slideCount: 1 }));
    expect(s).toBe('single-item');
    expect(shouldAutoplay(s)).toBe(false);
  });
});

describe('触摸滑动阈值（D1.2：≥40px 且 |dx|>|dy|）', () => {
  it('横向 40px 以上触发方向', () => {
    expect(resolveSwipe(-41, 10)).toBe(1); // 左滑 → 下一张
    expect(resolveSwipe(41, 10)).toBe(-1); // 右滑 → 上一张
  });
  it('不足 40px 回弹当前项', () => {
    expect(resolveSwipe(-39, 0)).toBe(0);
    expect(resolveSwipe(39, 0)).toBe(0);
  });
  it('纵向位移占优时不触发（不阻断纵向滚动）', () => {
    expect(resolveSwipe(-60, 80)).toBe(0);
    expect(resolveSwipe(-60, -60)).toBe(0);
  });
});
