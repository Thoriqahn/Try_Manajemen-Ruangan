# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking.spec.ts >> Room Booking Flow >> should validate empty booking form fields
- Location: tests-e2e\booking.spec.ts:13:3

# Error details

```
Error: locator.click: Element is not visible
Call log:
  - waiting for locator('button:has-text("Pesan"), button:has-text("Booking"), a:has-text("Pesan")').first()
    - locator resolved to <button class="flex flex-col items-center gap-1 p-2 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">…</button>
  - attempting click action
    - scrolling into view if needed

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
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Room Booking Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login before each test
  6  |     await page.goto('/login');
  7  |     await page.fill('input[type="email"]', 'user@oikn.go.id');
  8  |     await page.fill('input[type="password"]', 'password123!');
  9  |     await page.click('button:has-text("Masuk")');
  10 |     await expect(page.locator('nav, aside, .MuiCard-root, h1').first()).toBeVisible({ timeout: 10000 });
  11 |   });
  12 | 
  13 |   test('should validate empty booking form fields', async ({ page }) => {
  14 |     // Navigate to Room list / Booking page
  15 |     // Assume there's a link to "Ruangan" or "Pesan Ruangan"
  16 |     const ruanganMenu = page.locator('a:has-text("Ruangan"), button:has-text("Ruangan"), a:has-text("Pesan")').first();
  17 |     await ruanganMenu.click();
  18 | 
  19 |     // Wait for the rooms page to load
  20 |     await expect(page.locator('h1, h2').filter({ hasText: /Ruangan|Pesan/i }).first()).toBeVisible();
  21 | 
  22 |     // Wait for the room list to appear
  23 |     await page.waitForSelector('text=Pesan', { timeout: 10000 });
  24 | 
  25 |     // Click on the first "Pesan" or "Booking" button on a room card
  26 |     const firstBookingBtn = page.locator('button:has-text("Pesan"), button:has-text("Booking"), a:has-text("Pesan")').first();
> 27 |     await firstBookingBtn.click({ force: true });
     |                           ^ Error: locator.click: Element is not visible
  28 | 
  29 |     // Submit form immediately without filling the "Agenda" to trigger validation
  30 |     const submitBtn = page.locator('button[type="submit"], button:has-text("Konfirmasi"), button:has-text("Submit")').first();
  31 |     await submitBtn.click();
  32 | 
  33 |     // Expect a validation error to appear for the required field
  34 |     const errorText = page.locator('text=wajib diisi, text=required, .Mui-error').first();
  35 |     await expect(errorText).toBeVisible();
  36 |   });
  37 | });
  38 | 
```