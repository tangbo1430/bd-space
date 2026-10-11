import { ui, isEnglish } from "../lib/translate";
import { validateInquiry, hasErrors } from "../lib/form";
document.documentElement.classList.add("js-enabled");
/** Progressive interactions for the architectural editorial pages. */
document.querySelectorAll<HTMLElement>("[data-collection]").forEach((root) => {
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-product-tab]"),
  );
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>("[data-collection-image]"),
  );
  const descriptions = JSON.parse(
    root.querySelector("[data-products-json]")?.textContent ?? "[]",
  ) as Array<{ id: string; desc: string; area: string; layout: string }>;
  const info = root.querySelector<HTMLElement>('[role="tabpanel"]');
  const description = root.querySelector<HTMLElement>(
    "[data-product-description]",
  );
  const link = root.querySelector<HTMLAnchorElement>("[data-product-link]");
  const area = root.querySelector<HTMLElement>("[data-product-area]");
  const layout = root.querySelector<HTMLElement>("[data-product-layout]");
  const setParts = (target: HTMLElement | null, value: string) => {
    if (!target) return;
    target.replaceChildren(
      ...value
        .split(/(?<=[房厅厨卫])|(?=[＋+])|(?<=,)\s*/u)
        .filter(Boolean)
        .map((text) => {
          const part = document.createElement("span");
          part.textContent = text;
          return part;
        }),
    );
  };
  const select = (index: number, focus = false) => {
    const selected = tabs[index];
    if (!selected) return;
    const id = selected.dataset.productTab;
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.collectionImage === id;
      panel.classList.toggle("active", active);
      panel.setAttribute("aria-hidden", String(!active));
    });
    if (info) info.setAttribute("aria-labelledby", selected.id);
    const content = descriptions.find((item) => item.id === id);
    if (description) description.textContent = content?.desc ?? "";
    setParts(area, content?.area ?? "");
    setParts(layout, content?.layout ?? "");
    if (link) link.href = `/${isEnglish() ? "en" : "zh"}/products/${id}/`;
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown")
        next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
    });
  });
});

document.querySelectorAll<HTMLElement>("[data-making]").forEach((root) => {
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-making-step]"),
  );
  const pictures = Array.from(
    root.querySelectorAll<HTMLElement>("[data-making-image]"),
  );
  steps.forEach((step, index) => {
    step
      .querySelector<HTMLButtonElement>("[data-making-toggle]")
      ?.addEventListener("click", () => {
        steps.forEach((item, i) => {
          const active = i === index;
          item.classList.toggle("active", active);
          item
            .querySelector("[data-making-toggle]")
            ?.setAttribute("aria-expanded", String(active));
          const text = item.querySelector<HTMLElement>(".making-description");
          if (text) text.hidden = !active;
          pictures[i]?.classList.toggle("active", active);
          pictures[i]?.setAttribute("aria-hidden", String(!active));
        });
      });
  });
});

const projectFilters =
  document.querySelectorAll<HTMLButtonElement>("[data-case-filter]");
const projects = document.querySelectorAll<HTMLElement>("[data-case-region]");
projectFilters.forEach((button) =>
  button.addEventListener("click", () => {
    const region = button.dataset.caseFilter;
    projectFilters.forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    let count = 0;
    projects.forEach((project) => {
      project.hidden =
        region !== "all" && project.dataset.caseRegion !== region;
      if (!project.hidden) count++;
    });
    const status = document.querySelector<HTMLElement>("[data-filter-status]");
    if (status) status.textContent = ui(`显示 ${count} 个项目`);
  }),
);

// A useful local draft remains available while the real submission service is unconfigured.
document
  .querySelectorAll<HTMLFormElement>("[data-consult-form]")
  .forEach((form) => {
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    const project = params.get("project");
    const names: Record<string, string> = JSON.parse(
      form.dataset.inquiryNames ?? "{}",
    );
    const message = form.querySelector<HTMLTextAreaElement>('[name="message"]');
    const selected = product ?? project;
    if (selected && names[selected] && message && !message.value)
      message.value = ui(`我想了解${names[selected]}，项目需求：`);
    const counter = form.querySelector<HTMLElement>("[data-message-count]");
    const updateCount = () => {
      if (counter && message)
        counter.textContent = `${message.value.length} / ${message.maxLength}`;
    };
    updateCount();
    message?.addEventListener("input", updateCount);
    form.addEventListener("input", () => {
      const status = form.querySelector<HTMLElement>("[data-download-status]");
      const modified = ui("内容已修改，请重新下载更新后的项目需求。");
      if (status?.textContent && status.textContent !== modified)
        status.textContent = modified;
    });
    form
      .querySelector("[data-download-inquiry]")
      ?.addEventListener("click", () => {
        const data = new FormData(form);
        const input = {
          name: String(data.get("name") ?? ""),
          contact: String(data.get("contact") ?? ""),
          message: String(data.get("message") ?? ""),
          agree: true,
          honeypot: String(data.get("bd_website") ?? ""),
        };
        const errors = validateInquiry(input, isEnglish());
        for (const field of ["name", "contact", "message"] as const) {
          const box = form.querySelector<HTMLElement>(
            `[data-field="${field}"]`,
          );
          const error = errors.fieldErrors[field];
          box?.classList.toggle("err", Boolean(error));
          const message = box?.querySelector<HTMLElement>("[data-msg]");
          const control = box?.querySelector<HTMLElement>("input, textarea");
          if (message) message.textContent = ui(error ?? "");
          control?.setAttribute("aria-invalid", String(Boolean(error)));
        }
        if (hasErrors(errors)) {
          form
            .querySelector<HTMLElement>(".field.err input, .field.err textarea")
            ?.focus();
          return;
        }
        const text = [
          ui("半打空间 / 项目需求"),
          "",
          `${ui("称呼")}：${input.name.trim()}`,
          `${ui("企业：")}${String(data.get("company") ?? "").trim() || ui("未填写")}`,
          `${ui("联系方式")}：${input.contact.trim()}`,
          `${ui("项目所在地：")}${String(data.get("location") ?? "").trim() || ui("未填写")}`,
          "",
          ui("项目需求："),
          input.message.trim(),
          "",
          ui("此文件为本地需求草稿，尚未向半打空间发送。"),
        ].join("\n");
        const url = URL.createObjectURL(
          new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = isEnglish()
          ? "semi-six-project-brief.txt"
          : "半打空间-项目需求.txt";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 20000);
        const status = form.querySelector<HTMLElement>(
          "[data-download-status]",
        );
        if (status)
          status.textContent = ui(
            "项目需求已下载到您的设备，尚未发送给我们。请通过下方邮箱或微信发送文件。",
          );
      });
  });
