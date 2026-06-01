# Dokumentasi Pengujian Frontend (Frontend Test Docs)

Dokumen ini berisi penjelasan mengenai unit testing yang telah diimplementasikan untuk antarmuka pengguna (Frontend) di dalam sistem Manajemen Ruangan.

## 1. Alat Pengujian (Testing Tools)
- **Framework Testing:** Vitest
- **DOM Environment:** Happy-dom
- **Testing Library:** `@testing-library/react`, `@testing-library/jest-dom`
- **Mocking:** Vitest (vi.mock, vi.fn)

## 2. Persiapan (Setup)
Lingkungan pengujian diatur pada file `src/test/setup.ts` yang mencakup:
- Ekstensi matcher jest-dom.
- *Mocking* untuk object global pada browser yang tidak secara *native* didukung oleh `happy-dom`, seperti:
  - `window.matchMedia`
  - `global.ResizeObserver`
  - `global.fetch` dan `window.fetch` (menggunakan placeholder yang aman).
- Pembersihan *mocks* secara otomatis setelah pengujian dilakukan.

## 3. Komponen yang Diuji

### 3.1. LoginPage (`src/__tests__/LoginPage.test.tsx`)
Komponen LoginPage diuji untuk skenario alur autentikasi, pengecekan render antarmuka dan validasi input.
- **Memeriksa Render Awal:** Memastikan input untuk `Email` dan `Password` dirender dengan benar.
- **Validasi Form Kosong/Invalid:** Memastikan bahwa tombol `Masuk ke Sistem` dalam kondisi *disabled* apabila *input* email belum valid atau password belum mencukupi 8 karakter.

### 3.2. MyBookings (`src/__tests__/MyBookings.test.tsx`)
Pengujian ditujukan untuk User Dashboard (Reservasi Saya / Agenda Rapat).
- **Service Mocks:** `bookingService`, `workspaceService`, `buildingService`, dan `roomService` dimock menggunakan `vi.mock` dengan mengembalikan flag `success: true` dan data statis.
- **Render Daftar Bookings:** Memeriksa apakah `MyBookings` dapat memuat *API calls* dengan sukses dan menampilkan agenda seperti "Rapat Evaluasi" ke layar, menggunakan *status* "pending" sehingga rapat ditampilkan pada tab "Mendatang" (upcoming) yang terbuka secara *default*.

### 3.3. RoomManagement (`src/__tests__/RoomManagement.test.tsx`)
Pengujian terhadap halaman admin Kelola Ruangan untuk memastikan CRUD sederhana (Read & Delete/Toggle status) bisa berfungsi.
- **Service Mocks:** `roomService.list`, `buildingService.list` dimock agar tabel memiliki data "Ruang Rapat Eksekutif" dan "Gedung A".
- **Render Tabel:** Mengecek bahwa nama ruangan, nama gedung, serta data balasan termuat dalam baris tabel DOM.
- **Tombol Aksi & Konfirmasi Status:** Menemukan tombol "Nonaktifkan" (atau *Power Button* untuk toggle status) pada tabel dan mengujinya apabila tombol tersebut diklik, modul peringatan "Nonaktifkan Ruangan?" dapat muncul (modal).

### 3.4. ScheduleControl (`src/__tests__/ScheduleControl.test.tsx`)
Pengujian ditujukan untuk Admin & Superadmin Dashboard (Pengendalian Jadwal).
- **Service Mocks:** `bookingService.list`, `bookingService.getAttendees` serta fungsi cetak `generateAttendancePDF` dimock.
- **Unduh PDF Presensi:** Memeriksa keberadaan tombol "Cetak PDF Presensi" pada tabel untuk status "completed", memastikan klik pada tombol tersebut memanggil fungsi `getAttendees` dan mengeksekusi `generateAttendancePDF` dengan argumen yang benar (seperti *booking.id*, *room_name*, dsb), serta menampilkan *toast success*.
- **Handling Peserta Kosong:** Memastikan jika *API* mengembalikan peserta kosong, aplikasi tidak membuat PDF melainkan menampilkan *toast error*.

### 3.5. Ekspor PDF Presensi (`src/__tests__/pdfExport.test.ts`)
Pengujian ditujukan untuk fungsi utilitas pembuat dokumen laporan absensi.
- **Dynamic Text Wrapping:** Memastikan fungsi rendering menggunakan kalkulasi tinggi dokumen yang tepat apabila label `agenda` atau `roomName` sangat panjang, membuktikan utilitas jsPDF `splitTextToSize` diimplementasikan dengan kalkulasi tinggi kotak yang elastis.
- **Konsistensi Gaya Tombol Dasbor:** Memastikan komponen `MyBookings.tsx` dan `ScheduleControl.tsx` menggunakan gaya render tombol "Daftar Hadir" (dengan ikon `Download`) yang identik satu sama lain.

## 4. Tantangan dan Penyelesaian
- **Named vs Default Exports:** Pengujian memerlukan impor spesifik `{ RoomManagement }` dan bukan `default export`.
- **Modul Service Layer:** Service API seperti `roomService.list` diletakkan di `app/services/roomService`. *Mocking* path yang salah (seperti `../services/roomService.ts` di mana path alias tidak dikenali) memicu error `NetworkError`. Kami menyesuaikan path import yang dimock menjadi path relatif secara langsung `../app/services/roomService` atau meniru resolusi root.
- **Data Response Structure:** Kami mendapati masalah apabila `res.success` dalam *mock* tidak ditentukan nilainya sebagai `true`, komponen akan menganggap API gagal. Data mock kini mengembalikan respons utuh (e.g. `{ success: true, data: [...] }`).
- **Conditional Disabled Button:** Di form login, apabila email kosong tombol login sudah dilarang *(disabled)* diklik sehingga pengujian yang men-trigger tombol tidak terjadi. Pengujian diubah dengan menggunakan klausa pengecekan status *disabled* dari tombol tersebut.

## 5. Menjalankan Tes
Seluruh pengujian Frontend dapat dieksekusi dengan mengetik perintah berikut di dalam terminal:

```bash
npm test
```
atau
```bash
npm run test
```

Perintah di atas akan menjalankan Vitest dan merender laporan keberhasilan ke terminal. Hasil pengujian menunjukkan `7 passed (100% success rate)` untuk bagian Frontend.
