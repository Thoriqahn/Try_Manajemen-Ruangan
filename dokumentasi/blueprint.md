# Blueprint Sistem Manajemen Ruangan (Room Management System)

Dokumen ini adalah **Spesifikasi Lengkap dan Aturan Bisnis (Business Rules)** dari Sistem Manajemen Ruangan. Berfungsi sebagai panduan komprehensif bagi developer, product manager, administrator, dan pihak operasional. 

Semua kapabilitas teknis di bawah ini telah terverifikasi melalui Unit Testing dan dirancang agar mendukung pola kerja organisasi modern yang mengedepankan fleksibilitas, keamanan data, dan keterlacakan (*traceability*).

---

## 1. Epic: Autentikasi, Manajemen Pengguna & Audit Trail
Epic ini memastikan bahwa sistem hanya dapat diakses oleh pihak yang berwenang, dengan rekam jejak aktivitas yang jelas.

### 1.1. Role-Based Access Control (RBAC)
Sistem menggunakan struktur hirarki dengan 3 tingkatan akses:
1. **Superadmin:**
   - Hak akses absolut (Global).
   - Mengelola pengguna dan menugaskan Admin untuk Departemen/Divisi tertentu.
   - Dapat melakukan intervensi tingkat sistem (contoh: menonaktifkan pengguna yang melanggar kebijakan).
2. **Admin:**
   - Hak akses teritorial (terbatas pada ruang lingkup Departemen/Divisi masing-masing).
   - Mengelola properti ruangan, fasilitas, dan persetujuan (Approve/Reject) reservasi.
   - Diberikan kemampuan *override* untuk membatalkan jadwal pengguna jika ada rapat dadakan dengan prioritas tinggi.
3. **User:**
   - Pengguna akhir. Hanya dapat melakukan reservasi, melihat ketersediaan ruang, mengundang kolega, serta melakukan *check-in/check-out*.

### 1.2. Aturan Keamanan & Sesi
- **Kredensial & Enkripsi:** Email valid (format ketat) dan Password minimal 8 karakter (dihash dengan *bcrypt*).
- **Session Management:** Autentikasi dikelola *stateless* menggunakan **JWT (JSON Web Token)**. API dilindungi dengan `authGuard` (validasi sesi) dan `roleGuard` (validasi level hak akses).

### 1.3. Sistem Audit Trail (Log Aktivitas)
- Setiap aktivitas kritikal (Pembuatan *Booking*, Persetujuan, Penolakan, Pembatalan sepihak, hingga riwayat *Check-in/Check-out*) selalu terekam di dalam database beserta *timestamp*-nya.
- Saat pemesanan dibatalkan (*Cancelled*), sistem **mewajibkan** pencantuman "Alasan Pembatalan" (*Cancellation Reason*) agar data historis dapat diaudit saat rekonsiliasi bulanan oleh manajemen.

---

## 2. Epic: Manajemen Gedung & Infrastruktur (Building Management)
Fondasi dari sistem tata ruang yang terstruktur. Sebelum sebuah ruangan fisik dapat dibuat, ia harus bernaung di bawah suatu infrastruktur dasar.

### 2.1. Hierarki Tata Letak (Spatial Hierarchy)
1. **Gedung (Buildings):** Master data gedung (contoh: "Gedung A", "Gedung B").
2. **Lantai (Floors):** Setiap gedung menampung daftar lantai. 
*Rule:* Sebuah ruangan fisik **wajib** terpetakan pada kombinasi Gedung dan Lantai spesifik untuk mempermudah pencarian ruang bagi pengguna (contoh: Filter *User* hanya menampilkan ruangan di Gedung B Lantai 3).

---

## 3. Epic: Manajemen Ruang Rapat (Meeting Room Management)
Pendataan dan operasional seluruh **ruang rapat** pertemuan yang ada di dalam perusahaan, disewakan berbasis *time-slot* (per jam/menit).

### 3.1. Klasifikasi Jenis Ruang Rapat
Sistem secara mutlak membedakan ruangan menjadi 3 metode:
1. **Fisik (Physical Room):** Ruangan terestrial di suatu Lantai/Gedung. Tunduk pada kapasitas fisik kursi. Wajib memiliki QR Code untuk verifikasi *Check-in*.
2. **Digital (Virtual Room):** Ruangan *Cloud* murni (contoh: Akun premium Zoom, MS Teams). Tidak memiliki batas kapasitas fisik (batasan berdasarkan lisensi partisipan). Tidak menggunakan sistem QR Code.
3. **Hybrid (Blended Room):** Ruangan fisik yang *sudah dilengkapi* infrastruktur *teleconference* terintegrasi. 
   - Ruangan ini mengharuskan verifikasi fisik (Check-in via QR).
   - Memiliki tautan (*link*) rapat digital yang *ter-generate* atau disediakan secara sinkron bersamaan dengan pemesanan fisik.
   - Digunakan ketika peserta rapat terpecah menjadi *On-site* dan *Remote*.

### 3.2. Properti Dinamis Ruangan
- **Tipe Persetujuan:** 
  - *Instan:* Langsung *Confirmed* ketika di-booking.
  - *Manual:* Menjadi *Pending*, mewajibkan persetujuan Admin ruangan.
- **Layout Fleksibel:** Ruangan fisik dapat dikonfigurasi tata letaknya (Classroom, Theater, U-Shape, Banquet) dengan batas maksimal peserta yang menyesuaikan layout pilihan.
- **Fasilitas (Amenities):** Modul inventaris dinamis per ruang (contoh: Proyektor, Kamera 360, dll.).

### 3.3. Keamanan Fisik (QR Code Token)
Setiap ruangan berjenis **Fisik** dan **Hybrid** secara *native* digenerate sebuah "QR Token". Admin harus mencetaknya agar dapat ditempel di depan pintu untuk keperluan validasi *check-in* secara lokasional.

---

## 4. Epic: Manajemen Ruang Kerja (Workspace Seating Management)
Epic yang terpisah dari skema "Sewa Per Jam", difokuskan pada manajemen meja *Hot Desking* (pola kerja Hybrid/WFA).

### 4.1. Manajemen Kuota dan Alokasi
- **Workspace:** Adalah area kerja kolosal yang tidak dipesan dengan durasi menit, melainkan berbasis hari (Daily) atau permanen (Assigned).
- **Monitoring Kapasitas:** Modul secara otomatis melacak kuota meja yang tersisa pada hari tertentu di departemen tertentu. 

### 4.2. Proses Permohonan vs Penugasan
- **Fleksibel (Request-Based):** Staf mengajukan *booking* ke kantor pada hari H.
- **Permanen (Assigned):** Staf kunci / manajer dapat ditetapkan kursinya secara permanen oleh Admin sehingga slot tersebut terkunci.
- *Check-in Workspace* jauh lebih longgar dan tidak dapat dibatalkan otomatis (*No-Show penalty*) secepat sistem Ruang Rapat.

---

## 5. Epic: Integrasi Eksternal & API (Third-Party Integrations)
Mendukung ekosistem cerdas agar aplikasi terhubung dengan *platform* komunikasi perusahaan.

### 5.1. Integrasi Video Conference (Zoom API / Teleconference)
- Untuk ruangan tipe **Digital** dan **Hybrid**, pemesanan rapat dapat melakukan *hook* ke API Zoom atau sistem teleconference terkait.
- Saat pemesanan disetujui (*Confirmed*), sistem akan otomatis mencantumkan *Link Rapat* (Meeting URL) di dalam undangan, yang langsung bisa diklik (Join) oleh partisipan melalui Dashboard (beranda *My Bookings*).
- **Deteksi Keluar/Masuk (Zoom Webhooks):** Sistem ini mengimplementasikan pendengar pasif (*listener*) yang dihubungkan ke fitur **Webhook** milik Zoom (contoh *events*: `endpoint.participant_joined` dan `endpoint.participant_left`). Berkat integrasi ini, ketika pengguna masuk (Join) atau keluar (Leave) dari ruang Zoom, *backend* kita akan menerima notifikasi secara seketika (*real-time*). Sistem lalu mencocokkan ID akun Zoom dengan pengguna kita guna merombak durasi partisipasi aktual mereka, sekaligus men-*trigger* status kehadiran secara dinamis di latar belakang tanpa menuntut partisipan mengeklik tombol absensi manual.

---

## 6. Epic: Pemesanan Ruang Rapat (Booking Management)
Mengatur logika *booking* dari hulu ke hilir.

### 6.1. Aturan Ketat Resolusi Konflik (Anti-Overlapping)
- Algoritma validasi berlapis memblokir dua rapat (berstatus `pending`, `confirmed`, atau `ongoing`) yang saling bersinggungan di waktu dan ruangan yang sama. 

### 6.2. Manajemen Undangan (Attendees)
- Host (Pembuat *Booking*) dapat meng-input email peserta internal (*Attendees*).
- Rapat tersebut akan tertaut di akun para *Attendees* dengan status `attending`, mempermudah kolaborasi dan penyebaran tautan *Zoom* (untuk Hybrid/Digital).

---

## 7. Epic: Presensi Rapat dan Check-in / Check-out
Sistem proteksi agar aset ruang perusahaan benar-benar digunakan secara optimal dan mendeteksi fenomena *Ghost Meetings*.

### 7.1. Jendela Waktu Check-In (Strict Check-In Windows)
Berlaku bagi ruangan **Fisik** dan **Hybrid** dengan memindai QR Code:
1. **Early Check-In (10 Menit):** *Check-in* tercepat yang valid hanya boleh dilakukan 10 menit sebelum waktu mulai.
2. **Intrusion Block (Blokir Penyerobotan):** Saat Host melakukan *Early Check-in*, sistem melakukan inspeksi silang. Apabila sesi rapat milik orang lain sebelumnya masih *Ongoing* (belum usai), maka akses *Check-In* ditolak paksa hingga pengguna terdahulu menekan *Check-Out*.
3. **Late Check-In & Kedaluwarsa (15 Menit):** Batas toleransi maksimal dari sistem. Lebih dari 15 menit sesudah jadwal rapat, *Check-In* diblokir. Pemesanan secara teknis hangus (*No-Show*).

### 7.2. Hierarki Check-In (Host vs Attendee)
- **Claim Ruangan (Host):** Pembuat pesanan (*Host*) bertanggung jawab sebagai orang pertama yang harus mengklaim ruangan dengan melakukan *Check-in*. Jika *Host* belum memindai QR Code untuk *check-in*, status rapat masih akan tetap pada masa tunggu (*Confirmed/Pending Check-in*).
- **Check-In Partisipan (Attendee):** Para peserta rapat (*Attendees*) baru diperbolehkan melakukan *Check-In* kehadiran mereka **setelah** ruangan berhasil di-*claim* oleh *Host* (status rapat berubah menjadi `ongoing`). Apabila partisipan mencoba *check-in* lebih awal mendahului *Host*, sistem akan memblokir upaya tersebut dengan pesan peringatan bahwa *"Ruangan belum diklaim oleh Pemesan (Host)"*.

### 7.3. Check-In Pihak Eksternal (Guest Attendees)
- **Tautan Akses Tamu:** Peserta dari luar perusahaan (eksternal) yang emailnya didaftarkan pada saat *booking* akan menerima undangan rapat via surel (email) yang di dalamnya memuat *Guest Token* atau Tautan Khusus.
- **Validasi Terbatas:** Pihak eksternal tidak perlu memiliki akun di dalam sistem. Saat tiba di lokasi ruangan, mereka dapat melakukan pemindaian QR Code menggunakan *smartphone* pribadi. Sistem akan meminta mereka memasukkan *Guest Token* untuk memvalidasi kehadirannya, **setelah** Host utama berhasil mengklaim ruangan.
- **Tanda Tangan Digital Wajib (Mandatory Signature):** Khusus bagi partisipan tamu (eksternal), sistem mewajibkan mereka untuk membubuhkan tanda tangan digital (melalui layar sentuh/kursor) pada portal kehadiran (*Guest Portal*) sebagai bukti absensi yang sah. Pengguna internal tidak diwajibkan melakukan ini karena login mereka telah terotorisasi secara kriptografik.

### 7.4. Check-In Rapat Online / Digital
Bagi ruangan bertipe **Digital** atau **Hybrid**, metode *check-in* difasilitasi tanpa menggunakan QR Code secara fisik bagi peserta daring.
- **Check-in via Tautan (Link):** Peserta yang mengikuti rapat secara virtual dapat mengklik tombol **"Join Meeting"** atau tautan *teleconference* (contoh: Zoom/Teams) yang tersedia di dashboard mereka atau melalui surel undangan.
- **Pencatatan Otomatis:** Sistem akan secara otomatis menganggap klik pada tautan tersebut sebagai aktivitas *Check-In* elektronik (*Virtual Check-In*), dan seketika mengubah status partisipasi pengguna menjadi `attending`. Batasan toleransi waktu (10 menit sebelum hingga 15 menit setelah rapat) tetap berlaku agar tombol / tautan tersebut dapat memvalidasi kehadiran dengan sah.

### 7.5. Check-Out Mekanikal & Otomatisasi (Auto-Complete)
- **Check-Out Manual:** Ketika rapat usai (bahkan jika selesai lebih cepat dari jadwal), Host wajib *Check-Out* menggunakan tombol **Akhiri Rapat**. Hal ini menyebabkan ruang otomatis menjadi *Tersedia (Available)* dan sisa jam terpotong (di-*truncate*) agar dapat diserobot oleh pemesanan instan (*Ad-hoc bookings*).
- **Auto-Complete (Cron Job):** Jika Host lupa melakukan *check-out* manual, sistem *worker* latar belakang (`noShowWorker.js`) secara berkala menyapu jadwal. Rapat `ongoing` yang waktu akhirnya (`end_time`) telah terlewat akan secara otomatis ditutup menjadi `completed` guna menjaga rekam data tetap bersih.
### 7.6. Ekspor Daftar Hadir (PDF Presensi)
Sebagai bukti dokumentasi resmi atas pelaksanaan rapat:
- Seluruh presensi partisipan internal maupun eksternal dicatat di dalam sistem.
- Host, peserta (di *My Bookings*), dan Administrator dapat men-download **PDF Daftar Hadir** untuk setiap rapat.
- **Laporan Otomatis:** PDF dirender menggunakan `jsPDF` dengan kop surat korporat secara dinamis. Tanda tangan digital dari tamu (eksternal) akan langsung tergambar (*embedded*) di dalam tabel PDF tersebut sebagai validasi hukum kehadiran.

---

## 8. Epic: Dashboard & Analytics
Menyajikan laporan (*reporting*) esensial dan data eksekutif secara real-time.

### 8.1. Eksekutif & Manajemen Fasilitas
- Laporan jumlah *No-Show* dan tingkat pembatalan digunakan untuk menilai disiplin pengguna.
- Pemetaan visual tentang "Ruangan yang Sedang Digunakan Sekarang" (*Live Occupancy*).
- Identifikasi rasio kapasitas ruang fisik berbanding dengan ukuran undangan rapat yang lazim diadakan.

### 8.2. Pengguna Akhir
- Kartu ringkasan (*Summary Cards*) memilah jadwal ke dalam "Mendatang" (Upcoming), "Sedang Berlangsung" (Ongoing), dan "Riwayat" (Past), lengkap dengan fungsi absensi dan tautan *Join Zoom* terintegrasi.
