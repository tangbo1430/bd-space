import { describe, it, expect } from "vitest";
import { hasEnglish, alternateLanguage, corePaths } from "../src/lib/locale";
import { translate } from "../src/lib/translate";
import { validateInquiry } from "../src/lib/form";
describe("published bilingual pages", () => {
  it("has exactly eleven reciprocal counterparts", () => {
    expect(corePaths).toHaveLength(11);
    for (const path of corePaths) {
      expect(hasEnglish(`/zh/${path}`)).toBe(true);
      expect(alternateLanguage(alternateLanguage(`/zh/${path}`))).toBe(
        `/zh/${path}`,
      );
    }
  });
  it("does not invent English editorial or reserved pages", () => {
    for (const path of [
      "news/",
      "qualifications/",
      "about/investors/",
      "products/slab/",
    ]) {
      expect(hasEnglish(`/zh/${path}`)).toBe(false);
      expect(alternateLanguage(`/zh/${path}`)).toBe("/en/");
    }
  });
  it("preserves separate numeric area definitions", () => {
    expect(translate("首层123.9㎡＋二层113.9㎡；总建筑面积238㎡")).toBe(
      "Ground floor 123.9 m² + Upper floor 113.9 m²; total gross floor area 238 m²",
    );
  });
  it("localizes dynamic image announcements", () => {
    expect(translate("第 2 张，共 13 张")).toBe("Slide 2 of 13");
  });
  it("accepts international contact numbers without accepting punctuation as digits", () => {
    const input = {
      name: "Alex",
      contact: "+61 (412) 345-678",
      message: "Home in Brisbane",
      agree: true,
    };
    expect(validateInquiry(input, true).fieldErrors.contact).toBeUndefined();
    expect(
      validateInquiry({ ...input, contact: "+1------" }, true).fieldErrors
        .contact,
    ).toBeDefined();
    expect(
      validateInquiry({ ...input, contact: "+1234567890123456" }, true)
        .fieldErrors.contact,
    ).toBeDefined();
  });
});
