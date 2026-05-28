# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should login successfully as regular user and logout
- Location: tests-e2e\auth.spec.ts:21:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1, h2').filter({ hasText: /Dashboard|Beranda|Menara|Jadwal/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1, h2').filter({ hasText: /Dashboard|Beranda|Menara|Jadwal/i }).first()

```

```yaml
- img
- img
- text: Menara OIKN Space
- navigation:
  - button "Menu Utama":
    - text: Menu Utama
    - img
  - button "Dashboard Saya":
    - img
    - text: Dashboard Saya
  - button "Kalender Ruangan":
    - img
    - text: Kalender Ruangan
  - button "Daftar Ruangan":
    - img
    - text: Daftar Ruangan
- text: Menara v1.0.0
- banner:
  - button:
    - img
  - heading "Kalender Ruangan" [level=1]
  - paragraph: Cari dan pesan slot waktu yang tersedia
  - img
  - textbox "Cari ruangan, booking..."
  - button "Toggle Dark Mode":
    - img
  - button:
    - img
  - text: BS
- main:
  - heading "Kalender Ruangan" [level=2]
  - paragraph: Pilih tanggal untuk melihat jadwal & booking
  - button "Filter Ruangan":
    - img
    - text: Filter Ruangan
  - img
  - text: Pilih tanggal → tahan & seret kolom waktu di baris ruangan untuk memilih durasi booking secara instan.
  - button:
    - img
  - text: Mei 2026
  - button:
    - img
  - text: Sen Sel Rab Kam Jum Sab Min
  - button "27" [disabled]
  - button "28" [disabled]
  - button "29" [disabled]
  - button "30" [disabled]
  - button "1" [disabled]
  - button "2" [disabled]
  - button "3" [disabled]
  - button "4" [disabled]
  - button "5" [disabled]
  - button "6" [disabled]
  - button "7" [disabled]
  - button "8" [disabled]
  - button "9" [disabled]
  - button "10" [disabled]
  - button "11" [disabled]
  - button "12" [disabled]
  - button "13" [disabled]
  - button "14" [disabled]
  - button "15" [disabled]
  - button "16" [disabled]
  - button "17" [disabled]
  - button "18" [disabled]
  - button "19" [disabled]
  - button "20" [disabled]
  - button "21" [disabled]
  - button "22" [disabled]
  - button "23" [disabled]
  - button "24" [disabled]
  - button "25" [disabled]
  - button "26" [disabled]
  - button "27" [disabled]
  - button "28" [disabled]
  - button "29 1 Ruang Kolaborasi Nusantara Workshop Penyusunan Peta Rencana Smart City IKN"
  - button "30 1 Ruang Rapat Eksekutif Garuda ⏳ Rapat Koordinasi Anggaran Divisi Teknologi Informasi Q3"
  - button "31"
  - text: Tersedia Hari Ini Menunggu Persetujuan Disetujui Sedang Berjalan Tutup Sudah Lewat
- button "Tap QR Check-In":
  - img
  - text: Tap QR Check-In
- region "Notifications alt+T"
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
  18 |     await expect(errorMessage).toBeVisible();
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
> 35 |     await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Beranda|Menara|Jadwal/i }).first()).toBeVisible();
     |                                                                                                          ^ Error: expect(locator).toBeVisible() failed
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