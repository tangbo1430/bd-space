import dictionary from "../data/en.json";
const entries = Object.entries(dictionary as Record<string, string>).sort(
  ([a], [b]) => b.length - a.length,
);
/** Literal, reviewed terminology; numbers and product identifiers are never synthesized. */
export function translate(value: string): string {
  let result = value;
  for (const [zh, en] of entries) result = result.split(zh).join(en);
  return result
    .replace(/第\s*(\d+)\s*张，共\s*(\d+)\s*张/g, "Slide $1 of $2")
    .replace(/切换到第(\d+)张：/g, "Show slide $1: ")
    .replace(/(\d+)天/g, "$1 days")
    .replace(/\b1 days\b/g, "1 day")
    .replace(/㎡/g, " m²")
    .replace(/＋/g, " + ")
    .replace(/：/g, ": ");
}
export const isEnglish = () =>
  typeof document !== "undefined" && document.documentElement.lang === "en";
export const ui = (value: string) => (isEnglish() ? translate(value) : value);
