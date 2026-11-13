import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("drags study thumbnails into the report and reorders key images by dragging", async ({ page }) => {
  const keyImages = page.getByRole("list");
  await page.getByRole("button", { name: "Frontal chest", exact: true }).dragTo(keyImages);
  await expect(keyImages.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Lateral chest", exact: true }).dragTo(keyImages);
  const cards = keyImages.getByRole("listitem");
  await expect(cards).toHaveText([/1\. Frontal chest/, /2\. Lateral chest/]);

  await cards.nth(1).dragTo(cards.nth(0));
  await expect(cards).toHaveText([/1\. Lateral chest/, /2\. Frontal chest/]);
});

test("selects a key image and moves it with the keyboard while retaining focus", async ({ page }) => {
  const addKeyImage = page.getByRole("button", { name: /add key image/i });
  await addKeyImage.click();
  await page.getByRole("button", { name: "Lateral chest", exact: true }).click();
  await addKeyImage.click();

  await page.getByRole("textbox", { name: "Report text" }).click();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listitem", { name: "Frontal chest, key image 1" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "View key image 1, Frontal chest" })).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+ArrowRight");
  const cards = page.getByRole("listitem");
  await expect(cards).toHaveText([/1\. Lateral chest/, /2\. Frontal chest/]);
  await expect(cards.nth(1)).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Moved to position 2 of 2." })).toBeAttached();
});

test("shows the image for the selected study thumbnail", async ({ page }) => {
  const thumbnail = page.getByRole("button", { name: "Axial slice", exact: true });
  await thumbnail.click();

  await expect(thumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Frontal chest", exact: true })).toHaveAttribute("aria-pressed", "false");
  const viewer = page.getByRole("img", { name: "AI-generated mock radiology image, axial slice" });
  await expect(viewer).toHaveAttribute("src", "/study/view-4.png");
  await expect.poll(() => viewer.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test("adds the selected image to the key list using Add key image", async ({ page }) => {
  await page.getByRole("button", { name: "Coronal slice", exact: true }).click();
  await page.getByRole("button", { name: /add key image/i }).click();

  await expect(page.getByRole("listitem")).toHaveCount(1);
  const preview = page.getByRole("button", { name: "View key image 1, Coronal slice" });
  await expect(preview.locator("img")).toHaveAttribute("src", "/study/view-5.png");
});
