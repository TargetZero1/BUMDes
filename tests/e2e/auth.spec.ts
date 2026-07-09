import { test, expect } from '@playwright/test';

// NOTE: configure baseURL in playwright.config.ts or use process.env.BASE_URL
const base = process.env.BASE_URL || 'http://localhost:5173';
const testPhone = process.env.E2E_TEST_PHONE;
const testPassword = process.env.E2E_TEST_PASSWORD;

test.describe('Auth flows', () => {
  test('login with phone works', async ({ page }) => {
    test.skip(!testPhone || !testPassword, 'Set E2E_TEST_PHONE and E2E_TEST_PASSWORD to run this test');
    await page.goto(base + '/');
    await page.getByRole('button', { name: /Masuk/i }).click();
    await page.getByPlaceholder('+628').fill(testPhone);
    await page.getByPlaceholder(/Minimal 6 karakter/i).fill(testPassword);
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
