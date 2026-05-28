import { test, expect } from '@playwright/test';

test.describe('Admin Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@oikn.go.id');
    await page.fill('input[type="password"]', 'password123!');
    await page.click('button:has-text("Masuk")');
    // Wait for main container to load
    await expect(page.locator('nav, aside, .MuiCard-root, h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to approval queue and verify elements', async ({ page }) => {
    // Determine if on mobile or desktop
    const isMobile = await page.locator('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu').isVisible();
    
    if (isMobile) {
      await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
    }

    // Navigate to Admin -> Persetujuan (Approval)
    const approvalLink = page.locator('text="Persetujuan", text="Approval", a[href*="admin-approval"]').first();
    await approvalLink.click({ force: true });

    // Ensure we are on the Approval page
    await expect(page.locator('h1, h2').filter({ hasText: /Persetujuan|Antrean/i }).first()).toBeVisible({ timeout: 10000 });

    // Ensure that tables or list cards are present for Pending approvals
    const tableOrList = page.locator('table, .MuiTable-root, .card, [role="list"]').first();
    await expect(tableOrList).toBeVisible();

    // Look for Approve or Reject buttons
    // We won't actually click them to prevent breaking state if there are no pending ones,
    // but we can check if they exist or if the empty state exists
    const emptyState = page.locator('text="Tidak ada", text="Kosong", text="No pending"').first();
    const actionButtons = page.locator('button:has-text("Setujui"), button:has-text("Tolak")').first();

    // Either we have an empty state OR we have action buttons
    const hasEmptyState = await emptyState.isVisible();
    const hasButtons = await actionButtons.isVisible();
    
    expect(hasEmptyState || hasButtons).toBeTruthy();
  });
});
