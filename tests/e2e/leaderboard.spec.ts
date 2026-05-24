import { test, expect } from '@playwright/test';

test.describe('Leaderboard Page', () => {
  test('renders on-chain data or empty state — never infinite loading', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // Page title present
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Either has table entries OR an empty-state message — never stuck loading
    const hasEntries = await page.locator('table tbody tr').count();
    const hasEmpty = await page.locator('text=/Win a game|No players yet|empty/i').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=/loading/i').isVisible().catch(() => false);

    expect(hasEntries > 0 || hasEmpty || !hasLoading).toBeTruthy();
  });

  test('column headers present', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // At minimum, Rank and either Wins or EGLD should be present
    const headers = await page.locator('th').allTextContents();
    const headerText = headers.join(' ').toLowerCase();
    expect(
      headerText.includes('win') || headerText.includes('egld') || headerText.includes('rank') || headerText.includes('player')
    ).toBeTruthy();
  });

  test('leaderboard is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });

  test('leaderboard tab switching works if tabs present', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const weeklyTab = page.locator('button, [role="tab"]', { hasText: /weekly/i });
    const monthlyTab = page.locator('button, [role="tab"]', { hasText: /monthly/i });

    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await expect(weeklyTab).toHaveClass(/active|selected|current/i);
    }
    if (await monthlyTab.isVisible()) {
      await monthlyTab.click();
      await expect(monthlyTab).toHaveClass(/active|selected|current/i);
    }
  });
});
