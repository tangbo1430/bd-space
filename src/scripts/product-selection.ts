type Model = {
  id: string;
  name: string;
  href: string;
  facts: { label: string; value: string }[];
};

document
  .querySelectorAll<HTMLElement>("[data-product-comparison]")
  .forEach((root) => {
    const source = root.querySelector("[data-comparison-models]")?.textContent;
    if (!source) return;
    const models = JSON.parse(source) as Model[];
    const selects = [
      ...root.querySelectorAll<HTMLSelectElement>("[data-comparison-select]"),
    ];
    const update = (select: HTMLSelectElement, side: number) => {
      const model = models.find((p) => p.id === select.value);
      if (!model) return;
      const name = root.querySelector(`[data-comparison-name="${side}"]`);
      if (name) name.textContent = model.name;
      model.facts.forEach((fact, row) => {
        const cell = root.querySelector(
          `[data-comparison-value="${side}-${row}"]`,
        );
        if (cell) {
          const parts = fact.value.split(/(?=[＋+])/u);
          cell.replaceChildren(
            ...parts.map((part) => {
              const span = document.createElement("span");
              if (parts.length > 1) span.className = "comparison-part";
              span.textContent = part;
              return span;
            }),
          );
        }
      });
      const link = root.querySelector<HTMLAnchorElement>(
        `[data-comparison-link="${side}"]`,
      );
      if (link) link.href = model.href;
      const status = root.querySelector<HTMLElement>(
        "[data-comparison-status]",
      );
      if (status)
        status.textContent = `${status.dataset.prefix} ${selects.map((s) => models.find((m) => m.id === s.value)?.name).join(" / ")}`;
    };
    selects.forEach((select, side) => {
      select.disabled = false;
      select.addEventListener("change", () => update(select, side));
    });
    root.dataset.ready = "true";
  });
