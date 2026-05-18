Menara

Parent  Documents


Docs Status
 Dalam proses
Software Development status
 Belum Dimulai
Start Date
TBA
End Date


Product
 Thoriq Ahnaf
Designer
 Person
Engineer
 Person
QA
 Person
Huly 
Link to Huly




Ringkasan Eksekutif
Apa yang ingin dikembangkan dan apa saja ruang lingkupnya?
Platform Manajemen Ruangan (Space Management Platform) internal mandiri yang mencakup fitur Autentikasi Pengguna (termasuk Google SSO), Manajemen Data Master Ruangan (CRUD), Tampilan Ketersediaan Grid Kalender, serta Sistem Pemesanan (Booking System). Platform ini dirancang dengan pendekatan API-first, sehingga seluruh fungsionalitas utama dapat diintegrasikan dan dikonsumsi oleh aplikasi lain dalam ekosistem organisasi.

Mengapa pengembangan ini diperlukan?
Saat ini organisasi menggunakan layanan pihak ketiga (Skedda) yang memerlukan biaya langganan (subscription fee) yang cukup besar setiap bulannya. Selain itu, ketergantungan pada platform pihak ketiga membatasi fleksibilitas integrasi jadwal rapat dengan aplikasi internal lainnya. Pengembangan platform mandiri ini akan memangkas biaya operasional secara signifikan dan memberikan kendali penuh atas tata kelola data.

Sejauh mana jangkauan dan dampaknya bagi pengguna jika fitur ini dikembangkan?
Platform ini akan digunakan oleh seluruh pegawai (internal) untuk pemesanan ruang rapat/fasilitas secara mandiri, serta oleh Admin untuk manajemen operasional gedung. Dengan arsitektur berbasis API, dampaknya tidak hanya dirasakan pada aplikasi ini saja, melainkan juga meningkatkan efisiensi di aplikasi internal lain yang kini bisa menampilkan jadwal atau memesan ruangan secara langsung tanpa perlu berpindah platform.

Metrik apa yang akan terdampak oleh pengembangan ini?

Efisiensi Biaya: Penurunan pengeluaran operasional bulanan software pihak ketiga hingga 100% (setelah migrasi penuh).

Interoperabilitas Sistem: Jumlah aplikasi internal pihak ketiga yang berhasil mengonsumsi data jadwal ruangan.

Tingkat Adopsi Pengguna: Kecepatan dan kemudahan proses booking baik via aplikasi utama maupun via API pihak ketiga.

Bagaimana inisiatif ini selaras dengan Renja/Renduk?
Inisiatif ini selaras dengan pilar Sistem Pemerintahan Berbasis Elektronik (SPBE) dan transformasi digital OIKN dalam hal efisiensi anggaran belanja perangkat lunak serta perwujudan ekosistem aplikasi yang saling terintegrasi (interoperable) melalui pemanfaatan API bersama.

Latar Belakang & Tujuan
Kondisi saat ini: Proses pemesanan dan manajemen ruangan saat ini diwadahi oleh platform pihak ketiga, yaitu Skedda. Sistem ini berjalan terpisah dari ekosistem aplikasi internal organisasi lainnya.

Permasalahan utama (Pain Points):

High Operational Cost: Biaya langganan bulanan Skedda yang tinggi membebani anggaran operasional digital.

Siloed System: Data ketersediaan ruangan terkunci di dalam Skedda, sehingga staf di aplikasi lain tidak dapat melihat jadwal atau melakukan booking secara langsung tanpa membuka tools baru dan melakukan login ulang.

Bukti atau data yang mendukung: Laporan keuangan bulanan terkait pengeluaran software SaaS serta adanya kebutuhan teknis dari tim pengembang aplikasi lain (seperti IKNOW) yang memerlukan data jadwal ruangan secara real-time.

Faktor penyebab (Root Cause): Belum adanya platform manajemen ruangan internal yang memiliki arsitektur terbuka (open architecture/API-based) untuk mendukung integrasi multi-platform.

Tujuan utama dari Epic ini: Membangun platform Manajemen Ruangan internal yang cost-effective, mandiri, aman, dan sepenuhnya berbasis API (API-based) untuk memfasilitasi kebutuhan pemesanan ruangan internal maupun integrasi eksternal.

Hasil terukur (Key Results):

Berhasil menghentikan langganan Skedda pasca-implementasi platform baru selesai.

Tersedianya dokumentasi API (seperti Swagger/OpenAPI) yang siap dikonsumsi oleh aplikasi internal lain.

Waktu respons API untuk query jadwal ruangan berada di bawah <200ms demi performa integrasi yang mulus.

Bagaimana pengembangan ini sesuai dengan Renstra/Renja OIKN:
Mendukung prinsip kemandirian teknologi nasional, penghematan anggaran belanja modal digital, serta standarisasi integrasi data mikro-layanan di lingkungan OIKN.
Cakupan (Scope)

Fitur
In-Scope
Out of Scope
Autentikasi pengguna (Login, SSO, Reset Password)
v


CRUD Ruangan (Space Management)
v


Booking ruangan
v


Penyediaan RESTful API untuk distribusi data jadwal ruangan ke aplikasi lain. 
v


Penyediaan API Endpoint aman agar aplikasi pihak ketiga yang terotorisasi dapat melakukan booking langsung tanpa login manual di apps ini. 
v




User Journey / User Story Mapping


Persyaratan Fungsional
Registrasi
Executive Summary
Sebagai bagian dari proses onboarding pengguna baru dalam aplikasi Manajemen Ruangan, sistem menyediakan fitur Registrasi yang memungkinkan calon pengguna internal untuk membuat akun secara mandiri menggunakan email dan password atau melalui Google SSO. Fitur ini digunakan oleh pengguna yang belum memiliki akun untuk dapat melakukan pemesanan ruangan. Proses registrasi mencakup pengisian formulir, validasi data, serta verifikasi melalui kode OTP yang dikirimkan ke email pengguna. Aktivasi akun menjadi prasyarat sebelum pengguna dapat mengakses sistem secara penuh. Fitur ini bertujuan menciptakan proses pendaftaran yang aman, terkontrol, dan sesuai dengan tata kelola organisasi.
Objective
Memungkinkan pengguna internal membuat akun
Menyediakan dua metode registrasi: konvensional dan SSO IKN
Memastikan validitas dan keamanan akun pengguna
User Flow
Acceptance Criteria
Informasi Umum
Entry point: Tombol “Daftar” di halaman Login
Halaman registrasi terdiri dari:
Navbar
Email input
Password input
Konfirmasi password input
Password checklist
Checkbox persetujuan S&K
Tombol Daftar
Footer
Role default hasil registrasi: Pengguna
Admin tidak dibuat melalui registrasi mandiri
Teknis Fitur
Email
Wajib mengandung karakter @
Tidak boleh mengandung spasi
Password
Minimal 8 karakter
Mengandung:
Huruf
Angka
Karakter khusus
Indikator Checklist password:
Merah jika belum memenuhi
Hijau jika sudah memenuhi
OTP 
OTP dikirim otomatis setelah submit berhasil
Masa berlaku OTP: 30 menit
Resend OTP:
Maksimal 1 kali setiap 5 menit
Jika OTP salah:
Ditampilkan notifikasi kesalahan
Jika OTP kadaluarsa:
Ditampilkan notifikasi OTP kadaluarsa
Pengguna diminta mengulang proses registrasi
Visual dan Interaksi
Setiap kolom input memiliki state:
Normal (belum diklik)
Fokus (diklik)
Valid (sesuai rule password)
Invalid (ga sesuai rule password)
Validasi dilakukan secara real-time
Tombol Daftar:
Disabled jika syarat belum terpenuhi
Loading state saat submit
UI konsisten dengan design guideline aplikasi
Fully responsive (desktop & mobile)
Design 

 Login
Executive Summary
Sebagai gerbang utama akses sistem Manajemen Ruangan, fitur Login memungkinkan pengguna terdaftar (Admin dan Pengguna) untuk mengakses sistem sesuai dengan peran dan kewenangannya. Fitur ini diakses melalui halaman login pada aplikasi berbasis web dan mobile. Proses login dilakukan menggunakan email dan password atau melalui autentikasi Google SSO. Setelah autentikasi berhasil, sistem akan mengidentifikasi role pengguna dan mengarahkan ke halaman utama (dashboard) yang sesuai. Fitur ini dirancang untuk menjamin keamanan akses, menjaga privasi data pemesanan ruangan, serta memastikan pemisahan hak akses antara Admin, Pengguna.
Objective
Memastikan hanya pengguna terotorisasi yang dapat mengakses sistem
Membedakan hak akses berdasarkan role (Admin dan Pengguna)
Menyediakan mekanisme login yang aman dan mudah digunakan
User Flow
Acceptance Criteria
Informasi Umum
Entry point:
 Tombol “Masuk” pada Navbar
Halaman Login
Halaman login terdiri dari:
Logo aplikasi
Input Email
Input Password
Tombol Masuk
Tautan “Lupa Password”
Tautan “Daftar” (jika registrasi diaktifkan)
Teknis Fitur
Email
Wajib mengandung karakter @
Tidak boleh mengandung spasi
Password
Minimal 8 karakter
Visual dan Interaksi
Setiap kolom input memiliki state:
Normal (belum diklik)
Fokus (diklik)
Valid (sesuai rule password)
Invalid (ga sesuai rule password)
Tombol Masuk:
Disabled jika syarat belum terpenuhi
Loading state saat submit
Error message:
Ditampilkan dekat field terkait
Menggunakan bahasa sederhana dan solutif UI konsisten dengan design guideline aplikasi
Fully responsive (desktop & mobile)
Design 

 Lupa Password
Executive Summary
Fitur Lupa Password memungkinkan pengguna yang telah terdaftar untuk mengatur ulang kata sandi mereka jika lupa atau tidak dapat mengakses akun. Proses ini dilakukan melalui verifikasi email menggunakan OTP untuk memastikan keamanan dan mencegah akses tidak sah.
Objective
Memulihkan akses akun pengguna dengan aman
Mengurangi ketergantungan pada bantuan Admin
User Flow
Acceptance Criteria
Informasi Umum
Entry point:
Entry point: Link “Lupa Password” di halaman Login
Halaman Lupa Password terdiri dari:
Logo aplikasi
Input Email
Tombol Kirim
Teknis Fitur
Email
Wajib mengandung karakter @
Tidak boleh mengandung spasi
Password
Minimal 8 karakter
Visual dan Interaksi
Setiap kolom input memiliki state:
Normal (belum diklik)
Fokus (diklik)
Valid (sesuai rule password)
Invalid (ga sesuai rule password)
Tombol Masuk:
Disabled jika syarat belum terpenuhi
Loading state saat submit
Error message:
Ditampilkan dekat field terkait
Menggunakan bahasa sederhana dan solutif UI konsisten dengan design guideline aplikasi
Fully responsive (desktop & mobile)
Design 
ADMIN RUANGAN
1. Dashboard & Statistik Operasional
Executive Summary
Menampilkan visualisasi data taktis terkait pemanfaatan ruangan yang menjadi tanggung jawab langsung Admin Ruangan. Modul ini menyajikan data utilitas harian, jam-jam sibuk, serta tingkat pembatalan sepihak (ghost booking) di areanya untuk membantu pengelolaan fasilitas fisik secara presisi.
Objective
Menyediakan metrik penggunaan ruang yang relevan dengan wilayah tugas Admin.
Membantu mendeteksi ruang yang kurang produktif atau sering kosong meskipun sudah dipesan.
User Flow
Admin membuka Tab "Admin Ruangan" -> Menu "Dashboard".
Sistem membaca matriks penugasan (room assignment).
Sistem menampilkan grafik utilitas ruangan khusus untuk area tugas Admin tersebut.
Acceptance Criteria
Informasi Umum:
Tampilan default saat tab Admin Ruangan dibuka.
Berisi widget grafik: Tren Utilitas, Distribusi Jam Sibuk (07.00 - 18.00), dan Angka Ghost Booking.
Teknis Fitur:
Scope Pembatasan Data: Query database dikunci berdasarkan ID Ruangan yang ditugaskan kepada akun tersebut.
Jika diakses oleh Super Admin, muncul dropdown ekstra untuk memilih "Pilih Admin Ruangan/Gedung" yang ingin dipantau.
Visual dan Interaksi:
State pemuatan data wajib menggunakan shimmer placeholder.
UI responsif (desktop & mobile).
2. Manajemen Antrean Persetujuan (Approval Workflow)
Executive Summary
Menampung seluruh permohonan booking dari pengguna internal maupun aplikasi pihak ketiga (via API) yang berstatus Pending Approval khusus untuk ruangan-ruangan strategis yang memerlukan validasi manual sebelum slot waktu resmi dikunci.
Objective
Memastikan ruangan khusus (VVIP/Aula) digunakan sesuai skala prioritas organisasi.
Mencegah bentrokan agenda penting eksekutif.
User Flow
Admin membuka Tab "Admin Ruangan" -> Menu "Persetujuan".
Admin melihat daftar permohonan yang berstatus Pending.
Admin mengklik aksi "Setujui" atau "Tolak".
Acceptance Criteria
Informasi Umum:
Daftar antrean disajikan dalam bentuk tabel urutan kronologis (terbaru di atas).
Terdapat filter status: Pending, Approved, Rejected.
Teknis Fitur:
Aksi Setujui: Mengubah status booking menjadi Confirmed dan mengirim notifikasi/callback API ke pemesan.
Aksi Tolak: Mengubah status menjadi Rejected. Admin wajib mengisi alasan penolakan. Slot waktu otomatis terbebas kembali di kalender.
Visual dan Interaksi:
Aksi penolakan memicu Modal Pop-up kolom alasan (Mandatory, min. 10 karakter).
Badge status menggunakan kode warna (Kuning: Pending, Hijau: Approved, Merah: Rejected).
3. Kontrol Jadwal & Pembatalan Paksa (Force Cancel)
Executive Summary
Memberikan wewenang administratif kepada Admin Ruangan untuk memantau jadwal aktif (ongoing/upcoming) di areanya, serta melakukan pembatalan paksa (Force Cancel) atas pesanan pengguna jika terjadi situasi darurat atau kebutuhan mendadak organisasi.
Objective
Memberikan fleksibilitas penuh kontrol ruangan saat terjadi agenda internal darurat.
User Flow
Admin membuka Tab "Admin Ruangan" -> Menu "Jadwal Aktif".
Admin memilih salah satu jadwal pemesanan milik pengguna.
Admin mengklik "Batalkan Pesanan", mengisi alasan darurat, dan mengonfirmasi tindakan.
Acceptance Criteria
Informasi Umum:
Menampilkan daftar booking berstatus Confirmed dan Ongoing di area tugasnya.
Teknis Fitur:
Aksi pembatalan paksa otomatis mengubah status menjadi Cancelled, membebaskan slot kalender, dan memicu email notifikasi instan kepada pemesan asli berisi alasan pembatalan dari Admin.
Visual dan Interaksi:
Tombol "Pembatalan Paksa" diberi warna kontras (Merah) dengan konfirmasi dialog ganda (Double Confirmation Pop-up) untuk mencegah salah klik.
4. CRUD Ruangan Terassign (Scoped Space Management)
Executive Summary
Fitur ini memberikan otonomi kepada Admin Ruangan untuk mengelola data operasional ruangan yang menjadi tanggung jawabnya. Admin Ruangan dapat mendaftarkan unit ruangan baru di lantai/gedung kelolaannya, memperbarui inventaris fasilitas, mengubah jam operasional, serta mengubah status ketersediaan ruangan secara mandiri.
Objective
Memberikan kebebasan administratif kepada Admin Ruangan untuk menyelaraskan kondisi digital aplikasi dengan kondisi fisik ruangan aktual.
Mempercepat pembaruan data fasilitas tanpa mendeposisi beban kerja ke Super Admin.
User Flow
Admin Ruangan membuka Tab "Admin Ruangan" -> Menu "Kelola Ruangan".
Sistem menampilkan daftar ruangan yang saat ini di-assign kepada Admin tersebut.
Create: Admin mengklik "Tambah Ruangan", mengisi formulir (pilihan Gedung/Lantai dikunci hanya pada area tugasnya), lalu klik Simpan.
Update/Delete: Admin memilih salah satu ruangan kelolaannya untuk mengubah spesifikasi atau menonaktifkannya.
Acceptance Criteria
Informasi Umum:
Tampilan berbentuk tabel/card khusus menampilkan aset ruangan yang berada di bawah wewenang Admin yang bersangkutan.
Teknis Fitur:
Create (Tambah): Kolom input lokasi (Gedung/Lantai) wajib berupa dropdown yang opsinya sudah tersaring otomatis hanya untuk wilayah tugas Admin Ruangan tersebut.
Update (Ubah): Mengizinkan pengubahan Nama Ruangan, Kapasitas, Deskripsi, Foto, Jam Operasional (Start from - Until to), serta kuantitas fasilitas (e.g., jumlah Stop Kontak, tipe Smartboard).
Disable/Delete (Nonaktifkan): Admin Ruangan dapat mengubah status menjadi Nonaktif (Soft Delete). Jika ruangan memiliki booking aktif, sistem wajib memunculkan peringatan: "Ruangan ini memiliki booking aktif. Menonaktifkan ruangan akan membatalkan seluruh booking berjalan. Lanjutkan?"
Validasi Keamanan: Backend wajib melakukan pengecekan ulang (authorization check code) sebelum mengeksekusi query database untuk memastikan room_id yang diubah benar-benar milik Admin Ruangan tersebut.

1. Informasi Dasar & Lokasi
Nama Ruangan
Text Input
Wajib (Mandatory)
• Maksimal 100 karakter.• Validasi Duplikasi: Sistem otomatis menolak jika ada nama ruangan yang sama di lantai dan gedung yang sama (real-time check).


Gedung
Dropdown Select
Wajib (Mandatory)
• Menampilkan seluruh daftar gedung yang terdaftar di organisasi secara global (akses sama dengan Super Admin).


Lantai / Zona
Dropdown Select
Wajib (Mandatory)
• Cascading Dropdown (opsi lantai baru muncul secara dinamis setelah Gedung dipilih).• Menampilkan seluruh daftar lantai/zona yang tersedia pada gedung terpilih.


Penanggung Jawab Ruangan
Tidak Ditampilkan (Hidden)
Otomatis oleh Sistem
• Sisi UI: Bidang ini tidak muncul di layar formulir Admin Ruangan.• Sisi Backend: Saat formulir di-submit, backend otomatis menyisipkan user_id dari Admin Ruangan yang sedang aktif login sebagai penanggung jawab ruangan tersebut.


Deskripsi Ruangan
Text Area
Opsional
• Maksimal 500 karakter.• Berisi catatan tambahan mengenai peruntukan atau karakteristik ruangan.
2. Kapasitas, Layout, & Fasilitas
Setup Layout Ruangan
Multi-select Checkbox
Wajib (Min. pilih 1)
Pilihan opsi standar organisasi:• Boardroom• U-Shape• Classroom• Theater / Auditorium• Standing Setup


Kapasitas Per Layout
Numeric Input
Kondisional
• Kolom input angka muncul secara otomatis hanya di sebelah opsi jenis layout yang dicentang.• Hanya menerima input angka positif (lebih dari 0).• Menjadi parameter validasi jumlah peserta saat pengguna umum melakukan booking.


Fasilitas Utama
Checklist + Numeric Input
Wajib (Min. pilih 1)
Admin mencentang komponen dan mengisi jumlah unitnya:• [ ] TV Monitor (isi jumlah unit)• [ ] Proyektor & Layar (isi jumlah unit)• [ ] Smartboard / Whiteboard (isi jumlah unit)• [ ] Video Conference Kit (isi jumlah unit)• [ ] Sound System / Speaker (isi jumlah unit)• [ ] Jumlah Stop Kontak (isi jumlah unit)
3. Kebijakan & Jam Operasional
Batasi Jam Operasional
Switch Toggle
Wajib (Mandatory)
• Default status: Nonaktif (OFF).• Jika OFF, sistem mencatat ruangan tersedia 24 Jam penuh (tanpa batasan jam harian).


Jam Mulai Operasional
Time Picker
Kondisional
• Wajib diisi hanya jika toggle "Batasi Jam Operasional" bernilai ON.• Format waktu standar: HH:mm (24 jam).


Jam Selesai Operasional
Time Picker
Kondisional
• Wajib diisi hanya jika toggle "Batasi Jam Operasional" bernilai ON.• Validasi backend & frontend: Waktu selesai harus lebih besar dari waktu mulai (End Time > Start Time).


Mekanisme Persetujuan
Radio Button / Toggle
Wajib (Mandatory)
Penentuan alur pemesanan:• Instant Booking (Auto-Approve): Booking langsung terkonfirmasi otomatis.• Butuh Approval Admin Ruangan: Booking masuk antrean Pending Approval di Tab 1 milik Admin Ruangan itu sendiri.


Status Awal Ruangan
Radio Button / Toggle
Wajib (Mandatory)
• Aktif: Ruangan langsung tayang dan dapat dicari/dipesan di kalender pengguna.• Nonaktif: Ruangan berstatus draft / dalam perbaikan (disembunyikan dari fungsi booking).
4. Media & Visual
Foto Utama Ruangan
File Upload (Drag & Drop)
Opsional
• Format berkas yang diterima: .jpg, .jpeg, .png.• Ukuran maksimal berkas: 5 MB.• Menyediakan fitur pratinjau gambar (image preview) sebelum form di-submit.


Foto / Denah Layout
File Upload (In-line)
Opsional
• Kolom unggahan muncul sebagai opsi tambahan di bawah masing-masing tipe layout yang dicentang pada Kluster 2.• Format, batasan ukuran, dan fitur pratinjau sama dengan Foto Utama.


SUPERADMIN 
1. CRUD MASTER RUANGAN & FASILITAS GLOBAL
Executive Summary
Fungsi CRUD Master Ruangan & Fasilitas Global berada di level infrastruktur tertinggi organisasi. Melalui menu ini, Super Admin memiliki kontrol mutlak untuk membuat entitas Gedung baru, menambah Lantai baru, serta memiliki hak override penuh untuk mendaftarkan, mengubah, atau menonaktifkan ruangan mana pun di seluruh organisasi tanpa batasan wilayah tugas. Data yang diinput di sini menjadi single source of truth bagi ekosistem aplikasi Menara dan seluruh aplikasi pihak ketiga yang mengonsumsi API jadwal.
Objective
Mengelola arsitektur dan hierarki fisik (Gedung, Lantai, Zona) organisasi di dalam sistem.
Menyediakan formulir pembuatan ruangan yang komprehensif, mencakup kapasitas dinamis berbasis layout serta jam operasional yang fleksibel.
Memungkinkan Super Admin mendelegasikan penanggung jawab ruangan secara langsung kepada Admin Ruangan saat proses pembuatan aset.
User Flow
Super Admin membuka Tab "Super Admin" -> Menu "Manajemen Ruangan Global".
Sistem menampilkan tabel seluruh ruangan organisasi secara global.
Super Admin mengklik tombol "+ Tambah Ruangan".
Sistem menampilkan Modal Formulir Pembuatan Ruangan (menggunakan struktur data tabel di bawah).
Super Admin mengisi data, memilih Admin Ruangan yang bertanggung jawab, lalu mengklik "Simpan".
Sistem memvalidasi data di backend, menyimpan ke database, dan mencatat aktivitas ke Audit Trail.

1. Informasi Dasar & Lokasi
Nama Ruangan
Text Input
Wajib (Mandatory)
• Maksimal 100 karakter.• Validasi Duplikasi: Sistem otomatis menolak jika ada nama ruangan yang sama di lantai dan gedung yang sama (real-time check).


Gedung
Dropdown Select
Wajib (Mandatory)
• Menampilkan seluruh daftar gedung yang terdaftar di organisasi secara global.


Lantai / Zona
Dropdown Select
Wajib (Mandatory)
• Cascading Dropdown (opsi lantai baru muncul secara dinamis setelah Gedung dipilih).• Menampilkan seluruh daftar lantai/zona yang tersedia pada gedung terpilih.


Penanggung Jawab Ruangan
Searchable Dropdown Select
Opsional
• Menampilkan daftar seluruh akun terdaftar yang memiliki peran (role) sebagai "Admin Ruangan".• Super Admin dapat memilih satu nama untuk langsung didelegasikan sebagai penanggung jawab operasional ruangan ini.


Deskripsi Ruangan
Text Area
Opsional
• Maksimal 500 karakter.• Berisi catatan tambahan mengenai peruntukan atau karakteristik ruangan.
2. Kapasitas, Layout, & Fasilitas
Setup Layout Ruangan
Multi-select Checkbox
Wajib (Min. pilih 1)
Pilihan opsi standar organisasi:• Boardroom• U-Shape• Classroom• Theater / Auditorium• Standing Setup


Kapasitas Per Layout
Numeric Input
Kondisional
• Kolom input angka muncul secara otomatis hanya di sebelah opsi jenis layout yang dicentang.• Hanya menerima input angka positif (lebih dari 0).• Menjadi parameter validasi jumlah peserta saat pengguna umum melakukan booking.


Fasilitas Utama
Checklist + Numeric Input
Wajib (Min. pilih 1)
Admin mencentang komponen dan mengisi jumlah unitnya:• [ ] TV Monitor (isi jumlah unit)• [ ] Proyektor & Layar (isi jumlah unit)• [ ] Smartboard / Whiteboard (isi jumlah unit)• [ ] Video Conference Kit (isi jumlah unit)• [ ] Sound System / Speaker (isi jumlah unit)• [ ] Jumlah Stop Kontak (isi jumlah unit)
3. Kebijakan & Jam Operasional
Batasi Jam Operasional
Switch Toggle
Wajib (Mandatory)
• Default status: Nonaktif (OFF).• Jika OFF, sistem mencatat ruangan tersedia 24 Jam penuh (tanpa batasan jam harian).


Jam Mulai Operasional
Time Picker
Kondisional
• Wajib diisi hanya jika toggle "Batasi Jam Operasional" bernilai ON.• Format waktu standar: HH:mm (24 jam).


Jam Selesai Operasional
Time Picker
Kondisional
• Wajib diisi hanya jika toggle "Batasi Jam Operasional" bernilai ON.• Validasi backend & frontend: Waktu selesai harus lebih besar dari waktu mulai (End Time > Start Time).


Mekanisme Persetujuan
Radio Button / Toggle
Wajib (Mandatory)
Penentuan alur pemesanan:• Instant Booking (Auto-Approve): Booking langsung terkonfirmasi otomatis.• Butuh Approval Admin Ruangan: Booking masuk antrean Pending Approval di Tab 1 milik Admin Ruangan yang bertanggung jawab.


Status Awal Ruangan
Radio Button / Toggle
Wajib (Mandatory)
• Aktif: Ruangan langsung tayang dan dapat dicari/dipesan di kalender pengguna.• Nonaktif: Ruangan berstatus draft / dalam perbaikan (disembunyikan dari fungsi booking).
4. Media & Visual
Foto Utama Ruangan
File Upload (Drag & Drop)
Opsional
• Format berkas yang diterima: .jpg, .jpeg, .png.• Ukuran maksimal berkas: 5 MB.• Menyediakan fitur pratinjau gambar (image preview) sebelum form di-submit.


Foto / Denah Layout
File Upload (In-line)
Opsional
• Kolom unggahan muncul sebagai opsi tambahan di bawah masing-masing tipe layout yang dicentang pada Kluster 2.• Format, batasan ukuran, dan fitur pratinjau sama dengan Foto Utama.


Acceptance Criteria (Visual & Interaksi CRUD Global)
Aksi Disable/Delete: Penghapusan ruangan menggunakan metode Soft Delete (status berubah menjadi Nonaktif di database agar histori laporan tidak rusak). Jika ada booking aktif berjalan, sistem memunculkan pop-up peringatan konsekuensi pembatalan massal.
State Tombol: Tombol "Simpan" menampilkan efek loading spinner saat proses submit berjalan untuk mencegah data ganda.
MANAJEMEN PENGGUNA & PEMETAAN WILAYAH (ROOM ASSIGNMENT MATRIX)
Executive Summary
Modul tata kelola akun pengguna sistem yang berfungsi untuk mendefinisikan hak akses setiap individu. Fitur utamanya adalah Room Assignment Matrix, yaitu panel interaktif bagi Super Admin untuk memetakan atau mengubah delegasi wilayah tugas seorang akun "Admin Ruangan" terhadap hierarki fisik kantor.
Objective
Mengontrol dan mengaudit data seluruh pengguna terdaftar (Admin, Pengguna Umum, Akun Sistem API).
Menghubungkan entitas digital (Akun Admin Ruangan) dengan tanggung jawab fisik (Gedung/Lantai/Ruangan).
User Flow
Super Admin membuka Tab "Super Admin" -> Menu "Manajemen Pengguna".
Super Admin memilih salah satu akun ber-role Admin Ruangan, lalu mengklik opsi "Atur Wilayah Tugas".
Sistem menampilkan Modal jendela interaktif berwujud struktur Tree-View.
Super Admin mencentang aset yang didelegasikan, kemudian mengklik "Simpan Matriks".
Acceptance Criteria
Informasi Umum: Menampilkan tabel seluruh user dengan fitur pencarian (by Name/Email) dan filter (by Role/Status).
Teknis Fitur:
Satu ruangan idealnya dikelola maksimal oleh 1 Admin Ruangan utama demi akuntabilitas persetujuan.
Satu Admin Ruangan dapat mengelola banyak ruangan secara bersamaan (misal: mencentang seluruh unit di Lantai 3).
Visual dan Interaksi: Komponen pemetaan wilayah menggunakan struktur Tree-View Checkbox (Gedung -> Lantai -> Ruangan) yang dapat di-ekspans atau di-kolaps secara fleksibel.

3. MANAJEMEN KEBIJAKAN GLOBAL & BLACKOUT DATES
Executive Summary
Panel konfigurasi pusat untuk menegakkan regulasi penggunaan ruang rapat di seluruh ekosistem organisasi. Aturan yang ditetapkan di panel ini bersifat mutlak (override) dan mengikat seluruh sistem, termasuk memvalidasi pesanan yang datang secara remote dari aplikasi pihak ketiga via API.
Objective
Mencegah praktik monopoli pemakaian fasilitas kantor oleh kelompok tertentu.
Menyediakan instrumen sterilisasi ruangan massal secara digital saat hari libur nasional atau agenda internal mendadak.
User Flow
Super Admin membuka Tab "Super Admin" -> Menu "Kebijakan Global".
Super Admin menyesuaikan parameter batasan atau menambahkan tanggal pada kalender Blackout Dates.
Super Admin mengklik "Terapkan Kebijakan".
Acceptance Criteria
Teknis Fitur (Booking Thresholds):
Input numerik Batas Durasi Maksimal (maksimal jam per booking).
Input numerik Batas Hari Pemesanan (rentang hari maksimum ke depan yang boleh dipesan oleh pengguna biasa).
Teknis Fitur (Blackout Dates):
Komponen kalender yang memungkinkan Super Admin memblokir tanggal tertentu. Ruangan yang terdampak otomatis berstatus Unavailable di seluruh kalender aplikasi dan menolak semua request pemesanan.
Visual dan Interaksi: Setiap parameter input wajib memiliki komponen teks panduan (tooltip icon) untuk menjelaskan batasan logika teknisnya kepada admin.

4. DASBOR PEMANTAUAN API & INTEGRASI
Executive Summary
Selaras dengan arsitektur platform yang berprinsip API-first, dasbor Pemantauan API merupakan panel kontrol teknis bagi Super Admin untuk menerbitkan kredensial akses, membatasi lalu lintas data (rate limiting), serta mengawasi kesehatan transaksi data dari sistem luar (seperti aplikasi IKNOW).
Objective
Memfasilitasi integrasi eksternal (distribusi jadwal dan remote booking) secara mandiri tanpa modifikasi kode backend.
Mengamankan server utama dari risiko overload akibat lonjakan trafik dari aplikasi klien.
User Flow
Super Admin membuka Tab "Super Admin" -> Menu "Integrasi & API".
Super Admin melakukan manajemen token (Generate/Revoke) atau memantau grafik performa trafik data yang tertera.
Acceptance Criteria
Teknis Fitur (Credential Management):
Fungsi Generate Token menghasilkan pasangan Client ID dan Secret Key / Bearer Token. Hak akses token dapat diset: Read-Only atau Read-Write.
Secret Key disamarkan (********) dan hanya ditampilkan satu kali saat proses pembuatan pertama, dilengkapi tombol Copy to Clipboard.
Fungsi Revoke Token untuk memutus akses aplikasi luar secara instan jika mendeteksi anomali keamanan.
Teknis Fitur (API Log Analytics):
Grafik garis (line chart) menampilkan data statistik Request Per Minute (RPM) dan persentase sebaran respons kode HTTP status (200 OK, 401 Unauthorized, 500 Server Error).

5. RIWAYAT AKTIVITAS GLOBAL (AUDIT TRAIL)
Executive Summary
Modul pengawasan keamanan informasi organisasi yang mencatat seluruh jejak aktivitas administratif krusial secara kronologis. Modul ini bersifat mutlak Read-Only dan Immutable (tidak dapat diedit, dimanipulasi, atau dihapus oleh tingkatan user mana pun termasuk Super Admin) guna memenuhi standar tata kelola kepatuhan digital.
Objective
Menyediakan rekam jejak digital yang transparan dan valid untuk kebutuhan audit operasional dan penelusuran insiden siber.
User Flow
Super Admin membuka Tab "Super Admin" -> Menu "Riwayat Aktivitas".
Super Admin menyaring data menggunakan panel pencarian dan filter bertingkat untuk menemukan log aktivitas yang spesifik.
Acceptance Criteria
Teknis Fitur:
Setiap baris log wajib merekam atribut: Stempel Waktu (Timestamp akurat), ID & Nama Aktor (User/Aplikasi Pihak Ketiga), Jenis Tindakan (e.g., CREATE_ROOM, FORCE_CANCEL, UPDATE_POLICY), Alamat IP asal, dan Payload data komparasi.
Mencatat dengan detail seluruh aksi operasional yang dilakukan oleh Admin Ruangan di Tab 1 (seperti data sebelum vs sesudah kapasitas diubah).
Visual dan Interaksi:
Tabel menggunakan desain padat (dense layout) untuk efisiensi layar. Detail visual perubahan data komparasi (Before vs After text) ditampilkan menggunakan komponen baris yang dapat diekspans (Expandable Accordion Row) saat baris log diklik.

USER
TAMPILAN GRID KALENDER & AVAILABILITY
Executive Summary
Fitur Kalender Ruangan menampilkan ketersediaan ruangan dalam bentuk grid kalender mingguan berbasis waktu. Fitur ini menjadi sarana utama bagi pengguna yang ingin melakukan pemesanan berdasarkan kebutuhan waktu tertentu. Kalender dirancang untuk menampilkan ruangan secara terfilter dan terkelompok guna menghindari kepadatan tampilan ketika jumlah ruangan bertambah.
Objective
Menyediakan tampilan availability berbasis waktu
Menjadi entry point utama booking ruangan
Menghindari overload tampilan saat jumlah ruangan besar
User Flow
User membuka menu Kalender Ruangan
User memilih minggu
User memilih hari
User memilih filter ruangan
Sistem menampilkan grid kalender
User klik slot waktu → booking
Acceptance Criteria
Informasi Umum
Entry point: Menu Kalender Ruangan
View: Mingguan
ketika diklik suatu tanggal akan menampilkan laman detail dengna bentuk grid
Struktur grid:
Kolom → waktu
Baris → ruangan
User WAJIB memilih minimal 1 filter ruangan
Teknis Fitur
Filter & Kategorisasi Ruangan
Sistem menyediakan filter untuk membatasi jumlah ruangan yang ditampilkan:
Gedung
Lantai
Jenis Ruangan
Kapasitas
Fasilitas
Sistem tidak diperbolehkan menampilkan seluruh ruangan tanpa filter.
Visibility Rules
User Terdaftar dapat melihat informasi booking orang lain
Visual dan Interaksi
Color coding status waktu
Sticky header untuk waktu
Scroll horizontal & vertikal
Tampilan responsive
Design 

Daftar Ruangan
Executive Summary
Fitur Daftar Ruangan menampilkan seluruh ruangan dalam bentuk daftar yang dapat difilter dan dicari. Fitur ini ditujukan bagi pengguna yang ingin mengeksplorasi ruangan terlebih dahulu sebelum menentukan waktu pemesanan. Dari fitur ini, pengguna dapat melihat metadata ruangan, jadwal ketersediaan, serta riwayat penggunaan ruangan sesuai dengan kewenangannya.
Objective
Menyediakan pendekatan eksplorasi berbasis ruangan
Menjadi alternatif entry point booking
Menyediakan informasi komprehensif per ruangan
User Flow
User membuka menu Daftar Ruangan
User memfilter / mencari ruangan
User memilih salah satu ruangan
User melihat detail ruangan
User melakukan booking dari halaman ruangan
Acceptance Criteria
Informasi Umum
Entry point: Menu Daftar Ruangan
Tampilan awal: List / table / card ruangan
Dilengkapi search by name & filter by gedung, lantai, kapasitas
Teknis Fitur
Tampilan awal berbentuk Card dengan foto dan nama dari masing2 ruangan, beserta lokasi gedung dan lantainya
Detail Ruangan (Saat Ruangan Diklik)
Section 1 Informasi Ruangan
Nama
Lokasi
Kapasitas
Fasilitas
Status
Foto 
Jadwal Ruangan
Grid kalender Mingguan dengan tampilan hari senin - jumat (horizontal) dan jam (vertikal)
fokus pada 1 ruangan ini saja
Section 3 - Riwayat Penggunaan
Daftar booking lampau
filter periode waktu
Hak Akses Riwayat : 
Admin : Semua History
Pengguna : history booking milik sendiri
Visual dan Interaksi
List dengan gaya card
pewarnaan yang jelas untuk waktu ruangan yang telah dibook dan yg belum
responsif dengan pengguna mobile
Design 

Booking Ruangan
Executive Summary
Fitur Booking Ruangan memungkinkan pengguna yang berwenang (Admin dan Pengguna) untuk melakukan pemesanan ruangan berdasarkan ketersediaan waktu dan aturan yang berlaku. Proses booking dilakukan melalui interaksi langsung pada tampilan kalender atau dari halaman detail ruangan. Sistem secara otomatis akan memvalidasi ketersediaan, konflik waktu, serta kepatuhan terhadap aturan pemesanan sebelum booking disimpan. Dengan pendekatan ini, fitur booking memastikan penggunaan ruangan berjalan tertib, transparan, dan sesuai kebijakan organisasi.
Objective
Memfasilitasi pemesanan ruangan secara terstruktur dan adil
Mencegah konflik dan penyalahgunaan ruangan
Menyediakan pengalaman booking yang konsisten dari berbagai entry point
Mengurangi intervensi manual Admin melalui validasi otomatis
User Flow
Booking dari Kalender Ruangan
Pengguna membuka menu Kalender Ruangan
Pengguna memilih filter ruangan
Pengguna klik slot waktu yang tersedia
Sistem menampilkan modal/form booking
Pengguna mengisi detail booking
Sistem memvalidasi aturan & konflik
Booking disimpan dan ditampilkan di kalender


Booking dari Daftar Ruangan
Pengguna membuka menu Daftar Ruangan
Pengguna memilih salah satu ruangan
Pengguna membuka tab Jadwal Ruangan
Pengguna klik slot waktu kosong
Sistem menampilkan modal/form booking
Validasi dilakukan
Booking disimpan
Acceptance Criteria
Informasi Umum
Entry point:
Klik slot waktu di Kalender Ruangan
Klik slot waktu di Detail Ruangan
Booking berbasis waktu (start time – end time)
Booking hanya dapat dilakukan pada ruangan berstatus Aktif
Teknis Fitur
Tampilan awal berbentuk Card dengan foto dan nama dari masing2 ruangan, beserta lokasi gedung dan lantainya
Detail Ruangan (Saat Ruangan Diklik)
Section 1 Informasi Ruangan
Nama
Lokasi
Kapasitas
Fasilitas
Status
Foto 
Jadwal Ruangan
Grid kalender Mingguan dengan tampilan hari senin - jumat (horizontal) dan jam (vertikal)
fokus pada 1 ruangan ini saja
Section 3 - Riwayat Penggunaan
Daftar booking lampau
filter periode waktu
Hak Akses Riwayat : 
Admin : Semua History
Pengguna : history booking milik sendiri
Visual dan Interaksi
List dengan gaya card
pewarnaan yang jelas untuk waktu ruangan yang telah dibook dan yg belum
responsif dengan pengguna mobile
Design 

BOOKING SAYA (MY CURRENT BOOKINGS)
Executive Summary

Sebagai bagian dari manajemen jadwal mandiri dalam aplikasi Manajemen Ruangan, fitur Booking Saya memungkinkan pengguna terdaftar (Admin dan Pengguna) untuk melihat, mengubah, atau membatalkan pesanan ruangan yang sedang berjalan (ongoing) maupun yang akan datang (upcoming). Fitur ini memberikan transparansi penuh terhadap komitmen ruang rapat yang telah dibuat oleh pengguna, sekaligus mengoptimalkan kembali ketersediaan ruangan jika ada pembatalan secara mandiri tanpa perlu berinteraksi manual dengan Admin.

Objective
Menyediakan halaman terpusat bagi pengguna untuk memantau seluruh jadwal pemesanan ruangan mereka.
Memungkinkan pengguna melakukan pembatalan atau pengubahan jadwal (reschedule) secara mandiri dan aman.
Mencegah ruangan "terbengkalai" (ghost booking) dengan memberikan kemudahan akses pembatalan.

User Flow

Pengguna masuk ke sistem dan membuka menu "Booking Saya".
Sistem menampilkan daftar booking aktif milik pengguna tersebut.
Pengguna memilih salah satu pesanan untuk melihat detail atau melakukan aksi (Ubah/Batalkan).
Sistem melakukan validasi aturan (misal: batas waktu pembatalan) dan memproses aksi tersebut.

Acceptance Criteria
Informasi Umum
Entry point: Menu "Booking Saya" pada Sidebar / Navbar utama setelah login.

Halaman Booking Saya terdiri dari:

Tab Filter Status: Upcoming (Akan Datang), Ongoing (Sedang Berjalan), dan Past (Riwayat/Selesai).

Fitur Pencarian berdasarkan Nama Ruangan atau Agenda Rapat.

Daftar Pesanan dalam bentuk List / Card.

Hak Akses Konten:

Pengguna: Hanya dapat melihat dan mengelola booking yang dibuat oleh akunnya sendiri.

Teknis Fitur
Komponen Informasi Card Booking:

Nama Ruangan & Lokasi (Gedung, Lantai, Zona).

Waktu Pelaksanaan (Hari, Tanggal, Jam Start s.d End).

Agenda / Subjek Rapat.

Badge Status (e.g., Confirmed, Ongoing, Cancelled).

Mekanisme Pembatalan (Cancel Booking):

Tombol "Batalkan Booking" hanya aktif pada kategori Upcoming.

Pembatalan mengubah status booking menjadi Cancelled dan langsung membebaskan slot waktu ruangan tersebut di Kalender agar bisa di-book oleh pengguna lain.

Mekanisme Pengubahan (Edit / Reschedule):

Tombol "Ubah" memungkinkan pengguna mengganti waktu atau fasilitas tambahan.

Setiap perubahan wajib melewati sistem validasi bentrok (conflict validation check) yang sama seperti alur pembuatan booking baru.

Visual dan Interaksi
Setiap Card Booking memiliki indikator warna (color coding) yang jelas berdasarkan statusnya (misal: Biru untuk Upcoming, Hijau untuk Ongoing, Abu-abu untuk Past).

Aksi Pembatalan: Wajib memicu Confirmation Dialog / Pop-up ("Apakah Anda yakin ingin membatalkan pesanan ini?") sebelum sistem memproses penghapusan.

State Interaksi:

Loading state (shimmer effect) saat sistem menarik data booking dari API.

Empty state (ilustrasi & teks solutif) jika pengguna belum memiliki riwayat atau pesanan aktif.

UI konsisten dengan design guideline aplikasi.

Fully responsive (desktop & mobile).
Persyaratan Non-fungsional
Skalabilitas & Interoperabilitas (API-Based Requirement):

Sistem wajib dibangun dengan pendekatan API-First. Semua aksi yang dapat dilakukan di UI (Frontend) harus menggunakan API Endpoint yang sama yang nantinya dibuka untuk aplikasi internal pihak ketiga.
Setiap integrasi booking dari aplikasi luar wajib menggunakan mekanisme otentikasi yang aman (misalnya: API Keys, OAuth2, atau Bearer Token khusus antar-aplikasi) untuk memastikan hak akses tetap terkontrol sesuai role (Admin/Pengguna).
Dokumentasi API wajib menggunakan standar OpenAPI 3.0 (Swagger) untuk memudahkan tim engineer dari aplikasi lain melakukan integrasi.

Keamanan dan Privasi (Security & Privacy Concerns)
Bagian ini berisi:

Jenis data yang dikelola dan tingkat sensitivitasnya.
Potensi risiko keamanan (akses ilegal, kebocoran data, serangan siber).
Mekanisme kontrol keamanan yang disarankan (enkripsi, otorisasi, audit trail).
Kepatuhan terhadap kebijakan keamanan informasi OIKN atau regulasi nasional.

Risiko & Mitigasi
Bagian ini berisi:

Risiko yang mungkin muncul selama pengembangan atau implementasi.
Dampak jika risiko terjadi (rendah, sedang, tinggi).
Strategi mitigasi yang direncanakan.

Ketergantungan (Dependencies)
Bagian ini berisi:

Sistem atau proyek lain yang menjadi prasyarat Epic ini.
Dependensi terhadap sumber daya (SDM, vendor, infrastruktur).
Waktu atau milestone lain yang harus dicapai terlebih dahulu.
Timeline
Bagian ini berisi:

Tahapan utama pengembangan (perencanaan, desain, pembangunan, uji coba, implementasi).
Estimasi waktu atau rentang bulan untuk tiap tahap.
Penanggung jawab utama di tiap fase.

Informasi Pembantu
Bagian ini berisi:

Dokumen acuan (BRD, PRD, ERD, Flowchart, MoM rapat, hasil survei, atau wireframe).
Link ke repository, dokumentasi teknis, atau hasil diskusi tim.
Catatan tambahan yang membantu pemahaman Epic.

MoM
Date
Agenda
Attendee








