import { resolveSwipe } from "../lib/banner";

const viewer = document.querySelector<HTMLDialogElement>("[data-photo-viewer]");
const links = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-gallery]"),
);
if (viewer && typeof viewer.showModal === "function") {
  const mount = viewer.querySelector<HTMLElement>("[data-viewer-image]")!;
  const image = document.createElement("img");
  image.className = "viewer-image";
  image.width = 1920;
  image.height = 1080;
  const caption = viewer.querySelector<HTMLElement>("[data-viewer-caption]")!;
  const count = viewer.querySelector<HTMLElement>("[data-viewer-count]")!;
  const thumbs = viewer.querySelector<HTMLElement>("[data-viewer-thumbnails]")!;
  const stage = viewer.querySelector<HTMLElement>("[data-viewer-stage]")!;
  const loading = viewer.querySelector<HTMLElement>("[data-viewer-loading]")!;
  const zoomButton =
    viewer.querySelector<HTMLButtonElement>("[data-viewer-zoom]")!;
  const original = viewer.querySelector<HTMLAnchorElement>(
    "[data-viewer-original]",
  )!;
  let group: HTMLAnchorElement[] = [];
  let index = 0;
  let origin: HTMLAnchorElement | undefined;
  let previousOverflow = "";
  let touchStart: { x: number; y: number } | undefined;
  let zoomed = false;
  const setZoom = (value: boolean) => {
    zoomed = value;
    mount.classList.toggle("zoomed", value);
    mount.tabIndex = value ? 0 : -1;
    mount.setAttribute(
      "aria-label",
      value ? "放大的图片，使用方向键移动查看" : "图片画面",
    );
    zoomButton.setAttribute("aria-pressed", String(value));
    zoomButton.setAttribute("aria-label", value ? "恢复完整图片" : "放大图片");
    const hint = viewer.querySelector<HTMLElement>(".viewer-hint");
    if (hint)
      hint.textContent = value
        ? "方向键移动画面 · TAB 访问控件 · ESC 关闭"
        : "方向键切换图片 · Esc 关闭";
    requestAnimationFrame(() => {
      mount.scrollLeft = value
        ? Math.max(
            0,
            Math.min(
              mount.scrollWidth - mount.clientWidth,
              mount.scrollWidth *
                Number(group[index]?.dataset.galleryZoomX ?? 0.5) -
                mount.clientWidth / 2,
            ),
          )
        : 0;
      mount.scrollTop = value
        ? (mount.scrollHeight - mount.clientHeight) / 2
        : 0;
      if (value) mount.focus({ preventScroll: true });
      else if (document.activeElement === mount) zoomButton.focus();
    });
  };

  const select = (next: number) => {
    index = (next + group.length) % group.length;
    const selected = group[index];
    setZoom(false);
    image.classList.remove("loaded");
    loading.hidden = false;
    loading.textContent = "正在加载图片…";
    image.alt = selected.querySelector("img")?.alt ?? "";
    image.width =
      Number(selected.dataset.galleryWidth) ||
      selected.querySelector("img")?.naturalWidth ||
      1920;
    image.height =
      Number(selected.dataset.galleryHeight) ||
      selected.querySelector("img")?.naturalHeight ||
      1080;
    image.src = selected.dataset.gallerySource ?? selected.href;
    original.href = selected.href;
    caption.textContent = selected.dataset.galleryCaption ?? image.alt;
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(group.length).padStart(2, "0")}`;
    thumbs
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button, i) => {
        button.setAttribute("aria-pressed", String(i === index));
        if (i === index) {
          const frame = thumbs.getBoundingClientRect();
          const item = button.getBoundingClientRect();
          if (item.left < frame.left)
            thumbs.scrollLeft -= frame.left - item.left + 4;
          else if (item.right > frame.right)
            thumbs.scrollLeft += item.right - frame.right + 4;
        }
      });
    if (image.complete && image.naturalWidth > 0) {
      image.classList.add("loaded");
      loading.hidden = true;
    }
  };
  image.addEventListener("load", () => {
    image.classList.add("loaded");
    loading.hidden = true;
  });
  image.addEventListener("error", () => {
    loading.textContent = "图片暂时无法加载，请切换其他图片。";
  });

  links.forEach((link) =>
    link.addEventListener("click", (event) => {
      // Preserve the browser's open-in-new-tab and download gestures.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      origin = link;
      group = links.filter(
        (item) => item.dataset.gallery === link.dataset.gallery,
      );
      thumbs.replaceChildren();
      group.forEach((item, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute(
          "aria-label",
          `查看第 ${i + 1} 张：${item.dataset.galleryCaption}`,
        );
        const thumb = document.createElement("img");
        thumb.src =
          item.dataset.galleryThumb ??
          item.querySelector("img")?.currentSrc ??
          item.href;
        thumb.width = 160;
        thumb.height = 110;
        thumb.decoding = "async";
        thumb.alt = "";
        button.append(thumb);
        button.addEventListener("click", () => select(i));
        thumbs.append(button);
      });
      viewer
        .querySelectorAll<HTMLButtonElement>(
          "[data-viewer-prev], [data-viewer-next]",
        )
        .forEach((button) => {
          button.hidden = group.length <= 1;
        });
      mount.append(image);
      previousOverflow = document.body.style.overflow;
      viewer.showModal();
      document.body.style.overflow = "hidden";
      select(group.indexOf(link));
      viewer.querySelector<HTMLButtonElement>("[data-viewer-close]")?.focus();
    }),
  );
  viewer
    .querySelector("[data-viewer-close]")
    ?.addEventListener("click", () => viewer.close());
  zoomButton.addEventListener("click", () => setZoom(!zoomed));
  image.addEventListener("dblclick", () => setZoom(!zoomed));
  viewer
    .querySelector("[data-viewer-prev]")
    ?.addEventListener("click", () => select(index - 1));
  viewer
    .querySelector("[data-viewer-next]")
    ?.addEventListener("click", () => select(index + 1));
  viewer.addEventListener("keydown", (event) => {
    if (zoomed && document.activeElement === mount) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(index + (event.key === "ArrowRight" ? 1 : -1));
  });
  viewer.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    origin?.focus({ preventScroll: true });
    image.remove();
  });
  stage.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      touchStart = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    },
    { passive: true },
  );
  stage.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];
      if (touchStart && touch && !zoomed) {
        const direction = resolveSwipe(
          touch.clientX - touchStart.x,
          touch.clientY - touchStart.y,
        );
        if (direction) select(index + direction);
      }
      touchStart = undefined;
    },
    { passive: true },
  );
  stage.addEventListener(
    "touchcancel",
    () => {
      touchStart = undefined;
    },
    { passive: true },
  );
}
