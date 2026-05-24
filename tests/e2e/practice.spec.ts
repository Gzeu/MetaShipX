import { test, expect } from '@playwright/test';

test.describe('Practice Mode — AI Bot', () => {
  test('page loads without wallet required', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Should NOT show wallet connect prompt as blocker
    const walletBlocker = await page.locator('text=/connect wallet to play/i').isVisible().catch(() => false);
    expect(walletBlocker).toBeFalsy();

    // Difficulty selector present
    await expect(page.locator('[data-difficulty], button').first()).toBeVisible();
  });

  test('difficulty selector: all 3 options visible and selectable', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    for (const diff of ['easy', 'medium', 'hard']) {
      const btn = page.locator(`[data-difficulty="${diff}"], button:has-text("${diff}"`, { hasText: new RegExp(diff, 'i') });
      if (await btn.count() > 0) {
        await btn.first().click();
        // After click, button should be highlighted/active
        const cls = await btn.first().getAttribute('class') ?? '';
        expect(cls.includes('active') || cls.includes('selected') || cls.includes('primary')).toBeTruthy();
      }
    }
  });

  test('start game shows placement board', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Select Easy difficulty
    const easyBtn = page.locator('[data-difficulty="easy"], button', { hasText: /easy/i });
    if (await easyBtn.count() > 0) await easyBtn.first().click();

    // Click Start
    const startBtn = page.locator('button', { hasText: /start|play/i });
    await startBtn.first().click();

    // Placement board should appear
    await expect(
      page.locator('.placement-board, [data-testid="placement-board"], .board').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('practice mode has no EGLD transaction UI', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // No wager input or EGLD amount fields
    const wagerInput = await page.locator('input[placeholder*="EGLD"], input[placeholder*="wager"]').count();
    expect(wagerInput).toBe(0);

    // No "Sign Transaction" button
    const signTx = await page.locator('button', { hasText: /sign transaction|send tx/i }).count();
    expect(signTx).toBe(0);
  });

  test('mobile: practice board fits viewport at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(395);
  });
});
