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
      - generic [ref=e42]: Menara v1.0.0
    - generic [ref=e43]:
      - banner [ref=e44]:
        - button [ref=e45]:
          - img [ref=e46]
        - generic [ref=e47]:
          - heading "Kalender Ruangan" [level=1] [ref=e48]
          - paragraph [ref=e49]: Cari dan pesan slot waktu yang tersedia
        - generic [ref=e50]:
          - img [ref=e51]
          - textbox "Cari ruangan, booking..." [ref=e54]
        - button "Toggle Dark Mode" [ref=e55]:
          - img [ref=e56]
        - button [ref=e59]:
          - img [ref=e60]
        - generic [ref=e65] [cursor=pointer]: BS
      - main [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]:
              - heading "Kalender Ruangan" [level=2] [ref=e70]
              - paragraph [ref=e71]: Pilih tanggal untuk melihat jadwal & booking
            - button "Filter Ruangan" [ref=e72]:
              - img [ref=e73]
              - text: Filter Ruangan
          - generic [ref=e75]:
            - img [ref=e76]
            - text: Pilih tanggal → tahan & seret kolom waktu di baris ruangan untuk memilih durasi booking secara instan.
          - generic [ref=e78]:
            - generic [ref=e79]:
              - button [ref=e80]:
                - img [ref=e81]
              - generic [ref=e83]: Mei 2026
              - button [ref=e84]:
                - img [ref=e85]
            - generic [ref=e87]:
              - generic [ref=e88]: Sen
              - generic [ref=e89]: Sel
              - generic [ref=e90]: Rab
              - generic [ref=e91]: Kam
              - generic [ref=e92]: Jum
              - generic [ref=e93]: Sab
              - generic [ref=e94]: Min
            - generic [ref=e95]:
              - button "27" [disabled] [ref=e96]:
                - generic [ref=e98]: "27"
              - button "28" [disabled] [ref=e99]:
                - generic [ref=e101]: "28"
              - button "29" [disabled] [ref=e102]:
                - generic [ref=e104]: "29"
              - button "30" [disabled] [ref=e105]:
                - generic [ref=e107]: "30"
              - button "1" [disabled] [ref=e108]:
                - generic [ref=e110]: "1"
              - button "2" [disabled] [ref=e111]:
                - generic [ref=e113]: "2"
              - button "3" [disabled] [ref=e114]:
                - generic [ref=e116]: "3"
            - generic [ref=e117]:
              - button "4" [disabled] [ref=e118]:
                - generic [ref=e120]: "4"
              - button "5" [disabled] [ref=e121]:
                - generic [ref=e123]: "5"
              - button "6" [disabled] [ref=e124]:
                - generic [ref=e126]: "6"
              - button "7" [disabled] [ref=e127]:
                - generic [ref=e129]: "7"
              - button "8" [disabled] [ref=e130]:
                - generic [ref=e132]: "8"
              - button "9" [disabled] [ref=e133]:
                - generic [ref=e135]: "9"
              - button "10" [disabled] [ref=e136]:
                - generic [ref=e138]: "10"
            - generic [ref=e139]:
              - button "11" [disabled] [ref=e140]:
                - generic [ref=e142]: "11"
              - button "12" [disabled] [ref=e143]:
                - generic [ref=e145]: "12"
              - button "13" [disabled] [ref=e146]:
                - generic [ref=e148]: "13"
              - button "14" [disabled] [ref=e149]:
                - generic [ref=e151]: "14"
              - button "15" [disabled] [ref=e152]:
                - generic [ref=e154]: "15"
              - button "16" [disabled] [ref=e155]:
                - generic [ref=e157]: "16"
              - button "17" [disabled] [ref=e158]:
                - generic [ref=e160]: "17"
            - generic [ref=e161]:
              - button "18" [disabled] [ref=e162]:
                - generic [ref=e164]: "18"
              - button "19" [disabled] [ref=e165]:
                - generic [ref=e167]: "19"
              - button "20" [disabled] [ref=e168]:
                - generic [ref=e170]: "20"
              - button "21" [disabled] [ref=e171]:
                - generic [ref=e173]: "21"
              - button "22" [disabled] [ref=e174]:
                - generic [ref=e176]: "22"
              - button "23" [disabled] [ref=e177]:
                - generic [ref=e179]: "23"
              - button "24" [disabled] [ref=e180]:
                - generic [ref=e182]: "24"
            - generic [ref=e183]:
              - button "25" [disabled] [ref=e184]:
                - generic [ref=e186]: "25"
              - button "26" [disabled] [ref=e187]:
                - generic [ref=e189]: "26"
              - button "27" [disabled] [ref=e190]:
                - generic [ref=e192]: "27"
              - button "28" [disabled] [ref=e193]:
                - generic [ref=e195]: "28"
              - button "29 1 Ruang Kolaborasi Nusantara Workshop Penyusunan Peta Rencana Smart City IKN" [ref=e196]:
                - generic [ref=e197]:
                  - generic [ref=e198]: "29"
                  - generic [ref=e199]: "1"
                - generic [ref=e201]:
                  - generic [ref=e202]: Ruang Kolaborasi Nusantara
                  - generic [ref=e203]: Workshop Penyusunan Peta Rencana Smart City IKN
              - button "30 1 Ruang Rapat Eksekutif Garuda ⏳ Rapat Koordinasi Anggaran Divisi Teknologi Informasi Q3" [ref=e204]:
                - generic [ref=e205]:
                  - generic [ref=e206]: "30"
                  - generic [ref=e207]: "1"
                - generic [ref=e209]:
                  - generic [ref=e210]: Ruang Rapat Eksekutif Garuda
                  - generic [ref=e211]: ⏳ Rapat Koordinasi Anggaran Divisi Teknologi Informasi Q3
              - button "31" [ref=e212]:
                - generic [ref=e214]: "31"
          - generic [ref=e215]:
            - generic [ref=e218]: Tersedia
            - generic [ref=e221]: Hari Ini
            - generic [ref=e224]: Menunggu Persetujuan
            - generic [ref=e227]: Disetujui
            - generic [ref=e230]: Sedang Berjalan
            - generic [ref=e233]: Tutup
            - generic [ref=e236]: Sudah Lewat
  - button "Tap QR Check-In" [ref=e238]:
    - img [ref=e239]
    - generic [ref=e245]: Tap QR Check-In
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