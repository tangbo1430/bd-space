/** Published counterparts only. Reserved and editorial-only routes stay Chinese. */
export const corePaths = [
  "",
  "products/",
  "products/4s/",
  "products/5s/",
  "products/6s/",
  "products/grayscale/",
  "products/bd8/",
  "products/bd9/",
  "cases/",
  "about/",
  "contact/",
];
export function hasEnglish(path: string) {
  return corePaths.includes(path.replace(/^\/(zh|en)\//, ""));
}
export function alternateLanguage(path: string) {
  return path.startsWith("/en/")
    ? path.replace("/en/", "/zh/")
    : hasEnglish(path)
      ? path.replace("/zh/", "/en/")
      : "/en/";
}
