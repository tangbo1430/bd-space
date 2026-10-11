import { defineMiddleware } from "astro:middleware";
import { parse, serialize, type DefaultTreeAdapterTypes } from "parse5";
import { translate } from "./lib/translate";
import { hasEnglish } from "./lib/locale";

/** Build-time localization of shared page templates. No browser translation or
 * duplicated numerical product data. Only reviewed copy is translated. */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (
    !context.url.pathname.startsWith("/en/") ||
    !response.headers.get("content-type")?.includes("text/html")
  )
    return response;
  const tree = parse(await response.text());
  function walk(node: DefaultTreeAdapterTypes.Node, raw = false) {
    if ("value" in node && !raw) node.value = translate(node.value);
    if ("attrs" in node) {
      for (const attr of node.attrs) {
        if (
          [
            "alt",
            "title",
            "aria-label",
            "placeholder",
            "content",
            "data-gallery-caption",
          ].includes(attr.name)
        )
          attr.value = translate(attr.value);
        if (
          attr.name === "href" &&
          attr.value.startsWith("/zh/") &&
          hasEnglish(attr.value.split(/[?#]/)[0]) &&
          !node.attrs.some((a) => a.name === "data-language-link")
        )
          attr.value = attr.value.replace("/zh/", "/en/");
        if (attr.name === "href" && /^tel:1[3-9]\d{9}$/.test(attr.value))
          attr.value = attr.value.replace("tel:", "tel:+86");
        if (attr.name === "data-inquiry-names")
          attr.value = translate(attr.value);
      }
    }
    if ("childNodes" in node) {
      const isScript =
        "tagName" in node &&
        (node.tagName === "script" || node.tagName === "style");
      const json =
        "attrs" in node &&
        node.attrs.some(
          (a) => a.name === "type" && a.value === "application/json",
        );
      node.childNodes.forEach((child) => walk(child, isScript && !json));
    }
  }
  walk(tree);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(serialize(tree), { status: response.status, headers });
});
