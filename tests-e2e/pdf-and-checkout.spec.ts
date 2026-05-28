import { test, expect } from '@playwright/test';

test.describe('PDF and Checkout Rules Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    await expect(page.locator('nav, aside, .MuiCard-root, h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('should respect checkout rules and show PDF button for completed bookings', async ({ page }) => {
    // Navigate to My Bookings
    const isMobile = await page.locator('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu').isVisible();
    if (isMobile) {
      await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
    }
    const historyLink = page.locator('button:has-text("Dashboard Saya"), a:has-text("Dashboard Saya")').first();
    await historyLink.click({ force: true });
    await expect(page.locator('h1, h2').filter({ hasText: /Riwayat|Pesanan/i }).first()).toBeVisible();

    // Intercept API calls to inject a mock 'ongoing' booking and a 'completed' booking
    await page.route('**/api/v1/bookings?**', async route => {
      const response = await route.fetch();
      const json = await response.json();
      
      // Add fake bookings to the first page of results
      if (json.data && Array.isArray(json.data)) {
        json.data.push({
          id: 'mock-ongoing-123',
          room_name: 'Ruang Uji E2E Checkout',
          date: new Date().toISOString().split('T')[0],
          start_time: '08:00',
          end_time: '10:00',
          agenda: 'Testing Checkout Rule',
          status: 'ongoing',
          user_id: 'u1' // matching standard user ID
        });

        json.data.push({
          id: 'mock-completed-123',
          room_name: 'Ruang Uji E2E PDF',
          date: new Date().toISOString().split('T')[0],
          start_time: '13:00',
          end_time: '15:00',
          agenda: 'Testing PDF Export',
          status: 'completed',
          user_id: 'u1'
        });
      }
      await route.fulfill({ json });
    });

    // Intercept attendees endpoint
    await page.route('**/api/v1/bookings/mock-completed-123/attendees', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { id: 1, user_name: 'Budi', institution: 'OIKN', attendance_type: 'offline', scanned_at: new Date().toISOString() }
          ]
        }
      });
    });

    // Refresh the view so the intercepted data loads
    await page.reload();
    await page.waitForTimeout(2000); // Give time for reload and mock fetch

    // Wait for booking cards
    await page.waitForSelector('.MuiCard-root, .card, .shadow-md', { timeout: 10000 });

    // Verify "Akhiri Rapat" is present for the ongoing booking
    const ongoingCard = page.locator('div').filter({ hasText: 'Testing Checkout Rule' }).first();
    const akhiriBtn = ongoingCard.locator('button', { hasText: 'Akhiri Rapat' });
    await expect(akhiriBtn).toBeVisible();

    // Verify "Cetak PDF" is present for the completed booking
    // Note: It might be under the "Selesai" tab, but the mock injected it into the main list
    const completedCard = page.locator('div').filter({ hasText: 'Testing PDF Export' }).first();
    const pdfBtn = completedCard.locator('button', { hasText: /PDF/i });
    
    // We might need to click "Selesai" tab if the UI filters strictly by status
    const selesaiTab = page.locator('button[role="tab"], .tab').filter({ hasText: /Selesai/i }).first();
    if (await selesaiTab.isVisible()) {
        await selesaiTab.click();
    }

    await expect(pdfBtn).toBeVisible();

    // Verify PDF download starts when clicking
    // Playwright captures downloads via page.waitForEvent('download')
    const downloadPromise = page.waitForEvent('download');
    await pdfBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('Presensi_mock-completed-123.pdf');
  });
});
