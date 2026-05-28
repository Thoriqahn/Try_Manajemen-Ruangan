# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pdf-and-checkout.spec.ts >> PDF and Checkout Rules Flow >> should respect checkout rules and show PDF button for completed bookings
- Location: tests-e2e\pdf-and-checkout.spec.ts:13:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text="Riwayat", text="Pesanan Saya", a[href*="my-bookings"]').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic:
      - img
    - generic [ref=e5]:
      - generic [ref=e7]:
        - img [ref=e9]
        - generic [ref=e13]:
          - generic [ref=e14]: Menara
          - generic [ref=e15]: OIKN Space
      - navigation [ref=e17]:
        - generic [ref=e18]:
          - button "Menu Utama" [ref=e19]:
            - generic [ref=e20]: Menu Utama
            - img [ref=e21]
          - generic [ref=e23]:
            - button "Dashboard Saya" [ref=e24]:
              - img [ref=e26]
              - generic [ref=e28]: Dashboard Saya
            - button "Kalender Ruangan" [ref=e29]:
              - img [ref=e31]
              - generic [ref=e33]: Kalender Ruangan
            - button "Daftar Ruangan" [ref=e34]:
              - img [ref=e36]
              - generic [ref=e40]: Daftar Ruangan
    - generic [ref=e41]:
      - banner [ref=e42]:
        - button "Toggle Dark Mode" [ref=e43]:
          - img [ref=e44]
        - button [ref=e47]:
          - img [ref=e48]
        - generic [ref=e53] [cursor=pointer]: BS
      - main [ref=e54]:
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - heading "Kalender Ruangan" [level=2] [ref=e58]
              - paragraph [ref=e59]: Pilih tanggal untuk melihat jadwal & booking
            - button "Filter Ruangan" [ref=e60]:
              - img [ref=e61]
              - text: Filter Ruangan
          - generic [ref=e63]:
            - img [ref=e64]
            - text: Pilih tanggal → tahan & seret kolom waktu di baris ruangan untuk memilih durasi booking secara instan.
          - generic [ref=e66]:
            - generic [ref=e67]:
              - button [ref=e68]:
                - img [ref=e69]
              - generic [ref=e71]:
                - generic [ref=e72]: 25 – 31 Mei 2026
                - generic [ref=e73]: Ketuk tanggal untuk detail jadwal
              - button [ref=e74]:
                - img [ref=e75]
            - generic [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e79]: Sen
                - generic [ref=e80]: "25"
              - generic [ref=e81]:
                - generic [ref=e82]: Sel
                - generic [ref=e83]: "26"
              - generic [ref=e84]:
                - generic [ref=e85]: Rab
                - generic [ref=e86]: "27"
              - generic [ref=e87]:
                - generic [ref=e88]: Kam
                - generic [ref=e89]: "28"
              - generic [ref=e90]:
                - generic [ref=e91]: Jum
                - generic [ref=e92]: "29"
              - generic [ref=e93]:
                - generic [ref=e94]: Sab
                - generic [ref=e95]: "30"
              - generic [ref=e96]:
                - generic [ref=e97]: Min
                - generic [ref=e98]: "31"
            - generic [ref=e99]:
              - button [disabled] [ref=e100]
              - button [disabled] [ref=e101]
              - button [disabled] [ref=e102]
              - button [disabled] [ref=e103]
              - button [ref=e104]
              - button [ref=e107]
              - button [ref=e110]
            - generic [ref=e111]:
              - generic [ref=e114]: Ada booking
              - generic [ref=e115]:
                - generic [ref=e116]: —
                - generic [ref=e117]: Kosong
    - generic [ref=e118]:
      - button "Kalender" [ref=e119]:
        - img [ref=e120]
        - generic [ref=e122]: Kalender
      - button "Ruangan" [ref=e123]:
        - img [ref=e124]
        - generic [ref=e128]: Ruangan
      - button [ref=e130]:
        - img [ref=e131]
      - button "Booking" [ref=e144]:
        - img [ref=e145]
        - generic [ref=e147]: Booking
      - button "Menu" [ref=e148]:
        - img [ref=e149]
        - generic [ref=e150]: Menu
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('PDF and Checkout Rules Flow', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Login as regular user
  6   |     await page.goto('/login');
  7   |     await page.fill('input[type="email"]', 'user@oikn.go.id');
  8   |     await page.fill('input[type="password"]', 'password123!');
  9   |     await page.click('button:has-text("Masuk")');
  10  |     await expect(page.locator('nav, aside, .MuiCard-root, h1, h2').first()).toBeVisible({ timeout: 15000 });
  11  |   });
  12  | 
  13  |   test('should respect checkout rules and show PDF button for completed bookings', async ({ page }) => {
  14  |     // Navigate to My Bookings
  15  |     const isMobile = await page.locator('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu').isVisible();
  16  |     if (isMobile) {
  17  |       await page.click('button[aria-label="open drawer"], button[aria-label="menu"], .hamburger-menu');
  18  |     }
  19  |     const historyLink = page.locator('text="Riwayat", text="Pesanan Saya", a[href*="my-bookings"]').first();
> 20  |     await historyLink.click({ force: true });
      |                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  21  |     await expect(page.locator('h1, h2').filter({ hasText: /Riwayat|Pesanan/i }).first()).toBeVisible();
  22  | 
  23  |     // Intercept API calls to inject a mock 'ongoing' booking and a 'completed' booking
  24  |     await page.route('**/api/v1/bookings?**', async route => {
  25  |       const response = await route.fetch();
  26  |       const json = await response.json();
  27  |       
  28  |       // Add fake bookings to the first page of results
  29  |       if (json.data && Array.isArray(json.data)) {
  30  |         json.data.push({
  31  |           id: 'mock-ongoing-123',
  32  |           room_name: 'Ruang Uji E2E Checkout',
  33  |           date: new Date().toISOString().split('T')[0],
  34  |           start_time: '08:00',
  35  |           end_time: '10:00',
  36  |           agenda: 'Testing Checkout Rule',
  37  |           status: 'ongoing',
  38  |           user_id: 'u1' // matching standard user ID
  39  |         });
  40  | 
  41  |         json.data.push({
  42  |           id: 'mock-completed-123',
  43  |           room_name: 'Ruang Uji E2E PDF',
  44  |           date: new Date().toISOString().split('T')[0],
  45  |           start_time: '13:00',
  46  |           end_time: '15:00',
  47  |           agenda: 'Testing PDF Export',
  48  |           status: 'completed',
  49  |           user_id: 'u1'
  50  |         });
  51  |       }
  52  |       await route.fulfill({ json });
  53  |     });
  54  | 
  55  |     // Intercept attendees endpoint
  56  |     await page.route('**/api/v1/bookings/mock-completed-123/attendees', async route => {
  57  |       await route.fulfill({
  58  |         json: {
  59  |           success: true,
  60  |           data: [
  61  |             { id: 1, user_name: 'Budi', institution: 'OIKN', attendance_type: 'offline', scanned_at: new Date().toISOString() }
  62  |           ]
  63  |         }
  64  |       });
  65  |     });
  66  | 
  67  |     // Refresh the view so the intercepted data loads
  68  |     await page.reload();
  69  |     await page.waitForTimeout(2000); // Give time for reload and mock fetch
  70  | 
  71  |     // Wait for booking cards
  72  |     await page.waitForSelector('.MuiCard-root, .card, .shadow-md', { timeout: 10000 });
  73  | 
  74  |     // Verify "Akhiri Rapat" is present for the ongoing booking
  75  |     const ongoingCard = page.locator('div').filter({ hasText: 'Testing Checkout Rule' }).first();
  76  |     const akhiriBtn = ongoingCard.locator('button', { hasText: 'Akhiri Rapat' });
  77  |     await expect(akhiriBtn).toBeVisible();
  78  | 
  79  |     // Verify "Cetak PDF" is present for the completed booking
  80  |     // Note: It might be under the "Selesai" tab, but the mock injected it into the main list
  81  |     const completedCard = page.locator('div').filter({ hasText: 'Testing PDF Export' }).first();
  82  |     const pdfBtn = completedCard.locator('button', { hasText: /PDF/i });
  83  |     
  84  |     // We might need to click "Selesai" tab if the UI filters strictly by status
  85  |     const selesaiTab = page.locator('button[role="tab"], .tab').filter({ hasText: /Selesai/i }).first();
  86  |     if (await selesaiTab.isVisible()) {
  87  |         await selesaiTab.click();
  88  |     }
  89  | 
  90  |     await expect(pdfBtn).toBeVisible();
  91  | 
  92  |     // Verify PDF download starts when clicking
  93  |     // Playwright captures downloads via page.waitForEvent('download')
  94  |     const downloadPromise = page.waitForEvent('download');
  95  |     await pdfBtn.click();
  96  |     const download = await downloadPromise;
  97  |     expect(download.suggestedFilename()).toContain('Presensi_mock-completed-123.pdf');
  98  |   });
  99  | });
  100 | 
```