import { expect, Page, test } from '@playwright/test';

import { daysBack, eurFor, fmt, mockBnm, openApp } from './bnm-mock';

const num = (v: number, d = 4) => v.toFixed(d).replace('.', ',');

/** Expected stats for EUR/MDL over the last n days of the fixture. */
function expected(n: number) {
  const values = Array.from({ length: n }, (_, i) => eurFor(fmt(daysBack(n - 1 - i))));
  const first = values[0];
  const last = values[values.length - 1];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { first, last, min: Math.min(...values), max: Math.max(...values), avg, pct: ((last - first) / first) * 100 };
}

async function openTab(page: Page, tab: 'week' | 'month') {
  await page.getByTestId(`tab-${tab}`).click();
  await expect(page.getByTestId('chart')).toBeVisible();
}

for (const [tab, days, title] of [['week', 7, 'Сравнение за неделю'], ['month', 30, 'Сравнение за месяц']] as const) {
  test.describe(title, () => {
    test('график, минимум, максимум, среднее, изменение и тенденция', async ({ page }) => {
      const requested = await openApp(page);
      await openTab(page, tab);
      const e = expected(days);

      await expect(page.getByTestId('screen-title')).toHaveText(title);
      await expect(page.getByTestId('current')).toHaveText(num(e.last));
      await expect(page.getByTestId('stat-min')).toContainText(num(e.min));
      await expect(page.getByTestId('stat-min')).toContainText(fmt(daysBack(days - 1)));
      await expect(page.getByTestId('stat-max')).toContainText(num(e.max));
      await expect(page.getByTestId('stat-avg')).toContainText(num(e.avg));
      await expect(page.getByTestId('stat-avg')).toContainText(`${days} дн.`);
      await expect(page.getByTestId('stat-change')).toContainText(`+${num(e.last - e.first)}`);
      await expect(page.getByTestId('pct')).toHaveText(`+${num(e.pct, 2)} %`);
      await expect(page.getByTestId('trend')).toContainText('Рост');
      await expect(page.getByTestId('analytics-source')).toContainText('Национальный банк Молдовы');

      // Every day of the period was requested.
      for (let i = 0; i < days; i++) expect(requested).toContain(fmt(daysBack(i)));
    });

    test('падение для обратной пары MDL → EUR', async ({ page }) => {
      await openApp(page);
      await page.getByTestId('swap').click();
      await openTab(page, tab);
      await expect(page.getByTestId('trend')).toContainText('Падение');
      await expect(page.getByTestId('pct')).toHaveText(/^−/);
    });
  });
}

test('одинаковые валюты — подсказка вместо графика', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('to').click();
  await page.getByTestId('option-EUR').click();
  await page.getByTestId('tab-week').click();
  await expect(page.getByTestId('notice')).toContainText('две разные валюты');
  await expect(page.getByTestId('chart')).toHaveCount(0);
});

test('дни без публикации пропускаются с предупреждением', async ({ page }) => {
  await openApp(page, { missing: [fmt(daysBack(2)), fmt(daysBack(3))] });
  await openTab(page, 'week');
  await expect(page.getByTestId('notice')).toHaveText('!Нет данных за 2 из 7 дней.');
  await expect(page.getByTestId('stat-avg')).toContainText('5 дн.');
});

test('без сети неделя и месяц открываются из кэша', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'month'); // fills the cache for 30 days (week included)

  await mockBnm(page, { offline: true });
  await page.reload();
  await openTab(page, 'week');
  await expect(page.getByTestId('notice')).toContainText('Нет соединения');
  await expect(page.getByTestId('notice')).toContainText(fmt(daysBack(0)));
  await expect(page.getByTestId('stat-avg')).toContainText('7 дн.');
});

test('без сети и без кэша — сообщение вместо графика', async ({ page }) => {
  await openApp(page, { offline: true });
  await page.getByTestId('tab-month').click();
  await expect(page.getByTestId('no-data')).toBeVisible();
  await expect(page.getByTestId('notice')).toContainText('нет сохранённых данных');
});
