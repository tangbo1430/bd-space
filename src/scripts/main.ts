/**
 * 全站交互脚本（无框架 vanilla JS）。
 * 动效降级（UI 规范 §5）：满足其一即进入静态模式——
 *   1) prefers-reduced-motion；2) saveData；3) 低性能启发式（硬件并发 ≤4 且视口 <1280）。
 */
import { validateInquiry, hasErrors, isSubmitSuccess, type InquiryField } from '../lib/form';
import { track } from '../lib/analytics';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 && window.innerWidth < 1280;
if (reduced || saveData || lowPower) {
  document.documentElement.dataset.motion = 'off';
}
const motionOff = document.documentElement.dataset.motion === 'off';

/* ---------- 导航：滚动收缩 ---------- */
const gnb = document.querySelector<HTMLElement>('[data-gnb]');
if (gnb) {
  const onScroll = () => gnb.classList.toggle('scrolled', window.scrollY > 80);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- 移动端抽屉 ---------- */
const drawer = document.querySelector<HTMLElement>('[data-drawer]');
const burger = document.querySelector<HTMLButtonElement>('[data-drawer-open]');
function setDrawer(open: boolean) {
  if (!drawer || !burger) return;
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) drawer.querySelector<HTMLElement>('a.drawer-link, button')?.focus();
}
burger?.addEventListener('click', () => setDrawer(true));
drawer?.querySelector('[data-drawer-close]')?.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawer?.classList.contains('open')) setDrawer(false);
});
drawer?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));

/* ---------- 语言切换提示（/en/ 未发布，不产生空页入口，BR-09） ---------- */
const langToast = document.querySelector<HTMLElement>('[data-lang-toast]');
document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!langToast) return;
    langToast.classList.add('show');
    window.setTimeout(() => langToast.classList.remove('show'), 2400);
  });
});

/* ---------- 首屏轮播：6s 交叉淡入，hover 暂停，触摸滑动，降级=仅手动 ---------- */
const hero = document.querySelector<HTMLElement>('.hero[data-carousel]');
if (hero) {
  const slides = Array.from(hero.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots = Array.from(hero.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  let i = 0;
  let timer: number | undefined;
  const show = (n: number) => {
    slides[i]?.classList.remove('on');
    dots[i]?.classList.remove('on');
    i = (n + slides.length) % slides.length;
    slides[i]?.classList.add('on');
    dots[i]?.classList.add('on');
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = undefined; };
  const play = () => {
    if (motionOff) return;
    stop();
    timer = window.setInterval(() => show(i + 1), 6000);
  };
  dots.forEach((d, k) => d.addEventListener('click', () => { show(k); play(); }));
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', play);
  let touchX: number | null = null;
  hero.addEventListener('touchstart', (e) => { touchX = e.touches[0]?.clientX ?? null; stop(); }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    touchX = null;
    play();
  }, { passive: true });
  play();
}

/* ---------- 首屏视差（系数 0.15，最大 40px；降级关闭） ---------- */
if (!motionOff && hero) {
  const phs = hero.querySelectorAll<HTMLElement>('.ph');
  window.addEventListener('scroll', () => {
    const y = Math.min(window.scrollY * 0.15, 40);
    phs.forEach((ph) => { ph.style.transform = `translateY(${y}px)`; });
  }, { passive: true });
}

/* ---------- 分区进入渐显 ---------- */
const rvEls = document.querySelectorAll<HTMLElement>('.rv');
if (motionOff || !('IntersectionObserver' in window)) {
  rvEls.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  rvEls.forEach((el) => io.observe(el));
}

/* ---------- 浮动联系条：页尾 600px 内隐藏（克制规则） ---------- */
const rail = document.querySelector<HTMLElement>('[data-float-rail]');
if (rail) {
  const footer = document.querySelector('footer');
  const onScroll = () => {
    if (!footer) return;
    const top = footer.getBoundingClientRect().top;
    rail.classList.toggle('hidden-rail', top - window.innerHeight < 600);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
document.querySelector('[data-back-top]')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: motionOff ? 'auto' : 'smooth' });
});

/* ---------- 产品详情：分解图滚动外扩 0→24px ---------- */
const explode = document.querySelector<SVGSVGElement>('[data-explode]');
if (explode && !motionOff) {
  const parts = explode.querySelectorAll<SVGElement>('[data-part]');
  const onScroll = () => {
    const rect = explode.getBoundingClientRect();
    const progress = Math.min(Math.max((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0), 1);
    const spread = progress * 24;
    parts.forEach((p) => {
      const dir = Number(p.dataset.part ?? 0);
      p.style.transform = `translateY(${(-dir * spread).toFixed(1)}px)`;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- 统计：咨询入口点击 ---------- */
document.querySelectorAll('[data-track="consult_click"]').forEach((el) => {
  el.addEventListener('click', () => track('consult_click', { path: window.location.pathname }));
});

/* ---------- 咨询表单 ---------- */
document.querySelectorAll<HTMLFormElement>('form[data-consult-form]').forEach((form) => {
  const enabled = form.dataset.enabled === 'true';
  const banner = form.querySelector<HTMLElement>('[data-form-banner]');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type=submit]');
  const submitText = form.querySelector<HTMLElement>('[data-submit-text]');
  const successBox = form.closest('[data-form-root]')?.querySelector<HTMLElement>('[data-form-success]');
  const sourceField = form.querySelector<HTMLInputElement>('[data-source-field]');
  if (sourceField) sourceField.value = window.location.pathname;

  const showFieldError = (field: string, message?: string) => {
    const box = form.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!box) return;
    box.classList.toggle('err', Boolean(message));
    const msg = box.querySelector<HTMLElement>('[data-msg]');
    if (msg) msg.textContent = message ?? '';
  };

  // 输入时清除对应错误
  form.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => {
      const box = el.closest('[data-field]');
      if (box instanceof HTMLElement) showFieldError(box.dataset.field ?? '');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!enabled || !submitBtn || submitBtn.disabled) return;

    const data = new FormData(form);
    const input = {
      name: String(data.get('name') ?? ''),
      company: String(data.get('company') ?? ''),
      contact: String(data.get('contact') ?? ''),
      location: String(data.get('location') ?? ''),
      message: String(data.get('message') ?? ''),
      agree: data.get('agree') === 'on',
      honeypot: String(data.get('bd_website') ?? ''),
      source: window.location.pathname,
    };

    const errors = validateInquiry(input);
    (['name', 'contact', 'message', 'agree'] as InquiryField[]).forEach((f) =>
      showFieldError(f, errors.fieldErrors[f]),
    );
    if (hasErrors(errors)) {
      if (errors.spam) return; // 静默拦截机器人，不上报不提示
      banner?.classList.remove('show');
      const firstErr = form.querySelector<HTMLElement>('.field.err input, .field.err textarea, .agree.err input');
      firstErr?.focus();
      return;
    }

    // 提交中：禁用防重复 + 文案变更
    submitBtn.disabled = true;
    if (submitText) submitText.textContent = '提交中…';
    banner?.classList.remove('show');
    track('form_submit_attempt', { source: input.source });

    try {
      const payload = new FormData(form);
      payload.delete('bd_website');
      if (form.dataset.accessKey) payload.set('access_key', form.dataset.accessKey);
      const res = await fetch(form.dataset.endpoint ?? '', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload,
      });
      // 失败闭合：仅 HTTP 2xx 且 JSON {success:true} 才展示成功态（BR-10），
      // 非 JSON / 缺 success / success 非 true 一律进入失败分支并保留输入
      const ok = await isSubmitSuccess(res);
      if (ok) {
        track('form_submit_success', { source: input.source });
        form.hidden = true;
        if (successBox) {
          successBox.hidden = false;
          successBox.setAttribute('tabindex', '-1');
          successBox.focus();
        }
      } else {
        throw new Error(`submit failed: ${res.status}`);
      }
    } catch {
      // 失败：保留已填输入，顶部错误条提示重试
      track('form_submit_error', { source: input.source });
      if (banner) {
        banner.textContent = '提交未成功：网络或服务异常，请稍后重试；您填写的内容已保留。也可直接通过电话/邮箱联系我们。';
        banner.classList.add('show');
      }
      submitBtn.disabled = false;
      if (submitText) submitText.textContent = '提交留言';
    }
  });
});
