/* 首页：空间产品展示（缩略图切换大图与规格） */
interface ShowItem {
  id: string;
  name: string;
  desc: string;
  area: string;
  rest: string;
  layout: string;
}

document.querySelectorAll<HTMLElement>("[data-showcase]").forEach((root) => {
  const raw = root.querySelector("[data-showcase-json]")?.textContent ?? "[]";
  const items = JSON.parse(raw) as ShowItem[];
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-show-tab]"),
  );
  const frames = Array.from(
    root.querySelectorAll<HTMLElement>("[data-show-image]"),
  );
  const field = (name: string) =>
    root.querySelector<HTMLElement>(`[data-show-${name}]`);
  const link = root.querySelector<HTMLAnchorElement>("[data-show-link]");
  const prefix = location.pathname.startsWith("/en/") ? "/en" : "/zh";
  let current = 0;

  const select = (index: number, focus = false) => {
    const next = (index + items.length) % items.length;
    if (next === current) return;
    current = next;
    const item = items[next];
    tabs.forEach((tab, i) => {
      const on = i === next;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    frames.forEach((frame) => {
      const on = frame.dataset.showImage === item.id;
      frame.classList.toggle("on", on);
      if (on) frame.removeAttribute("aria-hidden");
      else frame.setAttribute("aria-hidden", "true");
      const img = frame.querySelector("img");
      if (on && img) img.loading = "eager";
    });
    const set = (name: string, value: string) => {
      const el = field(name);
      if (el) el.textContent = value;
    };
    set("index", String(next + 1).padStart(2, "0"));
    set("name", item.name);
    set("desc", item.desc);
    set("area", item.area);
    set("area-rest", item.rest);
    set("layout", item.layout);
    if (link) link.href = `${prefix}/products/${item.id}/`;
    if (focus) tabs[next]?.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    tab.addEventListener("keydown", (event) => {
      const keys: Record<string, number> = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
      };
      if (event.key in keys) {
        event.preventDefault();
        select(current + keys[event.key], true);
      } else if (event.key === "Home") {
        event.preventDefault();
        select(0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        select(items.length - 1, true);
      }
    });
  });
  // 悬停预加载其他产品主图，切换时无等待
  tabs.forEach((tab) =>
    tab.addEventListener(
      "pointerenter",
      () => {
        const frame = frames.find(
          (f) => f.dataset.showImage === tab.dataset.showTab,
        );
        const img = frame?.querySelector("img");
        if (img) img.loading = "eager";
      },
      { once: true },
    ),
  );
});
