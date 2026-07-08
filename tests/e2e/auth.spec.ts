import { test, expect } from '@playwright/test';

// NOTE: configure baseURL in playwright.config.ts or use process.env.BASE_URL
const base = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Auth flows', () => {
  test('login with phone works', async ({ page }) => {
    await page.goto(base + '/');
    await page.getByRole('button', { name: /Masuk/i }).click();
    await page.getByPlaceholder('+628').fill('+62882009759102');
    await page.getByPlaceholder(/Minimal 6 karakter/i).fill('Vijay123');
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    // adjust selector for app's post-login element
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('signup with Other unit creates unit', async ({ page }) => {
    // This test assumes a clean test DB or teardown between runs.
    await page.goto(base + '/');
    await page.getByRole('button', { name: /Daftar/i }).click();
    await page.getByPlaceholder('Contoh: Siti Aminah').fill('E2E Tester');
    await page.getByPlaceholder('+628').fill('+62899900000001');
    await page.getByPlaceholder(/Minimal 6 karakter/i).fill('Testpass1');
    await page.getByRole('combobox', { name: /Request Unit/i }).selectOption('other');
    await page.getByPlaceholder('Contoh: Bumdes Mulyoarjo').fill('E2E Unit One');
    await page.getByRole('button', { name: /Daftar Akun Baru/i }).click();

    await expect(page.locator('text=Pendaftaran berhasil')).toBeVisible();
  });
});
