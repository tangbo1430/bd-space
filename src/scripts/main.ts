import { ui, isEnglish } from "../lib/translate";
/**
 * 全站交互脚本（无框架 vanilla JS）。
 * 动效降级（UI 规范 §5）：满足其一即进入静态模式——
 *   1) prefers-reduced-motion；2) saveData；3) 低性能启发式（硬件并发 ≤4 且视口 <1280）。
 */
import {
  validateInquiry,
  hasErrors,
  isSubmitSuccess,
  type InquiryField,
} from "../lib/form";
import { track } from "../lib/analytics";
import {
  BANNER_INTERVAL_MS,
  resolveBannerState,
  shouldAutoplay,
  controlsEnabled,
  resolveSwipe,
  bannerEvent,
  type BannerState,
} from "../lib/banner";

const motionParam = new URLSearchParams(window.location.search).get("motion");
// Respect reduced motion and constrained devices; an explicit URL override is retained for design review.
const motionFull = motionParam === "full";
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduced = motionPreference.matches;
const saveData =
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData === true;
const lowPower =
  (navigator.hardwareConcurrency ?? 8) <= 4 && window.innerWidth < 1280;
// Reduced mode keeps manual controls available and stops automatic motion.
const sysReduced = reduced || saveData || lowPower;
if (sysReduced && !motionFull) {
  document.documentElement.dataset.motion = "off";
}
if (motionFull) {
  document.documentElement.dataset.motion = "full";
}
const motionOff = document.documentElement.dataset.motion === "off";
// 轮播 env 用的 reducedMotion：完整动态模式下视为无偏好
let reducedForBanner = sysReduced && !motionFull;
// Preserve manual controls for all constrained motion modes.
let reducedOnly = sysReduced && !motionFull;
const carouselMotionUpdates: (() => void)[] = [];
motionPreference.addEventListener("change", (event) => {
  const off = (event.matches || saveData || lowPower) && !motionFull;
  document.documentElement.dataset.motion = off
    ? "off"
    : motionFull
      ? "full"
      : "auto";
  reducedForBanner = off;
  reducedOnly = off;
  if (off)
    document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
  carouselMotionUpdates.forEach((update) => update());
});

/* ---------- 导航：滚动收缩 ---------- */
const gnb = document.querySelector<HTMLElement>("[data-gnb]");
if (gnb) {
  const onScroll = () => gnb.classList.toggle("scrolled", window.scrollY > 80);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- 移动端抽屉 ---------- */
const drawer = document.querySelector<HTMLElement>("[data-drawer]");
const burger = document.querySelector<HTMLButtonElement>("[data-drawer-open]");
function setDrawer(open: boolean) {
  if (!drawer || !burger) return;
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  drawer.inert = !open;
  document.querySelector<HTMLElement>("main")?.toggleAttribute("inert", open);
  document.querySelector<HTMLElement>("footer")?.toggleAttribute("inert", open);
  burger.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
  if (open) drawer.querySelector<HTMLElement>("a.drawer-link, button")?.focus();
  else if (burger.getClientRects().length) burger.focus();
  else gnb?.querySelector<HTMLElement>(".logo")?.focus();
}
burger?.addEventListener("click", () => setDrawer(true));
window.matchMedia("(min-width: 1280px)").addEventListener("change", (event) => {
  if (event.matches && drawer?.classList.contains("open")) setDrawer(false);
});
drawer
  ?.querySelector("[data-drawer-close]")
  ?.addEventListener("click", () => setDrawer(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && drawer?.classList.contains("open")) {
    const focusables = Array.from(
      drawer.querySelectorAll<HTMLElement>("a[href], button, input"),
    ).filter((el) => el.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  if (e.key === "Escape" && drawer?.classList.contains("open"))
    setDrawer(false);
});
drawer
  ?.querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", () => setDrawer(false)));

/* ---------- 首屏 Banner 轮播：七态状态机（PRD v0.4 §5 / UI v1.2 D1，固定参数 BR-19） ---------- */
document.querySelectorAll<HTMLElement>("[data-carousel]").forEach((hero) => {
  const slides = Array.from(hero.querySelectorAll<HTMLElement>("[data-slide]"));
  const dots = Array.from(
    hero.querySelectorAll<HTMLButtonElement>("[data-dot]"),
  );
  const live = hero.querySelector<HTMLElement>("[data-banner-live]");
  let i = 0;
  let pendingIndex: number | null = null;
  let pendingImage: AbortController | undefined;
  let timer: number | undefined;
  let progressAnimation: Animation | undefined;
  let remaining = BANNER_INTERVAL_MS;
  let startedAt = 0;
  const bounds = hero.getBoundingClientRect();
  let inViewport = bounds.bottom > 0 && bounds.top < window.innerHeight;
  let hovering = false;
  let focused = false;
  let userPaused = false;
  let state: BannerState = resolveBannerState({
    slideCount: slides.length,
    reducedMotion: reducedForBanner,
    lowPower: false,
    reducedOnly,
    visible: !document.hidden && inViewport,
    hovering,
    focused,
  });

  const applyChrome = () => {
    // single-item / static-fallback：隐藏无意义控件（AC-17）；
    // reduced-motion 保留手动控件（不自动播放但可手动切换，主管 v1.8.2 验收口径）
    const hideControls = slides.length <= 1 || state === "static-fallback";
    dots.forEach((d) => {
      d.style.display = hideControls ? "none" : "";
    });
  };

  const stop = (reset = false) => {
    progressAnimation?.pause();
    if (timer !== undefined) {
      window.clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    }
    timer = undefined;
    if (reset) remaining = BANNER_INTERVAL_MS;
  };
  const play = () => {
    stop();
    const playing =
      shouldAutoplay(state) && !userPaused && pendingIndex === null;
    hero.classList.toggle("paused", !playing);
    // The visual timeline shares the carousel timer, including its remaining interval.
    progressAnimation?.cancel();
    progressAnimation = undefined;
    const progress = dots[i]?.querySelector<HTMLElement>(
      "[data-scene-progress]",
    );
    if (progress && !reducedForBanner && slides.length > 1) {
      progressAnimation = progress.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: BANNER_INTERVAL_MS, easing: "linear", fill: "both" },
      );
      progressAnimation.currentTime = BANNER_INTERVAL_MS - remaining;
      if (!playing) progressAnimation.pause();
    }
    if (!playing) return;
    startedAt = performance.now();
    timer = window.setTimeout(() => {
      timer = undefined;
      remaining = BANNER_INTERVAL_MS;
      show(i + 1, false);
    }, remaining);
  };

  const currentEnv = () => ({
    slideCount: slides.length,
    reducedMotion: reducedForBanner,
    lowPower: false,
    reducedOnly,
    visible: !document.hidden && inViewport,
    hovering,
    focused,
  });

  const setState = (env = currentEnv()) => {
    state = resolveBannerState(env);
    applyChrome();
    play(); // Preserve elapsed time while hidden, hovered or keyboard focused.
  };
  carouselMotionUpdates.push(() => setState());

  const announce = () => {
    if (live) live.textContent = ui(`第 ${i + 1} 张，共 ${slides.length} 张`);
  };

  const activate = (
    next: number,
    manual: boolean,
    kind?: "prev" | "next" | "dot",
  ) => {
    slides[i]?.classList.remove("on");
    slides[i]?.removeAttribute("aria-current");
    dots[i]?.classList.remove("on");
    dots[i]?.setAttribute("aria-current", "false");
    i = next;
    slides[i]?.classList.add("on");
    slides[i]?.setAttribute("aria-current", "true");
    dots[i]?.classList.add("on");
    dots[i]?.setAttribute("aria-current", "true");
    const count = hero.querySelector<HTMLElement>("[data-hero-current]");
    if (count) count.textContent = String(i + 1).padStart(2, "0");
    slides.forEach((slide, index) => {
      slide.inert = index !== i;
      slide.setAttribute("aria-hidden", String(index !== i));
      slide.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
        link.tabIndex = index === i ? 0 : -1;
      });
    });
    stop(true);
    if (manual) {
      announce(); // 仅手动切换时 polite 播报（FR-20）
      if (kind) track(bannerEvent(kind), { index: String(i + 1) });
    }
    play();
  };

  const show = (n: number, manual: boolean, kind?: "prev" | "next" | "dot") => {
    if (manual && !controlsEnabled(state)) return;
    pendingImage?.abort();
    pendingImage = undefined;
    pendingIndex = null;
    hero.removeAttribute("aria-busy");
    const next = (n + slides.length) % slides.length;
    const image = slides[next]?.querySelector<HTMLImageElement>("img");
    // Preserve the current photograph until the requested image is ready.
    if (next === i || !image || (image.complete && image.naturalWidth > 0)) {
      activate(next, manual, kind);
      return;
    }
    const request = new AbortController();
    pendingImage = request;
    pendingIndex = next;
    hero.setAttribute("aria-busy", "true");
    play();
    image.loading = "eager";
    void new Promise<boolean>((resolve) => {
      const finish = (ready: boolean) => {
        window.clearTimeout(timeout);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        request.signal.removeEventListener("abort", failed);
        resolve(ready);
      };
      const loaded = () => finish(true);
      const failed = () => finish(false);
      const timeout = window.setTimeout(failed, 15000);
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
      request.signal.addEventListener("abort", failed, { once: true });
      if (image.complete) finish(image.naturalWidth > 0);
    }).then(async (ready) => {
      if (ready) {
        try {
          await image.decode();
        } catch {
          ready = false;
        }
      }
      if (request.signal.aborted) return;
      pendingImage = undefined;
      pendingIndex = null;
      hero.removeAttribute("aria-busy");
      if (ready) activate(next, manual, kind);
      else {
        if (manual && live)
          live.textContent = ui("图片暂时无法加载，请切换其他图片。");
        stop(true);
        play();
      }
    });
  };

  dots.forEach((d, k) =>
    d.addEventListener("click", () => {
      if (k !== i || pendingIndex !== null) show(k, true, "dot");
    }),
  );

  /* v2.0.4 轮播逻辑整改（用户实机反馈「不轮播」的根因）：
   * 1) 悬停暂停收敛到控件区——整屏 Hero 画面悬停不再暂停；否则指针常态停留在
   *    首屏大图上（真实浏览的默认状态）会永久 paused-hover，表现为「从不轮播」。
   * 2) 聚焦暂停只认键盘聚焦（:focus-visible）——鼠标点击箭头/圆点后按钮持焦，
   *    若据此暂停则「手动点过一次就再也不轮播」。 */
  const controlsBox = hero.querySelector<HTMLElement>(".hero-controls");
  controlsBox?.addEventListener("mouseenter", () => {
    hovering = true;
    setState();
  });
  controlsBox?.addEventListener("mouseleave", () => {
    hovering = false;
    setState();
  });
  hero.addEventListener("focusin", () => {
    const ae = document.activeElement;
    focused = ae instanceof HTMLElement && ae.matches(":focus-visible");
    setState();
  });
  hero.addEventListener("focusout", () => {
    queueMicrotask(() => {
      const active = document.activeElement;
      focused =
        active instanceof HTMLElement &&
        hero.contains(active) &&
        active.matches(":focus-visible");
      setState();
    });
  });
  document.addEventListener("visibilitychange", () => setState());
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (inViewport === entry.isIntersecting) return;
      inViewport = entry.isIntersecting;
      setState();
    }).observe(hero);
  }

  // 触摸滑动：≥40px 且 |dx|>|dy|，pan-y 不阻断纵向滚动（D1.2）
  let touchX: number | null = null;
  let touchY: number | null = null;
  hero.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0]?.clientX ?? null;
      touchY = e.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );
  hero.addEventListener(
    "touchend",
    (e) => {
      if (touchX == null || touchY == null) return;
      const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
      const dy = (e.changedTouches[0]?.clientY ?? touchY) - touchY;
      const dir = resolveSwipe(dx, dy);
      if (dir !== 0)
        show((pendingIndex ?? i) + dir, true, dir < 0 ? "prev" : "next");
      touchX = null;
      touchY = null;
    },
    { passive: true },
  );

  hero
    .querySelector<HTMLButtonElement>("[data-carousel-pause]")
    ?.addEventListener("click", (event) => {
      userPaused = !userPaused;
      hero.classList.toggle("user-paused", userPaused);
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute("aria-pressed", String(userPaused));
      button.setAttribute(
        "aria-label",
        userPaused ? ui("恢复自动播放") : ui("暂停自动播放"),
      );
      play();
    });
  hero.addEventListener("keydown", (event) => {
    const fromScene =
      event.target instanceof Element && event.target.closest("[data-dot]");
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const next =
        ((pendingIndex ?? i) +
          (event.key === "ArrowRight" ? 1 : -1) +
          slides.length) %
        slides.length;
      show(next, true);
      if (fromScene) dots[next]?.focus({ preventScroll: true });
    } else if (fromScene && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : slides.length - 1;
      show(next, true);
      dots[next]?.focus({ preventScroll: true });
    }
  });
  slides.forEach((slide, index) => {
    slide.inert = index !== 0;
    slide.setAttribute("aria-hidden", String(index !== 0));
  });
  show(0, false);
  setState();
});

/* ---------- 「关于我们」子导航（v1.3 页头一体化导航带，hover/focus 展示） ----------
 * 职责分离（v0.4.1）：一级「关于我们」为纯链接，本脚本不绑定任何点击/按键展开逻辑，
 * 只渐进增强打开/关闭时序与安全走廊；绝不 preventDefault 一级链接（BR-23.2）。
 * 定参（v1.3 N4，开发不自造）：指针打开 100ms / 关闭 300ms 单计时器 /
 * 12px 连接层 / 意图走廊 ≈160×128px；键盘 focus 即时打开。
 */
document.querySelectorAll<HTMLElement>("[data-subnav]").forEach((box) => {
  const trigger = box.querySelector<HTMLElement>("[data-sub-trigger]");
  const panel = box.querySelector<HTMLElement>("[data-sub-panel]");
  const gnb = box.closest<HTMLElement>(".gnb");
  if (!trigger || !panel || !gnb) return;

  let openTimer: number | undefined;
  let closeTimer: number | undefined;
  let pointerOpened = false;
  let lastY = 0;

  const clearTimers = () => {
    if (openTimer) {
      window.clearTimeout(openTimer);
      openTimer = undefined;
    }
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  };
  const open = (immediate: boolean) => {
    window.clearTimeout(closeTimer ?? 0);
    closeTimer = undefined;
    if (box.classList.contains("open")) return;
    if (immediate) {
      box.classList.add("open");
      return;
    }
    if (openTimer) return; // 单一计时器（AC-37）
    openTimer = window.setTimeout(() => {
      box.classList.add("open");
      openTimer = undefined;
    }, 100);
  };
  const scheduleClose = () => {
    if (openTimer) {
      window.clearTimeout(openTimer);
      openTimer = undefined;
    }
    if (closeTimer) return;
    closeTimer = window.setTimeout(() => {
      box.classList.remove("open");
      pointerOpened = false;
      closeTimer = undefined;
    }, 300);
  };

  /* 安全走廊（意图三角 ≈160×128px，v1.4 M4）：指针沿「一级项右缘 → 面板顶边」方向
     朝面板移动时即使短暂离开组命中区也不关闭；不使用覆盖 Hero 的巨型遮罩。 */
  let corridor: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    w: number;
  } | null = null;
  const buildCorridor = () => {
    const t = trigger.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    corridor = {
      x1: t.right,
      y1: t.bottom,
      x2: p.left,
      y2: p.top,
      w: Math.max(p.width, 160),
    };
  };
  const inCorridor = (x: number, y: number): boolean => {
    if (!corridor) return false;
    const { y1, y2, w } = corridor;
    if (y < y1 - 2 || y > y2 + 6) return false;
    const t = (y - y1) / Math.max(y2 - y1, 1);
    const panelCenter = corridor.x2 + w / 2;
    const cx = corridor.x1 + (panelCenter - corridor.x1) * t;
    return Math.abs(x - cx) <= w / 2;
  };

  box.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return; // 触屏不依赖 hover（BR-23.3）
    buildCorridor();
    pointerOpened = true;
    open(false);
  });
  box.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!pointerOpened) return;
    // 指针在组内移动时已记录轨迹；离开时若在走廊内且方向朝面板，保持开启
    if (corridor && inCorridor(e.clientX, e.clientY) && e.clientY > lastY)
      return;
    scheduleClose();
  });
  box.addEventListener("pointermove", (e) => {
    lastY = e.clientY;
    if (
      pointerOpened &&
      closeTimer &&
      corridor &&
      inCorridor(e.clientX, e.clientY)
    ) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  });
  // 面板/连接层回到命中区：取消关闭
  panel.addEventListener("pointerenter", () => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  });

  // 键盘 focus 即时打开（AC-38），移出组即关；Escape 关闭并焦点返回一级链接。
  // 注意：:focus-within CSS 回退会因焦点返回触发器而重新展开，故 Escape 后挂
  // data-suppress 标记，待焦点真正移出组后解除。
  const clearSuppress = () => {
    if (box.hasAttribute("data-suppress")) {
      box.removeAttribute("data-suppress");
      if (box.contains(document.activeElement)) box.classList.add("open");
    }
  };
  box.addEventListener("focusin", () => {
    if (!box.hasAttribute("data-suppress")) open(true);
  });
  box.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!box.contains(document.activeElement)) {
        clearTimers();
        box.classList.remove("open");
        pointerOpened = false;
        clearSuppress();
      }
    }, 0);
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.classList.contains("open")) {
      e.preventDefault();
      clearTimers();
      box.classList.remove("open");
      pointerOpened = false;
      box.setAttribute("data-suppress", "");
      trigger.focus();
    }
  });
  // 点击外部即时关闭，不阻断外部目标（AC-39）；子项点击 = 普通链接导航，不拦截
  document.addEventListener("click", (e) => {
    if (box.classList.contains("open") && !box.contains(e.target as Node)) {
      clearTimers();
      box.classList.remove("open");
      pointerOpened = false;
    }
  });
});

/* 移动抽屉：文字链接 + 独立展开按钮（AC-40）；当前属 about 组时默认展开（AC-41，无 JS 时平铺可见） */
document
  .querySelectorAll<HTMLElement>("[data-subnav-mobile]")
  .forEach((box) => {
    const btn = box.querySelector<HTMLButtonElement>(
      "[data-sub-trigger-mobile]",
    );
    const defaultOpen = box.dataset.defaultOpen === "true";
    box.classList.toggle("open", defaultOpen);
    btn?.addEventListener("click", () => {
      const openNow = !box.classList.contains("open");
      box.classList.toggle("open", openNow);
      btn.setAttribute("aria-expanded", String(openNow));
      btn.setAttribute(
        "aria-label",
        openNow ? ui("收起关于我们子导航") : ui("展开关于我们子导航"),
      );
    });
  });

/* ---------- 招聘页：筛选 / 展开 / 申请提示（FR-29~32） ---------- */
const jobsRoot = document.querySelector<HTMLElement>("[data-jobs]");
if (jobsRoot) {
  const jobs = Array.from(jobsRoot.querySelectorAll<HTMLElement>("[data-job]"));
  const chips = Array.from(
    jobsRoot.querySelectorAll<HTMLButtonElement>("[data-chip-group]"),
  );
  const clearBtn = jobsRoot.querySelector<HTMLButtonElement>(
    "[data-clear-filters]",
  );
  const noResult = jobsRoot.querySelector<HTMLElement>("[data-no-result]");
  const selected: Record<string, string> = {
    department: "all",
    location: "all",
  };

  const applyFilters = () => {
    let shown = 0;
    jobs.forEach((job) => {
      const match =
        (selected.department === "all" ||
          job.dataset.department === selected.department) &&
        (selected.location === "all" ||
          job.dataset.location === selected.location);
      job.style.display = match ? "" : "none";
      if (match) shown++;
    });
    if (noResult) noResult.hidden = shown > 0;
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.dataset.chipGroup ?? "";
      selected[group] = chip.dataset.chipValue ?? "all";
      chips
        .filter((c) => c.dataset.chipGroup === group)
        .forEach((c) => {
          const on = c === chip;
          c.classList.toggle("on", on);
          c.setAttribute("aria-pressed", String(on));
        });
      track("job_filter", { group, value: selected[group] });
      applyFilters();
    });
  });

  clearBtn?.addEventListener("click", () => {
    selected.department = "all";
    selected.location = "all";
    chips.forEach((c) => {
      const on = c.dataset.chipValue === "all";
      c.classList.toggle("on", on);
      c.setAttribute("aria-pressed", String(on));
    });
    applyFilters();
  });

  // 职位展开（多职位独立，aria-expanded 暴露状态）
  jobsRoot
    .querySelectorAll<HTMLButtonElement>("[data-job-toggle]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const job = btn.closest<HTMLElement>("[data-job]");
        if (!job) return;
        const open = !job.classList.contains("open");
        job.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        if (open) track("job_expand", { job: job.dataset.job ?? "" });
      });
    });

  // mailto 申请：仅提示将打开邮件客户端，永不显示“申请成功”（BR-28/AC-31）
  const mailToast = document.querySelector<HTMLElement>("[data-mail-toast]");
  jobsRoot.querySelectorAll<HTMLAnchorElement>("[data-apply]").forEach((a) => {
    a.addEventListener("click", () => {
      track("apply_click", { job: a.dataset.apply ?? "" });
      if (mailToast) {
        mailToast.classList.add("show");
        window.setTimeout(() => mailToast.classList.remove("show"), 2400);
      }
    });
  });
}

/* ---------- 分区进入渐显 ---------- */
const rvEls = document.querySelectorAll<HTMLElement>(".rv");
// Stagger siblings only; sections still follow the reader's native scroll pace.
rvEls.forEach((el) => {
  const siblings = Array.from(el.parentElement?.children ?? []).filter((item) =>
    item.classList.contains("rv"),
  );
  const index = siblings.indexOf(el);
  if (index > 0)
    el.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 60}ms`);
});
if (motionOff || !("IntersectionObserver" in window)) {
  rvEls.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  rvEls.forEach((el) => io.observe(el));
}

/* ---------- 统计：咨询入口点击 ---------- */
document.querySelectorAll('[data-track="consult_click"]').forEach((el) => {
  el.addEventListener("click", () =>
    track("consult_click", { path: window.location.pathname }),
  );
});
// Banner CTA 单独事件（FR-32），不重复发 consult_click 以外的语义
document.querySelectorAll("[data-banner-cta]").forEach((el) => {
  el.addEventListener("click", () =>
    track("banner_cta", { path: window.location.pathname }),
  );
});
// 关于我们子项访问（FR-32）
document.querySelectorAll('[data-track="about_sub_click"]').forEach((el) => {
  el.addEventListener("click", () =>
    track("about_sub_click", {
      to: (el as HTMLAnchorElement).getAttribute("href") ?? "",
    }),
  );
});

/* ---------- 咨询表单 ---------- */
document
  .querySelectorAll<HTMLFormElement>("form[data-consult-form]")
  .forEach((form) => {
    const enabled = form.dataset.enabled === "true";
    const banner = form.querySelector<HTMLElement>("[data-form-banner]");
    const submitBtn = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    );
    const submitText = form.querySelector<HTMLElement>("[data-submit-text]");
    const successBox = form
      .closest("[data-form-root]")
      ?.querySelector<HTMLElement>("[data-form-success]");
    const sourceField = form.querySelector<HTMLInputElement>(
      "[data-source-field]",
    );
    if (sourceField) sourceField.value = window.location.pathname;

    const showFieldError = (field: string, message?: string) => {
      const box = form.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (!box) return;
      box.classList.toggle("err", Boolean(message));
      const msg = box.querySelector<HTMLElement>("[data-msg]");
      if (msg) msg.textContent = ui(message ?? "");
      box
        .querySelector<HTMLElement>("input, textarea")
        ?.setAttribute("aria-invalid", String(Boolean(message)));
    };

    // 输入时清除对应错误
    form.querySelectorAll("input, textarea").forEach((el) => {
      el.addEventListener("input", () => {
        const box = el.closest("[data-field]");
        if (box instanceof HTMLElement) showFieldError(box.dataset.field ?? "");
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!enabled || !submitBtn || submitBtn.disabled) return;

      const data = new FormData(form);
      const input = {
        name: String(data.get("name") ?? ""),
        company: String(data.get("company") ?? ""),
        contact: String(data.get("contact") ?? ""),
        location: String(data.get("location") ?? ""),
        message: String(data.get("message") ?? ""),
        agree: data.get("agree") === "on",
        honeypot: String(data.get("bd_website") ?? ""),
        source: window.location.pathname,
      };

      const errors = validateInquiry(input, isEnglish());
      (["name", "contact", "message", "agree"] as InquiryField[]).forEach((f) =>
        showFieldError(f, errors.fieldErrors[f]),
      );
      if (hasErrors(errors)) {
        if (errors.spam) return; // 静默拦截机器人，不上报不提示
        banner?.classList.remove("show");
        const firstErr = form.querySelector<HTMLElement>(
          ".field.err input, .field.err textarea, .agree.err input",
        );
        firstErr?.focus();
        return;
      }

      // 提交中：禁用防重复 + 文案变更
      submitBtn.disabled = true;
      if (submitText) submitText.textContent = ui("提交中…");
      banner?.classList.remove("show");
      track("form_submit_attempt", { source: input.source });

      try {
        const payload = new FormData(form);
        payload.delete("bd_website");
        if (form.dataset.accessKey)
          payload.set("access_key", form.dataset.accessKey);
        const res = await fetch(form.dataset.endpoint ?? "", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: payload,
        });
        // 失败闭合：仅 HTTP 2xx 且 JSON {success:true} 才展示成功态（BR-10），
        // 非 JSON / 缺 success / success 非 true 一律进入失败分支并保留输入
        const ok = await isSubmitSuccess(res);
        if (ok) {
          track("form_submit_success", { source: input.source });
          form.hidden = true;
          if (successBox) {
            successBox.hidden = false;
            successBox.setAttribute("tabindex", "-1");
            successBox.focus();
          }
        } else {
          throw new Error(`submit failed: ${res.status}`);
        }
      } catch {
        // 失败：保留已填输入，顶部错误条提示重试
        track("form_submit_error", { source: input.source });
        if (banner) {
          banner.textContent = ui(
            "提交未成功：网络或服务异常，请稍后重试；您填写的内容已保留。也可直接通过电话/邮箱联系我们。",
          );
          banner.classList.add("show");
        }
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = ui("提交留言");
      }
    });
  });
