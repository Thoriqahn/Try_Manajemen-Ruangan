# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should show error message on invalid credentials
- Location: tests-e2e\auth.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.MuiAlert-message, .sonner-toast, div:has-text("Email atau kata sandi salah")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.MuiAlert-message, .sonner-toast, div:has-text("Email atau kata sandi salah")').first()

```

```yaml
- button "Toggle Dark Mode":
  - img
- img
- img
- text: Menara
- paragraph: Platform Manajemen Ruangan Internal
- heading "Selamat Datang" [level=2]
- paragraph: Masuk untuk mengakses sistem
- paragraph: Email atau password salah
- text: Email
- textbox "nama@oikn.go.id": wrong@oikn.go.id
- text: Password
- button "Lupa Password?"
- textbox "••••••••": wrongpassword
- button:
  - img
- button "Masuk ke Sistem"
- text: atau masuk dengan
- button "Masuk dengan SSO IKN":
  - img
  - text: Masuk dengan SSO IKN
- paragraph:
  - text: Belum punya akun?
  - button "Daftar Sekarang"
- paragraph: "Mode Demo: Coba Akses Cepat"
- button "Dimas"
- button "Rina"
- button "Pengguna"
- button "Admin"
- button "Super Admin"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should show error message on invalid credentials', async ({ page }) => {
  5  |     // Go to login page
  6  |     await page.goto('/login');
  7  | 
  8  |     // Fill the login form with wrong credentials
  9  |     await page.fill('input[type="email"]', 'wrong@oikn.go.id');
  10 |     await page.fill('input[type="password"]', 'wrongpassword');
  11 | 
  12 |     // Click the submit button (find by text "Masuk")
  13 |     await page.click('button:has-text("Masuk")');
  14 | 
  15 |     // Expect an error toast or message to be visible
  16 |     // The exact text might be 'Email atau kata sandi salah' or similar
  17 |     const errorMessage = page.locator('.MuiAlert-message, .sonner-toast, div:has-text("Email atau kata sandi salah")').first();
> 18 |     await expect(errorMessage).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  19 |   });
  20 | 
  21 |   test('should login successfully as regular user and logout', async ({ page }) => {
  22 |     await page.goto('/login');
  23 | 
  24 |     // Use the premium seed data credentials
  25 |     await page.fill('input[type="email"]', 'user@oikn.go.id');
  26 |     await page.fill('input[type="password"]', 'password123!');
  27 | 
  28 |     // Click login
  29 |     await page.click('button:has-text("Masuk")');
  30 | 
  31 |     // Wait for the Dashboard or Calendar view to appear
  32 |     await expect(page.locator('h1, h2, nav, aside').first()).toBeVisible({ timeout: 10000 });
  33 | 
  34 |     // Check if the title or welcome message is visible
  35 |     await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Beranda|Menara|Jadwal/i }).first()).toBeVisible();
  36 |     await expect(page.locator('h1')).toContainText(/Dashboard|Beranda/i);
  37 | 
  38 |     // Attempt to logout
  39 |     // Assume there is a profile menu or logout button
  40 |     // It might be an avatar or a direct logout button
  41 |     const profileButton = page.locator('button[aria-haspopup="menu"], button[aria-label="account of current user"], .avatar, [role="button"]:has-text("U")').first();
  42 |     
  43 |     // Some UIs have a direct logout button on the sidebar
  44 |     const directLogoutButton = page.locator('button:has-text("Keluar"), button:has-text("Logout"), a:has-text("Keluar")').first();
  45 |     
  46 |     if (await profileButton.isVisible()) {
  47 |       await profileButton.click();
  48 |       await page.locator('text=Keluar').click();
  49 |     } else if (await directLogoutButton.isVisible()) {
  50 |       await directLogoutButton.click();
  51 |     } else {
  52 |       // Fallback: forcefully clear localStorage if we can't find the button easily in this basic test
  53 |       await page.evaluate(() => {
  54 |         localStorage.clear();
  55 |         window.location.reload();
  56 |       });
  57 |     }
  58 | 
  59 |     // Verify we are back to login page
  60 |     await expect(page.locator('button:has-text("Masuk")')).toBeVisible({ timeout: 10000 });
  61 |   });
  62 | });
  63 | 
```