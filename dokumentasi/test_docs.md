# Menara Room Management System - Test Documentation

Dokumen ini merangkum seluruh skenario uji coba (Unit Test) dalam aplikasi backend menggunakan format BDD (*Behavior-Driven Development*) yaitu **Given-When-Then**.

## 1. Authentication Tests (`auth.test.js`)

### Skenario 1.1: Registrasi Pengguna Baru Berhasil
- **Given** pengguna memberikan data registrasi yang valid (nama, email OIKN, dan password).
- **When** pengguna mengirimkan permintaan ke `/api/auth/register`.
- **Then** sistem mendaftarkan pengguna, mengirim OTP verifikasi, mengatur status awal menjadi *pending*, dan mengembalikan respon sukses.

### Skenario 1.2: Validasi Format Email
- **Given** pengguna memberikan data registrasi dengan format email yang tidak valid.
- **When** pengguna mengirimkan permintaan registrasi.
- **Then** sistem menolak permintaan tersebut dengan error validasi.

### Skenario 1.3: Penolakan Login untuk Akun Belum Diverifikasi
- **Given** pengguna yang sudah terdaftar tetapi memiliki status *pending* (belum diverifikasi OTP).
- **When** pengguna mencoba melakukan login dengan kredensial yang benar.
- **Then** sistem menolak akses login dan memberitahu bahwa akun belum diverifikasi.

### Skenario 1.4: Login Berhasil untuk Akun Aktif
- **Given** pengguna terdaftar dengan status *active*.
- **When** pengguna mencoba melakukan login dengan email dan password yang benar.
- **Then** sistem mengautentikasi pengguna dan mengembalikan JWT Access Token dan Refresh Token.

### Skenario 1.5: Login Gagal (Kredensial Salah)
- **Given** pengguna terdaftar dengan status *active*.
- **When** pengguna mencoba melakukan login dengan password yang salah.
- **Then** sistem menolak login karena kredensial tidak valid.

### Skenario 1.6: Pemeriksaan Kelengkapan Data Profil Integrasi SSO
- **Given** pengguna terautentikasi dan mencoba mengambil profil via `/api/auth/me`.
- **When** permintaan diterima oleh server.
- **Then** sistem mengembalikan profil pengguna, termasuk properti untuk integrasi SSO (seperti `position`, `work_unit`, `organization_unit`, dan `nip`) agar sinkronisasi OIKN berjalan mulus.

---

## 2. Rooms API Tests (`rooms.test.js`)

### Skenario 2.1: Akses Daftar Ruangan Tanpa Autentikasi
- **Given** seorang pengguna anonim (tanpa JWT token).
- **When** pengguna mencoba mengambil daftar ruangan dari `/api/rooms`.
- **Then** sistem menolak akses dengan status `401 Unauthorized`.

### Skenario 2.2: Akses Daftar Ruangan Dengan Autentikasi
- **Given** seorang pengguna reguler dengan JWT token yang valid.
- **When** pengguna mengambil daftar ruangan dari `/api/rooms`.
- **Then** sistem mengembalikan daftar ruangan yang tersedia.

### Skenario 2.3: Restriksi Pembuatan Ruangan (Role Guard)
- **Given** seorang pengguna dengan peran (role) *USER* reguler atau *ADMIN_KERJA* (Admin Workspace).
- **When** pengguna mencoba membuat ruangan baru melalui `/api/rooms` atau mengubah data ruang via `PUT`.
- **Then** sistem menolak aksi tersebut (status `403 Forbidden`) karena hak akses tidak mencukupi, memisahkan secara ketat batas kewenangan antara Ruang Rapat dan Workspace.

### Skenario 2.4: Pembuatan Ruangan Berhasil oleh Superadmin
- **Given** seorang pengguna dengan peran *SUPERADMIN*.
- **When** pengguna mencoba membuat ruangan baru dengan rincian yang valid.
- **Then** sistem berhasil membuat ruangan, meng-*generate* Token QR unik, dan mengembalikan data ruangan.

### Skenario 2.5: Validasi Tipe Ruangan (Enum Check)
- **Given** seorang pengguna dengan peran *ADMIN_RAPAT*.
- **When** pengguna mencoba membuat ruangan dengan tipe yang tidak dikenal (misal: "magic").
- **Then** sistem menolak pembuatan ruangan karena kesalahan validasi input.

### Skenario 2.6: Akses Detail Ruangan Berdasarkan ID
- **Given** sebuah ruangan yang ada di dalam sistem.
- **When** pengguna yang terautentikasi meminta rincian ruangan (GET `/api/rooms/:id`).
- **Then** sistem mengembalikan data ruangan secara detail berdasarkan ID.

### Skenario 2.7: Perubahan Data Ruangan (Update/PUT) Berhasil
- **Given** seorang Superadmin/Admin dan ruangan yang valid.
- **When** Admin melakukan modifikasi kapasitas atau data ruangan lainnya via `/api/rooms/:id`.
- **Then** sistem memperbarui data tersebut dan menyimpannya ke database.

### Skenario 2.8: Penolakan Update oleh Pengguna Biasa
- **Given** sebuah ruangan dan pengguna reguler (*USER*).
- **When** pengguna mencoba meng-update data ruangan.
- **Then** sistem menolak aksi (status `403 Forbidden`).

### Skenario 2.9: Penghapusan Ruangan (Delete/Soft Delete) Berhasil
- **Given** seorang Superadmin dan sebuah ruangan yang sudah ada.
- **When** Superadmin melakukan *request DELETE* ke `/api/rooms/:id`.
- **Then** sistem menghapus (melakukan *soft delete*) ruangan tersebut sehingga tidak lagi muncul saat dicari.

### Skenario 2.10: Pengecekan Ketersediaan Ruangan (Availability)
- **Given** sebuah ruangan yang memiliki jadwal pemesanan pada hari/minggu tertentu.
- **When** pengguna memanggil API ketersediaan ruangan (`/api/rooms/:id/availability`).
- **Then** sistem mengembalikan struktur data array ketersediaan harian yang valid (termasuk status jam kosong maupun *blackout date*).

### Skenario 2.11: Filter Pencarian Ruangan berdasarkan Kapasitas
- **Given** kumpulan ruangan dengan berbagai kapasitas *layout*.
- **When** pengguna melakukan pencarian ruangan dengan menggunakan *query string* kapasitas (contoh: `?capacity=1000`).
- **Then** sistem hanya mengembalikan ruangan yang memiliki *layout* dengan kapasitas minimal sama dengan yang diminta (menghasilkan array kosong jika kapasitas jauh melebihi ukuran semua ruangan).

### Skenario 2.12: Validasi Format File Upload (Multer)
- **Given** sebuah *endpoint* unggah gambar ruangan (`POST /api/rooms/:id/upload`) yang dilindungi *middleware Multer*.
- **When** pengguna mencoba mengunggah file dengan format yang tidak diizinkan (misalnya `.pdf` atau `.exe`).
- **Then** sistem mendeteksi tipe *MIME* yang tidak valid dan menolak unggahan tersebut dengan status error `400` atau `500`.

---

## 3. Bookings API Tests (`bookings.test.js`)

### Skenario 3.1: Pembuatan Pemesanan Normal
- **Given** seorang pengguna dan sebuah ruangan fisik yang valid.
- **When** pengguna membuat permintaan pemesanan (*booking*) untuk tanggal mendatang dan di dalam jam operasional.
- **Then** sistem mencatat pemesanan dengan status *pending* (atau *confirmed* jika *instant approval*).

### Skenario 3.2: Pencegahan IDOR (*Insecure Direct Object Reference*)
- **Given** ada sebuah pemesanan valid milik User A.
- **When** User B mencoba untuk membatalkan/menghapus pemesanan milik User A.
- **Then** sistem mendeteksi ketidaksesuaian ID dan menolak akses (*Forbidden*).

### Skenario 3.3: Restriksi Persetujuan oleh Non-Admin
- **Given** ada sebuah pemesanan dengan status *pending*.
- **When** pengguna reguler (non-admin) mencoba menyetujui (*approve*) pemesanan tersebut.
- **Then** sistem menolak aksi tersebut karena kurangnya hak akses.

### Skenario 3.4: Pembatalan Pemesanan Milik Sendiri
- **Given** ada pemesanan valid milik User A.
- **When** User A membatalkan pemesanannya sendiri.
- **Then** sistem mengupdate status pemesanan menjadi *cancelled*.

### Skenario 3.5: Pencegahan Double Booking (Konflik Jadwal)
- **Given** ada pemesanan di Ruang X pada jam 09:00 - 11:00 yang telah terdaftar.
- **When** pengguna lain mencoba memesan Ruang X pada jam 10:00 - 12:00 di hari yang sama.
- **Then** sistem menolak pemesanan kedua karena terdeteksi bentrok (overlap jadwal).

### Skenario 3.6: Persetujuan Pemesanan oleh Admin
- **Given** sebuah pemesanan dengan status *pending*.
- **When** seorang Admin/Superadmin menyetujui pemesanan tersebut.
- **Then** sistem mengubah status pemesanan menjadi *confirmed*.

### Skenario 3.7: Penolakan Klaim Awal QR Code oleh Peserta Lain (Bukan Pemilik)
- **Given** sebuah pemesanan ruangan yang telah disetujui namun belum di-check-in/diklaim.
- **When** pengguna *lain* (bukan pembuat pesanan) men-scan QR code ruangan.
- **Then** sistem menolak karena klaim (check-in pertama) harus dilakukan oleh pembuat pemesanan (Owner).

### Skenario 3.8: Klaim Awal Berhasil oleh Pemilik Pemesanan (Check-In)
- **Given** sebuah pemesanan ruangan yang telah disetujui.
- **When** sang pembuat pesanan (Owner) men-scan Token QR ruangan yang benar.
- **Then** sistem berhasil mencatat ruangan telah diklaim (*checked-in*) dan mengubah status kepemilikan sesi.

### Skenario 3.9: Pencatatan Kehadiran/Presensi oleh Peserta Lain
- **Given** sebuah pemesanan ruangan yang sudah berhasil diklaim (sudah di-check-in oleh Owner).
- **When** pengguna lain (peserta rapat) men-scan QR code ruangan yang sama.
- **Then** sistem mencatat aktivitas tersebut sebagai presensi kehadiran, bukan klaim ruangan, dan mengembalikan pesan sukses.

### Skenario 3.10: Penolakan Scan QR Palsu
- **Given** sebuah pemesanan ruangan yang sah.
- **When** pengguna mencoba men-scan QR Token yang tidak terdaftar di sistem.
- **Then** sistem mengembalikan error `404 Not Found` (QR tidak dikenali).

### Skenario 3.11: Pencegahan Konflik Akun Host Zoom (Virtual Meeting)
- **Given** sistem memiliki satu Akun Zoom Host (dummy) dan sebuah pemesanan meeting *online* telah mem-booking akun Zoom tersebut di jam 13:00 - 15:00.
- **When** pengguna lain mencoba memesan meeting *online* di jam 14:00 - 16:00.
- **Then** sistem menolak pembuatan pemesanan *online* baru karena tidak ada ketersediaan akun Zoom Host yang kosong (menghindari double-booking akun Zoom).

### Skenario 3.12: Privasi Riwayat Pemesanan Pengguna
- **Given** ada dua *User* reguler di dalam sistem. User B memiliki rapat yang sangat rahasia.
- **When** User A melakukan *request* untuk melihat daftar seluruh pemesanan via `/api/bookings`.
- **Then** sistem memfilter *query* secara internal dan hanya mengembalikan daftar pemesanan milik User A saja, merahasiakan jadwal User B.

### Skenario 3.13: Update Jadwal Pemesanan dan Pencegahan Konflik (Reschedule)
- **Given** pengguna memiliki pemesanan yang valid dan ingin memundurkan jam (*reschedule*).
- **When** pengguna melakukan *request PUT* ke `/api/bookings/:id`.
- **Then** sistem akan:
  - Mengizinkan pembaruan jika jadwal baru tersebut kosong, DAN
  - Secara tegas menolak (*Conflict*) jika pada jadwal yang baru tersebut ruangan sudah terlebih dahulu dipesan oleh orang lain.

### Skenario 3.14: Presensi Kehadiran Publik via Link/QR (Tanpa Login)
- **Given** sebuah rapat yang sedang aktif (*ongoing* atau segera dimulai) dan memiliki sebuah tautan/form kehadiran publik.
- **When** seorang tamu eksternal (tidak perlu login) mengirimkan data kehadirannya melalui *endpoint* `POST /api/public/attendances/:bookingId` dengan format nama, institusi, jabatan, dan email.
- **Then** sistem memvalidasi jam rapat tersebut, memastikan rapat sedang aktif/berlangsung, lalu mencatatkan nama tamu tersebut ke dalam database kehadiran rapat (*meeting attendees*) dengan balasan status berhasil `200`.

### Skenario 3.15: Akhiri Rapat & Pemotongan Jadwal Dinamis (Checkout)
- **Given** sebuah rapat dengan status *ongoing*.
- **When** sang pembuat pesanan (Owner) atau Admin melakukan eksekusi perintah `POST /api/bookings/:id/end`.
- **Then** sistem akan mengubah status rapat menjadi *completed*, memotong (*truncate*) jam `end_time` rapat menjadi jam saat eksekusi agar slot ruangan segera dibebaskan, dan sistem akan menolak segala upaya presensi setelahnya.

### Skenario 3.16: Penyelesaian Otomatis Rapat Kedaluwarsa (Cron Job)
- **Given** sebuah rapat dengan status *ongoing* yang waktu selesainya (`end_time`) telah terlewat dari jam saat ini.
- **When** sistem *worker* berjalan (berjalan setiap 1 menit di `noShowWorker.js`).
- **Then** sistem mendeteksi rapat tersebut, secara otomatis mengubah statusnya menjadi *completed*, dan memberikan label audit bahwa rapat diselesaikan secara otomatis.

### Skenario 3.17: Standarisasi Zona Waktu (IKN/WITA) untuk Pengecekan Tanggal
- **Given** server dijalankan pada lingkungan dengan zona waktu *default* UTC (contoh: server sedang berada di hari Kamis jam 23:00 UTC, namun waktu di IKN/Makassar sudah menunjukkan hari Jumat jam 07:00 WITA).
- **When** sistem menjalankan skenario pengujian lintas hari (*midnight roll-over*) atau memvalidasi sesi kehadiran (*check-in/public attendance*).
- **Then** sistem tidak akan mengalami kendala kegagalan tanggal. Sistem secara *hardcoded* mengubah dasar *offset* menjadi IKN time (UTC+08:00) menggunakan algoritma `(Date.now() + 8 * 60 * 60 * 1000)` agar pencatatan *log* selalu konsisten terlepas dari konfigurasi *server*.

---

## 4. Workspaces API Tests (`workspaces.test.js`)

### Skenario 4.1: Fetch Workspace Layout
- **Given** seorang pengguna dengan token JWT yang valid dan ID ruangan (WORKSPACE) yang valid.
- **When** pengguna mengakses endpoint `/api/v1/workspaces/:room_id/layout`.
- **Then** sistem mengembalikan struktur lantai (denah) meja kerja yang mencakup status ketersediaan setiap meja (OCCUPIED/VACANT).

### Skenario 4.2: Request Penugasan Meja (Seating Request)
- **Given** sebuah meja kerja di dalam ruangan WORKSPACE yang berstatus VACANT.
- **When** pengguna mengajukan permohonan untuk menempati meja tersebut.
- **Then** sistem mencatat permohonan dengan status PENDING dan mengirimkan notifikasi ke Admin Ruangan.

### Skenario 4.3: Menampilkan Permintaan Tertunda dan Meja Saat Ini
- **Given** seorang pengguna yang telah mengajukan permohonan meja dan/atau sedang menempati sebuah meja.
- **When** pengguna mengakses `/api/v1/workspaces/assignments/my-desk`.
- **Then** sistem mengembalikan data permohonan yang masih PENDING dan rincian meja yang sedang ditempati.

### Skenario 4.4: Menyetujui Permintaan Meja oleh Admin
- **Given** sebuah permohonan meja dengan status PENDING.
- **When** seorang Admin Ruangan atau Super Admin menyetujui (approve) permintaan tersebut.
- **Then** sistem mengubah status meja menjadi OCCUPIED, status permohonan menjadi APPROVED, dan menghapus kepemilikan meja lama pengguna.

### Skenario 4.5: Menolak Permintaan Meja oleh Admin
- **Given** sebuah permohonan meja dengan status PENDING.
- **When** seorang Admin Ruangan menolak permohonan tersebut beserta alasan penolakan.
- **Then** sistem mengembalikan permohonan ke status REJECTED, status meja tetap VACANT, dan mengirimkan notifikasi ke pemohon.
### Skenario 4.6: Pewarisan Hak Akses Admin Gabungan (ADMIN)
- **Given** seorang pengguna yang memiliki jabatan "Admin Gabungan" (rawRole: `ADMIN`).
- **When** pengguna tersebut melakukan mutasi atau mengakses riwayat permohonan meja via `/api/v1/workspaces/*`.
- **Then** sistem middleware (`rawRoleGuard` dan `checkRawRole`) secara native mengizinkan *request* tersebut karena peran `ADMIN` secara implisit mewarisi seluruh kapabilitas `ADMIN_KERJA` dan `ADMIN_RAPAT`.

### Skenario 4.7: Rendering Role-Based Admin Dashboard
- **Given** pengguna memiliki hak akses sebagai admin (`ADMIN_RAPAT`, `ADMIN_KERJA`, atau `ADMIN`).
- **When** pengguna melakukan *request GET* ke `/api/stats/admin` dan membuka halaman `AdminDashboard`.
- **Then** UI sistem secara dinamis hanya menampilkan blok "Statistik Ruang Rapat" (untuk admin rapat), blok "Statistik Ruang Kerja" (untuk admin kerja), atau **keduanya** secara bersamaan (jika admin gabungan).
### Skenario 4.8: Dynamic Filtering Admin Dashboard (Superadmin)
- **Given** pengguna memiliki hak akses sebagai Superadmin.
- **When** pengguna memfilter data dashboard berdasarkan spesifik admin (`selectedAdminFilter`) pada halaman `AdminDashboard`.
- **Then** sistem tidak hanya menyesuaikan parameter kueri statistik (`admin_id`), namun juga secara dinamis mengubah blok komponen UI untuk **hanya menampilkan** panel metrik yang relevan dengan peran dasar dari admin yang sedang difilter (misal: jika difilter ke Admin Rapat, panel Workspace disembunyikan).

### Skenario 4.9: Pengiriman dan Polling Notifikasi Otomatis
- **Given** sebuah *event* krusial sistem (seperti Admin Kerja yang melakukan *Force Assign* meja ke seorang user).
- **When** klien *frontend* menjalankan interval *polling* periodik (setiap 10 detik) ke API `/api/notifications`.
- **Then** aplikasi klien dapat secara andal memuat dan menampilkan indikator (titik merah lonceng) beserta pesan *pop-over* tanpa interaksi *refresh* halaman secara manual dari user, dan tanpa mengalami error routing (*API prefix duplication*).

---

## 5. Zoom API Tests (`zoom.test.js`)

### Skenario 5.1: Akses Konfigurasi Zoom
- **Given** seorang Super Admin.
- **When** mengambil (GET) atau memperbarui (PUT) konfigurasi OAuth Zoom.
- **Then** sistem menyimpan kredensial ke dalam database dan mencatatnya ke dalam Audit Log.

### Skenario 5.2: Test Koneksi Server-to-Server Zoom
- **Given** sebuah konfigurasi Zoom yang tersimpan.
- **When** Super Admin melakukan tes koneksi.
- **Then** sistem memanggil API autentikasi Zoom dan mengembalikan sukses jika token berhasil didapatkan.

### Skenario 5.3: Manajemen Akun Zoom
- **Given** seorang Super Admin.
- **When** menambahkan (POST), melihat daftar (GET), memverifikasi lisensi (POST verify), atau menghapus (DELETE) akun Zoom.
- **Then** sistem memperbarui data *pool* akun Zoom di database sesuai aksi yang dilakukan.

---

## 6. Users API Tests (`users.test.js`)

### Skenario 6.1: Menampilkan Daftar dan Detail Pengguna
- **Given** seorang Super Admin.
- **When** mengambil daftar semua pengguna atau detail pengguna tertentu.
- **Then** sistem mengembalikan data akun, peran (role), dan riwayat tugas ruangan (jika admin).

### Skenario 6.2: Mengubah Role Pengguna
- **Given** seorang pengguna biasa (USER).
- **When** Super Admin mengubah peran pengguna tersebut menjadi Admin Ruangan.
- **Then** sistem memodifikasi database untuk role akun dan mencatat ke Audit Log.

### Skenario 6.3: Mengubah Status (Suspend/Active)
- **Given** seorang pengguna dengan status aktif.
- **When** Super Admin menonaktifkan (*inactive*) akun pengguna tersebut.
- **Then** sistem mengubah status menjadi *inactive* sehingga akun tersebut tidak dapat mengakses sistem.

### Skenario 6.4: Manajemen Wilayah Tugas Admin
- **Given** seorang pengguna berstatus Admin Ruangan.
- **When** Super Admin memetakan ID Ruangan ke Admin tersebut.
- **Then** sistem mengganti pemetaan ruangan (Room Assignments) yang ada dengan set ruangan terbaru.

---

## 7. Buildings API Tests (`buildings.test.js`)

### Skenario 7.1: Manajemen Gedung
- **Given** seorang Super Admin.
- **When** menambahkan (POST), mengubah (PUT), atau menghapus (DELETE) gedung.
- **Then** sistem memproses gambar yang diunggah (jika ada), menyimpan informasi metadata, dan menghasilkan respon sukses.

### Skenario 7.2: Manajemen Lantai Gedung
- **Given** sebuah entitas Gedung yang sudah ada.
- **When** Super Admin menambahkan lantai (Floor) baru ke gedung tersebut.
- **Then** sistem menambahkan referensi lantai yang diikatkan ke ID Gedung terkait.

---

## 8. System Support API Tests (`system.test.js`)

### Skenario 8.1: Pengambilan Statistik Admin (Dashboard)
- **Given** seorang Admin Ruangan.
- **When** memanggil endpoint `/api/stats/admin`.
- **Then** sistem mengembalikan rekapitulasi data pemesanan, ketersediaan ruangan, dan notifikasi yang hanya relevan dengan ruangan milik admin tersebut.

### Skenario 8.2: Pengambilan Statistik Global (Dashboard)
- **Given** seorang Super Admin.
- **When** memanggil endpoint `/api/stats/global`.
- **Then** sistem mengembalikan agregasi data sistem penuh (semua ruangan, semua pemesanan, utilitas).

### Skenario 8.3: Konfigurasi Kebijakan dan Blackout Dates
- **Given** seorang Super Admin.
- **When** mengubah konfigurasi batas maksimum pemesanan atau menambah/menghapus tanggal libur (*blackout date*).
- **Then** sistem memperbarui *booking policies* yang akan dievaluasi saat pengguna membuat pemesanan di masa depan.

### Skenario 8.4: Akses Audit Log
- **Given** seorang Super Admin.
- **When** mengakses endpoint riwayat log sistem `/api/audit`.
- **Then** sistem mengembalikan seluruh jejak aktivitas pengguna (perubahan konfigurasi, perubahan pengguna, dll) yang tersimpan.

---

## 9. Audit API Tests (`audit.test.js`)

### Skenario 9.1: Filter dan Pencarian Audit Log
- **Given** seorang Super Admin dan database audit_logs yang telah terisi.
- **When** Super Admin mengakses `/api/audit` dengan parameter *query string* seperti `action`, `actor`, atau `search`.
- **Then** sistem mengembalikan daftar log yang relevan secara akurat sesuai dengan filter yang diberikan, dan menangani pagination dengan batas *limit* dan *offset* yang ditentukan.

---

## 10. Policy API Tests (`policy.test.js`)

### Skenario 10.1: Pembatalan Otomatis (Auto-Cancel) akibat Blackout Date
- **Given** terdapat sebuah pemesanan ruangan pada tanggal esok hari yang berstatus *pending* atau *confirmed*.
- **When** Super Admin menetapkan tanggal esok hari tersebut sebagai hari libur darurat (*Blackout Date*) melalui `POST /api/policy/blackout`.
- **Then** sistem akan membuat aturan libur, mendeteksi semua pemesanan pada hari tersebut, **membatalkannya secara otomatis**, memberikan alasan sesuai alasan *blackout*, dan mengirimkan notifikasi kepada pengguna terkait.

---

## 11. Public API Tests (`public.test.js`)

### Skenario 11.1: Akses Layar Publik TV
- **Given** sebuah ruangan yang memiliki jadwal rapat aktif saat ini.
- **When** perangkat TV atau Kiosk tanpa autentikasi mengakses endpoint `/api/public/bookings/:id`.
- **Then** sistem mengembalikan informasi esensial dari rapat (seperti agenda, waktu, dan nama host) untuk ditampilkan di layar umum tanpa membocorkan data sensitif peserta secara keseluruhan.

### Skenario 11.2: Pemindaian QR Kiosk (Active Booking Retrieval)
- **Given** sebuah ruangan fisik dengan Token QR unik yang sedang digunakan untuk rapat.
- **When** perangkat eksternal mengakses `/api/public/qr/:token`.
- **Then** sistem mengidentifikasi ruangan berdasarkan Token QR dan otomatis mencari jadwal rapat yang sedang berstatus *ongoing* atau akan segera dimulai dalam waktu dekat, lalu mengembalikan ID Booking-nya.

---

## 12. Token API Tests (`token.test.js`)

### Skenario 12.1: Pembuatan Akses Token Eksternal
- **Given** seorang Super Admin.
- **When** meminta pembuatan token akses baru (API Key) untuk keperluan integrasi perangkat luar melalui `POST /api/tokens`.
- **Then** sistem akan menghasilkan pasangan `Client ID` dan `Secret Key`, menyimpan versi hash dari Secret di database, dan hanya menampilkan `Secret Key` satu kali saja pada *response* awal.

### Skenario 12.2: Pencabutan Token Eksternal (Revocation)
- **Given** sebuah token akses eksternal yang masih aktif.
- **When** Super Admin mencabut token tersebut via `DELETE /api/tokens/:id`.
- **Then** sistem merubah status token menjadi *revoked* sehingga sistem eksternal tidak lagi dapat memakainya (soft-delete).
