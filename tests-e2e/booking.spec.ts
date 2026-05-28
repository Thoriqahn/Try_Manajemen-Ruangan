import { test, expect } from '@playwright/test';

test.describe('Room Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    await expect(page.locator('nav, aside, .MuiCard-root, h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should validate empty booking form fields', async ({ page }) => {
    // Navigate to Room list / Booking page
    // Assume there's a link to "Ruangan" or "Pesan Ruangan"
    const ruanganMenu = page.locator('a:has-text("Ruangan"), button:has-text("Ruangan"), a:has-text("Pesan")').first();
    await ruanganMenu.click();

    // Wait for the rooms page to load
    await expect(page.locator('h1, h2').filter({ hasText: /Ruangan|Pesan/i }).first()).toBeVisible();

    // Wait for the room list to appear
    await page.waitForSelector('text=Pesan', { timeout: 10000 });

    // Click on the first "Pesan" or "Booking" button on a room card
    const firstBookingBtn = page.locator('button:has-text("Pesan"), button:has-text("Booking"), a:has-text("Pesan")').first();
    await firstBookingBtn.click({ force: true });

    // Submit form immediately without filling the "Agenda" to trigger validation
    const submitBtn = page.locator('button[type="submit"], button:has-text("Konfirmasi"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Expect a validation error to appear for the required field
    const errorText = page.locator('text=wajib diisi, text=required, .Mui-error').first();
    await expect(errorText).toBeVisible();
  });
});
