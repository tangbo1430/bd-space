document.querySelectorAll<HTMLElement>(".closing-artwork").forEach((root) => {
  const dialog = root.querySelector<HTMLDialogElement>(".closing-qr-dialog");
  const image = root.querySelector<HTMLImageElement>("[data-closing-image]");
  const name = root.querySelector<HTMLElement>("[data-closing-name]");
  if (!dialog || !image || !name) return;
  let trigger: HTMLAnchorElement | null = null;
  root.querySelectorAll<HTMLAnchorElement>("[data-closing-qr]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector("img")?.alt ?? "WeChat";
      name.textContent = link.dataset.contactName ?? "";
      dialog.showModal();
    });
  });
  root.querySelector("[data-closing-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener("close", () => trigger?.focus());
});
