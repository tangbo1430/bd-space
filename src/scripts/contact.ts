import { ui } from "../lib/translate";

const root = document.querySelector<HTMLElement>("[data-direct-contact]");
if (root) {
  const names: Record<string, string> = JSON.parse(
    root.dataset.contactNames ?? "{}",
  );
  const params = new URLSearchParams(window.location.search);
  const key = params.has("product")
    ? `product:${params.get("product")}`
    : `project:${params.get("project")}`;
  const selected = Object.hasOwn(names, key) ? names[key] : undefined;
  const context = root.querySelector<HTMLElement>("[data-contact-context]");
  const email = root.querySelector<HTMLAnchorElement>("[data-contact-email]");
  if (selected && context) {
    context.textContent = `${ui("咨询意向：")}${selected}`;
    context.hidden = false;
  }
  if (email) {
    const subject = `${ui("项目咨询")}${selected ? ` · ${selected}` : ""}`;
    const body = selected
      ? `${ui("您好，我想了解：")}${selected}\n\n${ui("项目所在地：")}\n${ui("用途与空间需求：")}`
      : "";
    email.href = `${email.getAttribute("href")}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
  }
  const status = root.querySelector<HTMLElement>("[data-contact-copy-status]");
  root
    .querySelectorAll<HTMLButtonElement>("[data-copy-contact]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.dataset.copyContact ?? "";
        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(value);
            copied = true;
          } catch {
            /* Try the HTTP-compatible fallback below. */
          }
        }
        if (!copied) {
          const field = document.createElement("textarea");
          field.value = value;
          field.readOnly = true;
          field.style.cssText = "position:fixed;top:0;left:-9999px";
          document.body.append(field);
          field.select();
          try {
            copied = document.execCommand("copy");
          } catch {
            copied = false;
          }
          field.remove();
          button.focus({ preventScroll: true });
        }
        if (status)
          status.textContent = copied
            ? `${ui("已复制：")}${value}`
            : ui("未能复制，请选择上方号码或邮箱手动复制。");
      });
    });
}
