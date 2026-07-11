import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:5173';
const testPhone = process.env.E2E_TEST_PHONE;
const testPassword = process.env.E2E_TEST_PASSWORD;

test.use({ viewport: { width: 375, height: 812 } });

async function login(page) {
  await page.goto(base + '/');
  await page.getByPlaceholder('+628xxxxxxxxxx').fill(testPhone!);
  await page.getByPlaceholder('Minimal 6 karakter').fill(testPassword!);
  await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test.describe('Mobile responsive', () => {
  test.skip(!testPhone || !testPassword, 'Set E2E_TEST_PHONE and E2E_TEST_PASSWORD to run this suite');

  test('mobile nav drawer does not let page content bleed through while open', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
    const drawer = page.locator('aside.animate-slide-in-left');
    await expect(drawer).toBeVisible();

    // Background must not scroll while the drawer is open -- otherwise the
    // fixed drawer panel can visually "run out" before the real viewport
    // bottom on mobile browsers with a collapsing toolbar, revealing page
    // content underneath it.
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // The drawer must span the full viewport height, not just the layout
    // height at open time.
    const drawerBox = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(drawerBox?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);

    await page.getByRole('button', { name: 'Tutup menu navigasi' }).click();
    await expect(drawer).not.toBeVisible();
    const bodyOverflowAfterClose = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfterClose).not.toBe('hidden');
  });

  test('unit selector renders exact casing "Toko BUMDes"', async ({ page }) => {
    await login(page);
    const unitSelect = page.getByRole('combobox').first();
    const optionLabels = await unitSelect.locator('option').allTextContents();
    expect(optionLabels).toContain('Toko BUMDes');
    expect(optionLabels).not.toContain('Toko Bumdes');
  });

  test('Impor/Ekspor no longer exposes a full data reset control', async ({ page }) => {
    await login(page);
    const unitSelect = page.getByRole('combobox').first();
    await unitSelect.selectOption({ label: 'Unit Petelur' });

    await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
    await page.getByRole('button', { name: 'Impor / Ekspor' }).click();

    await expect(page.getByText('Reset Data')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Reset ke Data Kosong/i })).toHaveCount(0);
  });

  test('dashboard bar chart tooltip cursor does not wash out the bars', async ({ page }) => {
    await login(page);
    const barChart = page.locator('.recharts-bar').first();
    await expect(barChart).toBeVisible();

    const bar = page.locator('.recharts-bar-rectangle').first();
    await bar.hover();

    // Recharts renders a hover-cursor rectangle behind the bars; the fix
    // gives it a translucent rgba() fill instead of the opaque default, so
    // it should never resolve to a fully opaque solid color.
    const cursor = page.locator('.recharts-tooltip-cursor');
    if (await cursor.count()) {
      const fill = await cursor.first().evaluate((el) => getComputedStyle(el).fill || el.getAttribute('fill'));
      expect(fill).toMatch(/rgba\(|hsla\(/);
      const alphaMatch = fill?.match(/[\d.]+(?=\s*\))/);
      if (alphaMatch) {
        expect(Number(alphaMatch[0])).toBeLessThan(0.5);
      }
    }
  });
});
