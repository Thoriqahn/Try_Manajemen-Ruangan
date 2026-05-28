import { test, expect } from '@playwright/test';

test.describe('Superadmin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'superadmin@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    await expect(page.locator('nav, aside, .MuiCard-root, h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('should access superadmin only pages', async ({ page }) => {
    const isMobile = await page.locator('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu').isVisible();
    if (isMobile) {
      await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
    }

    // Check if Pengguna (Users) menu is available and click it
    const usersMenu = page.locator('text="Pengguna", a[href*="sa-users"]').first();
    await usersMenu.click({ force: true });

    // Verify User Management page loads
    await expect(page.locator('h1, h2').filter({ hasText: /Pengguna|Manajemen/i }).first()).toBeVisible({ timeout: 10000 });

    // Verify presence of "Tambah Pengguna" or User Table
    const addUserBtn = page.locator('button:has-text("Tambah"), button:has-text("Add")').first();
    const table = page.locator('table, .MuiTable-root').first();
    
    await expect(page.locator('div').filter({ has: addUserBtn }).or(table).first()).toBeVisible();
    
    // Now try to access Building / Gedung Management
    if (isMobile) {
      await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
    }
    const buildingMenu = page.locator('text="Gedung", a[href*="sa-buildings"]').first();
    await buildingMenu.click({ force: true });
    
    await expect(page.locator('h1, h2').filter({ hasText: /Gedung|Fasilitas/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
