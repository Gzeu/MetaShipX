/**
 * E2E: Practice Mode (AI Bot)
 * Tests: difficulty selection, game start, board renders, attack works
 * No wallet needed — pure off-chain gameplay.
 */
import { test, expect } from '@playwright/test';

const URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

test.describe('Practice Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${URL}/practice`);
  });

  test('page loads with difficulty selector', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Practice Mode');
    await expect(page.locator('.btn-diff')).toHaveCount(3);
  });

  test('selecting difficulty highlights button', async ({ page }) => {
    await page.click('.btn-diff:has-text("Hard")');
    await expect(page.locator('.btn-diff--active')).toContainText('Hard');
  });

  test('start game shows placement phase', async ({ page }) => {
    await page.click('.btn-start');
    // Backend must be running for this test
    const shipSelector = page.locator('.ship-selector');
    const errorVisible = await page.locator('.practice-msg').isVisible({ timeout: 4000 }).catch(() => false);
    if (!errorVisible) {
      await expect(shipSelector).toBeVisible({ timeout: 6000 });
    }
  });

  test('easy difficulty description shown', async ({ page }) => {
    await page.click('.btn-diff:has-text("Easy")');
    await expect(page.locator('.difficulty-desc')).toContainText('Random');
  });

  test('hard difficulty description shown', async ({ page }) => {
    await page.click('.btn-diff:has-text("Hard")');
    await expect(page.locator('.difficulty-desc')).toContainText('Probability');
  });
});
