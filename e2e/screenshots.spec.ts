import { expect, test } from '@playwright/test';

import { openApp } from './bnm-mock';

/**
 * Saves screenshots of every screen for a visual check:
 *   npx playwright test screenshots
 * Files: test-results/screens/*.png
 */
test('скриншоты экранов', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('amount').fill('1250');
  await page.getByTestId('convert').click();
  await expect(page.getByTestId('result-value')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/converter.png', fullPage: true });

  for (const tab of ['week', 'month'] as const) {
    await page.getByTestId(`tab-${tab}`).click();
    await expect(page.getByTestId('chart')).toBeVisible();
    await page.screenshot({ path: `test-results/screens/${tab}.png`, fullPage: true });
  }
});
