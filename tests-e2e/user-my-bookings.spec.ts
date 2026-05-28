import { test, expect } from '@playwright/test';

test.describe('My Bookings Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    await expect(page.locator('nav, aside, .MuiCard-root, h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to My Bookings and view history', async ({ page }) => {
    // Determine if on mobile or desktop
    const isMobile = await page.locator('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu').isVisible();
    
    if (isMobile) {
      await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
    }

    // Click "Riwayat" or "Pesanan Saya"
    const historyLink = page.locator('text="Riwayat", text="Pesanan Saya", a[href*="my-bookings"]').first();
    await historyLink.click({ force: true });

    // Verify header
    await expect(page.locator('h1, h2').filter({ hasText: /Riwayat|Pesanan Saya|Booking/i }).first()).toBeVisible({ timeout: 10000 });

    // Ensure booking tabs or lists are visible (Mendatang, Sedang Berjalan, Selesai)
    const tabs = page.locator('button[role="tab"], .tab, text="Mendatang", text="Selesai"').first();
    await expect(tabs).toBeVisible();

    // Look for at least one booking card or an empty state message
    const emptyState = page.locator('text="Tidak ada", text="Belum ada", text="Kosong"').first();
    const bookingCard = page.locator('.MuiCard-root, .card, .shadow-md').first();
    
    const hasEmptyState = await emptyState.isVisible();
    const hasCard = await bookingCard.isVisible();
    
    expect(hasEmptyState || hasCard).toBeTruthy();
  });
});
