// apps/ui/e2e/responsive.spec.ts
// Covers docs/FAS_ERP_CODING_STANDARDS.md's "Responsive standard": the three
// baseline breakpoints, no horizontal overflow, and the 44x44px minimum
// touch target on interactive elements — plus a light/dark sanity check.
// Extend this same pass (add a `test.describe` block, reuse `VIEWPORTS`)
// for every future module's screens rather than starting a new spec file.
import { expect, test } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
} as const;

const MIN_TOUCH_TARGET_PX = 44;

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`login page @ ${name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport });

    test("has no horizontal overflow", async ({ page }) => {
      await page.goto("/login");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("form inputs and submit button meet the 44x44px touch target minimum", async ({
      page,
    }) => {
      await page.goto("/login");
      for (const selector of ["#email", "#password", "button[type=submit]"]) {
        const box = await page.locator(selector).boundingBox();
        expect(box, `${selector} should be visible`).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }
    });
  });
}

test.describe("light/dark theming", () => {
  test("resolves the .dark class from prefers-color-scheme and swaps surface colors", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    const lightBackground = await page
      .locator("form")
      .locator("..")
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkBackground = await page
      .locator("form")
      .locator("..")
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(darkBackground).not.toBe(lightBackground);
  });
});
