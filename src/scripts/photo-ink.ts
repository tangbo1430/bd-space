/** Sync photograph-dependent copy and brand settings. Only the hero subtitle
 * uses photo-aligned letter fills; navigation always uses solid CSS lettering. */
export function createPhotoInkSync(
  hero: HTMLElement,
  header: HTMLElement | null,
) {
  let frame = 0;
  const subtitle = hero.querySelector<HTMLElement>(".h-hero-sub");
  const targets = subtitle ? [subtitle] : [];
  const clear = () =>
    targets.forEach((el) => el.removeAttribute("data-photo-ink"));
  const update = () => {
    frame = 0;
    if (window.innerWidth < 1280) {
      clear();
      return;
    }
    const photo = hero.querySelector<HTMLImageElement>(".slide.on img");
    if (!photo?.complete || !photo.naturalWidth) {
      clear();
      return;
    }
    const imageRect = photo.getBoundingClientRect();
    // Object-fit cover crops the home hero on landscape displays. Align letter
    // fills to the rendered photograph, including its centered overflow.
    const cover = getComputedStyle(photo).objectFit === "cover";
    const active = photo.closest<HTMLElement>("[data-slide]");
    if (header && active) {
      header.dataset.tone =
        (cover && active.dataset.coverHeaderTone) ||
        active.dataset.headerTone ||
        "light";
      header.dataset.brandTone =
        (cover && active.dataset.coverBrandTone) ||
        active.dataset.brandTone ||
        active.dataset.headerTone ||
        "light";
    }
    if (active) {
      hero.dataset.copyTone =
        (cover && active.dataset.coverCopyTone) ||
        active.dataset.copyTone ||
        "light";
      hero.dataset.copyLayout =
        (cover && active.dataset.coverCopyLayout) ||
        active.dataset.copyLayout ||
        "stack";
      hero.style.setProperty(
        "--hero-copy-top",
        (cover && active.dataset.coverCopyTop) ||
          active.dataset.copyTop ||
          "25%",
      );
    }
    const scale = cover
      ? Math.max(
          imageRect.width / photo.naturalWidth,
          imageRect.height / photo.naturalHeight,
        )
      : 1;
    const imageWidth = cover ? photo.naturalWidth * scale : imageRect.width;
    const imageHeight = cover ? photo.naturalHeight * scale : imageRect.height;
    const imageLeft = imageRect.left + (imageRect.width - imageWidth) / 2;
    const imageTop = imageRect.top + (imageRect.height - imageHeight) / 2;
    const copyEnabled = hero.dataset.copyInk === "photo";
    for (const el of targets) {
      el.toggleAttribute("data-photo-ink", copyEnabled);
      if (!copyEnabled) continue;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--ink-photo", `url("${photo.currentSrc}")`);
      el.style.setProperty("--ink-size", `${imageWidth}px ${imageHeight}px`);
      el.style.setProperty(
        "--ink-offset",
        `${imageLeft - rect.left}px ${imageTop - rect.top}px`,
      );
    }
  };
  const sync = () => {
    if (!frame)
      frame = window.requestAnimationFrame(() => {
        update();
        // Photo, copy position and font metrics settle together after a slide
        // change. Re-align once after paint even if the text's size is unchanged.
        frame = window.requestAnimationFrame(update);
      });
  };
  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY <= 100) sync();
    },
    { passive: true },
  );
  const observer = new ResizeObserver(sync);
  targets.forEach((el) => observer.observe(el));
  void document.fonts.ready.then(sync);
  return sync;
}
