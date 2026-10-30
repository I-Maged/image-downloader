import AdmZip from "adm-zip";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURE_URL =
  "http://localhost:3000/test-fixtures/gallery.html";

test.describe("gallery end-to-end", () => {
  test("extracts fixture gallery and supports selection and filters", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill(FIXTURE_URL);
    await page.getByRole("button", { name: "Extract Images" }).click();

    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 45_000 });

    const badges = page.locator("span").filter({ hasText: /\d+\s*×\s*\d+/ });
    await expect(badges).toHaveCount(3, { timeout: 15_000 });
    await expect(page.getByText("0 of 3 selected")).toBeVisible();

    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await expect(page.getByText("3 of 3 selected")).toBeVisible();

    await page.getByRole("button", { name: "Deselect All", exact: true }).click();
    await expect(page.getByText("0 of 3 selected")).toBeVisible();

    await page.getByLabel("Hide small images (< 150px)").uncheck();
    await expect(badges).toHaveCount(4, { timeout: 15_000 });
    await page.getByLabel("Hide small images (< 150px)").check();
    await expect(badges).toHaveCount(3);
  });

  test("opens and closes the lightbox", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill(FIXTURE_URL);
    await page.getByRole("button", { name: "Extract Images" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Preview full-resolution image" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").locator("img")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("downloads a single image", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill(FIXTURE_URL);
    await page.getByRole("button", { name: "Extract Images" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 45_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: "Download full-resolution image" }).first().click();
    const download = await downloadPromise;

    const tmpFile = path.join(os.tmpdir(), `single-${Date.now()}.png`);
    await download.saveAs(tmpFile);
    expect(fs.statSync(tmpFile).size).toBeGreaterThan(0);
    fs.rmSync(tmpFile, { force: true });
  });

  test("downloads a zip for selected images", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill(FIXTURE_URL);
    await page.getByRole("button", { name: "Extract Images" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 45_000 });

    const toggles = page.getByRole("button", { name: /Select image|Deselect image/, exact: false });
    await toggles.nth(0).click();
    await toggles.nth(1).click();
    await expect(page.getByText("2 of 3 selected")).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: "Download ZIP (2 Images)" }).click();
    const download = await downloadPromise;

    const tmpFile = path.join(os.tmpdir(), `batch-${Date.now()}.zip`);
    await download.saveAs(tmpFile);
    const zip = new AdmZip(tmpFile);
    const entries = zip.getEntries();
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.getData().length).toBeGreaterThan(0);
    }
    fs.rmSync(tmpFile, { force: true });
  });

  test("disables the download button when nothing is selected", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill(FIXTURE_URL);
    await page.getByRole("button", { name: "Extract Images" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 45_000 });

    const toolbarButton = page.getByRole("button", {
      name: /Download 1 Image|Download ZIP/,
    });
    await expect(toolbarButton).toBeDisabled();
  });
});
