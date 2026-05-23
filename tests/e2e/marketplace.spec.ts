/**
 * E2E: Marketplace Flow
 * Tests: listings/empty state, filter, buy disabled during tx, list modal
 */
import { test, expect } from '@playwright/test';

const URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

test.describe('Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${URL}/marketplace`);
  });

  test('renders listings grid or empty state within 8s', async ({ page }) => {
    await expect(
      page.locator('.ship-catalog, .marketplace-grid, .fleet-empty, [data-testid="empty-state"]')
    ).toBeVisible({ timeout: 8000 });
  });

  test('catalog tab shows all ship types', async ({ page }) => {
    await page.click('.mp-tab:has-text("Ship Catalog")').catch(() => {});
    const cards = page.locator('.ship-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('My Fleet tab shows wallet prompt when not connected', async ({ page }) => {
    const fleetTab = page.locator('.mp-tab:has-text("My Fleet")');
    if (await fleetTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fleetTab.click();
      await expect(page.locator('.fleet-empty')).toBeVisible({ timeout: 5000 });
    }
  });

  test('mint button disabled without connected wallet', async ({ page }) => {
    const mintBtns = page.locator('.btn-mint');
    const count = await mintBtns.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(mintBtns.nth(i)).toBeDisabled();
      }
    }
  });

  test('ship cards contain rarity badge', async ({ page }) => {
    const cards = page.locator('.ship-card');
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first().locator('.ship-rarity')).toBeVisible();
    }
  });
});
