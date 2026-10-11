/* global document */
import assert from "node:assert/strict";

export async function assertDirectContact(page, expected) {
  assert.equal(await page.locator("form, [data-download-inquiry]").count(), 0);
  assert(
    (await page.locator("[data-contact-context]").innerText()).includes(
      expected,
    ),
  );
  const mail = new URL(
    await page.locator("[data-contact-email]").getAttribute("href"),
  );
  assert.equal(mail.protocol, "mailto:");
  assert.equal(mail.pathname, "411547750@qq.com");
  assert(mail.searchParams.get("subject").includes(expected));
  assert(mail.searchParams.get("body").includes(expected));
  assert.equal(await page.locator(".wechat-code").count(), 3);
  const en = (await page.locator("html").getAttribute("lang")) === "en";
  const phone = `${en ? "+86" : ""}18503005860`;
  assert.equal(
    await page.locator(".channel-value").first().getAttribute("href"),
    `tel:${phone}`,
  );
  for (const value of [phone, "411547750@qq.com"]) {
    await page.locator(`[data-copy-contact="${value}"]`).click();
    await page.waitForFunction(
      (v) =>
        document
          .querySelector("[data-contact-copy-status]")
          .textContent.includes(v),
      value,
    );
  }
  for (let i = 0; i < 3; i++) {
    const code = page.locator(".wechat-code").nth(i);
    await code.click();
    await page.waitForFunction(
      () => document.querySelector("[data-photo-viewer]").open,
    );
    assert(
      (
        await page.locator("[data-viewer-original]").getAttribute("href")
      ).includes("wechat-"),
    );
    await page.keyboard.press("Escape");
    assert(await code.evaluate((el) => el === document.activeElement));
  }
}
