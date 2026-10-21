import { getCollection } from "astro:content";

export async function getListedProducts() {
  return (
    await getCollection("products", ({ data }) => data.published && data.listed)
  )
    .sort((a, b) => a.data.order - b.data.order)
    .map(({ id, data }) => ({
      id,
      name: data.name,
      featured: data.featured,
      mobileImage: data.mobileImage,
      en: data.enTag,
      desc: data.tagline,
      base: data.heroBase!,
      main: data.mainBase ?? data.heroBase!,
      imageCaption: data.heroCaption ?? `${data.name} / 外观`,
      area: data.params[0].value,
      layout: data.params.find((p) => p.label === "户型")?.value ?? "",
      selectionFacts: [
        ...["建筑面积", "户型"].flatMap((label) =>
          data.params.filter((p) => p.label === label),
        ),
        { label: "使用场景", value: data.scenes.join(" / ") },
        ...data.params.filter((p) =>
          ["外墙厚度", "装运参考"].includes(p.label),
        ),
      ].filter((p) => p.value),
    }));
}
