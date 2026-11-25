import { expect, test } from '@playwright/test';

import { daysBack, eurFor, fmt, mockBnm, openApp, TODAY } from './bnm-mock';

test.describe('Конвертер', () => {
  test('показывает дату курса и источник', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('screen-title')).toHaveText('Конвертер валют');
    await expect(page.getByTestId('rate-date')).toHaveText(fmt(TODAY));
    await expect(page.getByTestId('source')).toHaveText('Национальный банк Молдовы (bnm.md)');
    await expect(page.getByTestId('notice')).toHaveCount(0);
  });

  test('кнопка неактивна, пока не введена сумма', async ({ page }) => {
    await openApp(page);
    const button = page.getByTestId('convert');
    await expect(page.getByTestId('rate-date')).toBeVisible();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('amount').fill('10');
    await expect(button).not.toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('amount').fill('');
    await expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  test('конвертирует EUR → MDL и обратно', async ({ page }) => {
    await openApp(page);
    const eur = eurFor(fmt(TODAY)); // 20.3
    await page.getByTestId('amount').fill('100');
    await page.getByTestId('convert').click();
    await expect(page.getByTestId('result-value')).toHaveText('2 030,00 MDL');
    await expect(page.getByTestId('result-rate')).toHaveText(`1 EUR = ${eur.toFixed(4).replace('.', ',')} MDL`);

    await page.getByTestId('swap').click();
    await expect(page.getByTestId('from')).toContainText('MDL');
    await expect(page.getByTestId('to')).toContainText('EUR');
    await expect(page.getByTestId('result-value')).toHaveText('4,93 EUR'); // 100 / 20.3
  });

  test('выбор валюты из списка и кросс-курс', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('to').click();
    await page.getByTestId('option-USD').click();
    await expect(page.getByTestId('to')).toContainText('USD');
    await page.getByTestId('amount').fill('16');
    await page.getByTestId('convert').click();
    await expect(page.getByTestId('result-value')).toHaveText('20,30 USD'); // 16 × 20.3 / 16
  });

  test('одинаковые валюты — сумма без изменений', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('to').click();
    await page.getByTestId('option-EUR').click();
    await page.getByTestId('amount').fill('42,5');
    await page.getByTestId('convert').click();
    await expect(page.getByTestId('result-value')).toHaveText('42,50 EUR');
  });

  for (const [input, message] of [
    ['0', 'больше нуля'],
    ['-5', 'больше нуля'],
    ['abc', 'числом'],
    ['1e5', 'числом'],
  ]) {
    test(`некорректный ввод «${input}»`, async ({ page }) => {
      await openApp(page);
      await page.getByTestId('amount').fill(input);
      await page.getByTestId('convert').click();
      await expect(page.getByTestId('amount-error')).toContainText(message);
      await expect(page.getByTestId('result')).toHaveCount(0);
    });
  }

  test('нет курса на сегодня — берётся прошлый день с предупреждением', async ({ page }) => {
    await openApp(page, { missing: [fmt(TODAY)] });
    await expect(page.getByTestId('rate-date')).toHaveText(fmt(daysBack(1)));
    await expect(page.getByTestId('notice')).toContainText('не опубликован');
  });

  test('без сети и без кэша — понятная ошибка, приложение не падает', async ({ page }) => {
    await openApp(page, { offline: true });
    await expect(page.getByTestId('error')).toContainText('нет сохранённых курсов');
    await expect(page.getByTestId('retry')).toBeVisible();
    await page.getByTestId('amount').fill('10');
    await expect(page.getByTestId('convert')).toHaveAttribute('aria-disabled', 'true');
  });

  test('кэш переживает перезапуск и работает без сети', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('rate-date')).toHaveText(fmt(TODAY));

    await mockBnm(page, { offline: true });
    await page.reload();
    await expect(page.getByTestId('notice')).toContainText('Нет соединения');
    await expect(page.getByTestId('notice')).toContainText(fmt(TODAY));
    await expect(page.getByTestId('saved-at')).toBeVisible();
    await page.getByTestId('amount').fill('1');
    await page.getByTestId('convert').click();
    await expect(page.getByTestId('result-value')).toHaveText('20,30 MDL');
  });
});
