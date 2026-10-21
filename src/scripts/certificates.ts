/* 证书展示轮播：居中放大、按钮/键盘/触摸切换。 */
document.querySelectorAll<HTMLElement>("[data-cert-show]").forEach((root) => {
  const track = root.querySelector<HTMLElement>("[data-cert-track]")!;
  const items = Array.from(
    root.querySelectorAll<HTMLElement>("[data-cert-item]"),
  );
  const current = root.querySelector<HTMLElement>("[data-cert-current]");
  let active = 0;
  const center = (i: number, smooth = true) => {
    const item = items[Math.max(0, Math.min(items.length - 1, i))];
    track.scrollTo({
      left: item.offsetLeft - (track.clientWidth - item.offsetWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  };
  const update = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    items.forEach((item, i) => {
      const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best === active && items[best].classList.contains("is-active")) return;
    active = best;
    items.forEach((item, i) => item.classList.toggle("is-active", i === best));
    if (current) current.textContent = String(best + 1).padStart(2, "0");
  };
  let frame = 0;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  });
  const prev = root.querySelector("[data-cert-prev]");
  const next = root.querySelector("[data-cert-next]");
  if (prev) prev.addEventListener("click", () => center(active - 1));
  if (next) next.addEventListener("click", () => center(active + 1));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      center(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      center(active + 1);
    }
  });
  const start = Math.floor((items.length - 1) / 2);
  requestAnimationFrame(() => {
    center(start, false);
    update();
  });
});
