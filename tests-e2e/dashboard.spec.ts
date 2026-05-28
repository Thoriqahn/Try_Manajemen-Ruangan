import { test, expect } from '@playwright/test';

test.describe('Dashboard UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    await expect(page.locator('nav, aside, .MuiCard-root, h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display main layout elements correctly', async ({ page }) => {
    // Check Sidebar / Navigation presence
    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible();

    // The dashboard should have Summary Cards (Upcoming, Ongoing, Past or similar)
    // We expect some form of Grid or Flex layout containing cards
    const cards = page.locator('.MuiCard-root, .rounded-xl, .shadow-md, .card').first();
    
    // We just ensure at least one card is visible (e.g. Total Meetings, Upcoming Meetings)
    await expect(cards).toBeVisible();
    
    // Ensure header title is visible
    await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Beranda|Ringkasan|Jadwal|Menara/i }).first()).toBeVisible();
  });
});
