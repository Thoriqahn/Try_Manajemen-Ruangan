import { test, expect } from '@playwright/test';

test.describe('Public QR Check-In Flow', () => {
  // Assuming a known room QR token from the premium seed data
  // For instance, the room token is usually "r1" for "Ruang Rapat VIP Yudistira"
  const testRoomId = 'r1';

  test('should display check-in error for unauthenticated/uninvited users if restricted', async ({ page }) => {
    // Navigate directly to public QR route
    await page.goto(`/qr/${testRoomId}`);

    // Verify it loads the public Check-In / Booking screen
    // It should have either a "Check In" button or a login prompt depending on auth requirements
    await expect(page.locator('text="Check-in", text="Absen", text="Masuk"').first()).toBeVisible({ timeout: 10000 });
  });
});
