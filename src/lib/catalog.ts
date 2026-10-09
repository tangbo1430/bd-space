import { getCollection } from "astro:content";

export async function getListedProducts() {
  return (
    await getCollection("products", ({ data }) => data.published && data.listed)
  )
    .sort((a, b) => a.data.order - b.data.order)
    .map(({ id, data }) => ({
      id,
      name: data.name,
      en: data.enTag,
      desc: data.tagline,
      base: data.heroBase!,
      imageCaption: data.heroCaption ?? `${data.name} / 外观`,
      area: data.params[0].value,
      layout: data.params.find((p) => p.label === "户型")?.value ?? "",
    }));
}
