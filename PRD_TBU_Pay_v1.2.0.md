# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Nama Produk:** TBU Pay  
**Platform:** Mobile (Android & iOS)  
**Versi Dokumen:** 1.2.0  
**Status:** Siap Eksekusi  

---

## 1. Ringkasan Eksekutif
TBU Pay adalah aplikasi manajemen keuangan dan tata kelola lingkungan perumahan tertutup (*gated community*) skala mikro yang ditujukan untuk pengelolaan sekitar 25 Kepala Keluarga (KK). Aplikasi ini bertujuan untuk mendigitalkan pencatatan kas (cashflow), mengotomatisasi pengumpulan bukti pembayaran iuran bulanan, serta memfasilitasi pelaporan warga kepada petugas lapangan (satpam/teknisi) secara transparan, akuntabel, dan terpusat.

---

## 2. Tujuan & Matriks Keberhasilan
* **Transparansi Finansial:** Mengurangi gap informasi keuangan antara pengurus RT/RW dan warga hingga 0%.
* **Efisiensi Operasional:** Mempercepat proses verifikasi bukti bayar iuran oleh bendahara dari hitungan hari menjadi hitungan menit/jam.
* **Respons Layanan:** Mempercepat waktu tanggap (*response time*) teknisi/satpam terhadap keluhan fasilitas warga melalui sistem pelaporan digital terpadu.

---

## 3. Ruang Lingkup (Scope)

### 3.1. Masuk dalam Ruang Lingkup (In-Scope)
* **Autentikasi Terpusat:** Manajemen akun dikelola penuh oleh admin/pengurus. Tidak ada registrasi mandiri untuk mencegah akun bodong.
* **Manajemen Cashflow:** Dasbor overview keuangan perumahan yang mencakup total saldo, total pemasukan, dan detail pengeluaran bulanan.
* **Digitalisasi Bukti Bayar:** Fitur unggah struk transfer/bukti bayar dengan kompresi citra otomatis di sisi klien (perangkat pengguna).
* **Modul Layanan Publik:** Sistem pelaporan keluhan warga (*ticketing*), kotak saran anonim/non-anonim, repositori berita terkini, dan dasbor pantauan keluhan.
* **Role-Based Access Control (RBAC):** Pemisahan hak akses dan tampilan antarmuka antara Warga, Pengurus (Admin), dan Petugas Lapangan (Satpam/Teknisi).

### 3.2. Di luar Ruang Lingkup (Out-of-Scope)
* *Payment Gateway* Otomatis (Midtrans, Xendit, dll.). Pembayaran iuran tetap dilakukan melalui transfer bank manual atau tunai; aplikasi hanya mencatat dan memverifikasi buktinya.
* Fitur obrolan langsung (*real-time chat*) antarwarga (digantikan oleh modul Pengumuman/Berita dan Kotak Saran).

---

## 4. Arsitektur & Tech Stack

Aplikasi ini mengedepankan prinsip **Zero-Cost Serverless Operation** agar tidak membebani kas warga untuk biaya pemeliharaan infrastruktur bulanan.

* **Pola Arsitektur Frontend:** *Clean Architecture* di Flutter (Pemisahan tegas antara lapisan *Presentation*, *Domain*, dan *Data/Repository*).
* **State Management:** Riverpod (menjamin *predictable state*, *compile-safe dependency injection*, serta efisiensi *caching* data).
* **Backend Engine:** Google Apps Script (GAS) yang diekspos sebagai komponen *REST API Web Service*.
* **Basis Data (Database):** Google Sheets (sebagai penyimpanan data terstruktur yang mudah dipantau dan diekspor oleh bendahara non-IT).
* **Penyimpanan Berkas (Storage):** Google Drive Folder via API GAS (gambar dikonversi ke format Base64 atau diunggah via Multipart setelah dikompresi di aplikasi lokal maksimal 500KB).

---

## 5. Struktur Tabel Database (Google Sheets Layout)

### 5.1. Tabel `tb_users`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id_user` | String (UUID/Auto) | Primary Key |
| `nama` | String | Nama lengkap warga/petugas |
| `blok_rumah` | String | Nomor/Blok rumah (contoh: A-12) |
| `no_hp` | String | Nomor WhatsApp aktif |
| `role` | String | `warga` \| `petugas` \| `admin` |
| `password_hash`| String | Kata sandi terenkripsi (SHA-256) |

### 5.2. Tabel `tb_transaksi`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id_transaksi` | String | Primary Key |
| `id_user` | String | Foreign Key ke `tb_users` |
| `jenis` | String | `pemasukan` \| `pengeluaran` |
| `nominal` | Numeric | Jumlah uang dalam Rupiah |
| `keterangan` | String | Deskripsi (cth: "Iuran Keamanan Juni") |
| `url_bukti` | String | Link berkas foto di Google Drive |
| `status` | String | `pending` \| `verified` \| `rejected` |
| `timestamp` | Datetime | Waktu pencatatan sistem |

### 5.3. Tabel `tb_tiket_layanan`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id_tiket` | String | Primary Key |
| `id_user_pelapor`| String | Foreign Key ke `tb_users` (Warga) |
| `kategori` | String | `keluhan` \| `saran` |
| `deskripsi` | String | Detail keluhan atau saran |
| `url_foto_kondisi`| String | Bukti visual kerusakan/fasilitas (opsional) |
| `status` | String | `open` \| `proses` \| `done` |
| `id_petugas_pic` | String | Foreign Key ke `tb_users` (Petugas Lapangan) |
| `timestamp` | Datetime | Waktu pengaduan dibuat |

### 5.4. Tabel `tb_berita`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id_berita` | String | Primary Key |
| `judul` | String | Judul berita/pengumuman |
| `konten` | String | Detail pengumuman perumahan |
| `tanggal` | Date | Tanggal publikasi |

---

## 6. Spesifikasi Antarmuka Layar (Screen Requirements)

Aplikasi menggunakan pendekatan *Stateful Shell Navigation*. Seluruh navigasi diatur oleh *Bottom Navbar* berisikan 5 tab utama. Jika pengguna masuk dengan peran *Petugas*, Tab 3 otomatis disembunyikan atau diubah menjadi daftar penugasan kerja.

### 6.1. Alur Otentikasi & Launching
1.  **Splash Screen:** Tampilan bersih berlatar belakang warna primer dengan logo minimalis (logomark) TBU Pay di tengah layar. Memeriksa ketersediaan token sesi lokal.
2.  **Login Screen:** Form minimalis tanpa hiasan berlebih. Input berupa `Nomor Blok / Username` dan `Password`. Tombol aksi utama bermodel *solid rectangle*. Menyediakan tombol bantuan langsung untuk menghubungi pengurus via WhatsApp jika lupa kata sandi.

### 6.2. Tab 1: Beranda (Home Screen)
* **Header Section:** Sapaan personal (Contoh: "Halo, Pak Budi - Blok A-12") disertai penanda peran (*role*).
* **Financial Card:** Ringkasan Total Kas Perumahan saat ini dengan angka berukuran besar.
* **Quick Information Slider:** Menampilkan 3 judul berita atau pengumuman darurat perumahan terbaru.
* **Status Widget:** Indikator ringkas mengenai status iuran bulan berjalan pengguna (Hijau: *Lunas*, Kuning: *Belum Bayar/Menunggu Verifikasi*).

### 6.3. Tab 2: Laporan Cashflow (Overview Keuangan)
* **Sub-Header:** Kontrol selektor segmen (*Segmented Control Tab*) untuk memisahkan data Arus Pemasukan dan Arus Pengeluaran.
* **Transaction List:** Tampilan daftarsinkronis kronologis dengan nominal tebal menggunakan tipe angka *tabular font*. Setiap baris dipisahkan oleh garis batas abu-abu sangat tipis (*hairline border*) dan dilengkapi label status pembayaran (`Verified`/`Pending`).

### 6.4. Tab 3: Tambah Bukti Bayar (Khusus Role Warga)
* **Dropdown Selector:** Pilihan Bulan Penagihan dan Jenis Iuran (cth: Kas Rutin, Sumbangan Sosial).
* **Text Field:** Input nominal uang tunai/transfer (otomatis menerapkan format *currency masking* Rupiah).
* **Image Attachment Area:** Kotak interaktif untuk mengambil foto struk via Kamera atau Galeri. Menampilkan gambar pratinjau (*preview*) setelah dipilih.
* **Action Button:** Tombol "Kirim Bukti Pembayaran" yang akan memicu proses kompresi gambar lokal sebelum diunggah ke *backend*.

### 6.5. Tab 4: Layanan (Service Hub Screen)
Menampilkan 4 menu utama berbentuk list minimalis atau grid 2x2 bersih:
1.  **Buat Keluhan:** Formulir pengaduan masalah fasilitas umum (cth: lampu jalan mati, sampah belum diangkut) + unggah lampiran foto.
2.  **Kotak Saran:** Input teks aspirasi warga yang langsung terkirim ke dasbor pengurus.
3.  **Berita Terkini:** Halaman kumpulan artikel berita, notulensi rapat warga, dan agenda kegiatan perumahan.
4.  **Pantauan Keluhan Warga:** Daftar semua tiket aduan yang masuk di perumahan secara transparan.
    * *Sisi Warga:* Hanya bisa melihat *progress update* status (`Open` -> `Proses` -> `Done`) beserta nama petugas yang menangani.
    * *Sisi Petugas (Satpam/Teknisi):* Tombol aksi khusus untuk mengubah status aduan dari `Open` menjadi `Proses`, dan menyelesaikannya menjadi `Done` setelah pekerjaan fisik selesai di lapangan.

### 6.6. Tab 5: Profil
* **User Profile Card:** Menampilkan foto profil standar, nama lengkap, nomor rumah, dan nomor kontak terdaftar.
* **Menu List:**
    * Ubah Password Akun
    * Tentang Aplikasi TBU Pay (Informasi Versi)
    * Tombol *Logout* (Berwarna merah semantik/Danger).

---

## 7. Design System & Panduan Visual

*Design system* ini diimplementasikan secara global pada `ThemeData` Flutter untuk menjamin performa rendering yang efisien dan tampilan yang seragam (*pixel-perfect*).

### 7.1. Palet Warna (Color Palette)
* **Primary Color:** `#0F4C81` (Classic Blue) – Warna dominan untuk identitas, tombol utama, dan aksen navigasi aktif. Memberikan kesan aman dan terpercaya.
* **Background Color:** `#FAFAFA` (Off-White/Light Gray) – Warna dasar latar belakang seluruh aplikasi untuk mengurangi kelelahan mata pengguna (*eye strain*).
* **Surface Color:** `#FFFFFF` (Solid White) – Digunakan khusus sebagai latar belakang komponen *card*, lembar isian *form*, dan *bottom navbar*.
* **Text Primary:** `#111827` (Dark Slate) – Warna teks utama untuk judul halaman, angka saldo, dan nama menu.
* **Text Secondary:** `#6B7280` (Medium Gray) – Warna teks sekunder untuk *subtitle*, deskripsi keluhan, dan label tanggal.
* **Semantic Colors (Status Indicators):**
    * *Success / Verified / Done:* `#10B981` (Emerald Green)
    * *Warning / Pending / Proses:* `#F59E0B` (Amber Orange)
    * *Danger / Error / Logout:* `#EF4444` (Crimson Red)
    * *Borders / Dividers:* `#E5E7EB` (Soft Gray Hairline)

### 7.2. Tipografi (Typography)
* **Font Utama:** **Inter** (Google Fonts). Dipilih karena keterbacaan yang tinggi pada layar gawai kecil serta mendukung fitur *tabular numbers* (setiap angka memiliki lebar spasial yang sama, mencegah posisi angka bergeser saat memperbarui digit finansial).
* **Skala Tipografi:**
    * *Heading 1 (Saldo Utama):* Inter SemiBold, 32pt.
    * *Heading 2 (Judul Menu/Halaman):* Inter SemiBold, 20pt.
    * *Body Text (Konten/Berita):* Inter Regular, 14pt.
    * *Caption (Label Status/Tanggal):* Inter Medium, 12pt.

### 7.3. Spasi & Tata Letak (Spacing & Layout)
* **Sistem Grid:** Berbasis sistem kelipatan 8-point (*8-point grid system*).
    * *Padding* Tepi Layar: 24px (Kiri & Kanan).
    * *Padding* Dalam Komponen (*Card/Form*): 16px.
    * Jarak Antar-Elemen Vertikal: 8px atau 16px.
* **Geometri Komponen:**
    * *Border Radius* (Kelengkungan Sudut): Berukuran konstan antara 8px sampai 12px untuk menghasilkan impresi modern namun tegas.
    * *Bayangan (Drop Shadow):* Ditiadakan secara total demi pendekatan *flat design*. Pemisahan antar-elemen visual murni menggunakan kontras warna latar belakang atau garis pembatas (*hairline border*) berukuran 1px dengan kode warna `#E5E7EB`.
* **Ikonografi:** Menggunakan pustaka ikon berbasis garis luar (*Outlined Style*) seperti *Feather Icons* atau *Material Symbols Outlined* dengan ketebalan garis konstan sebesar 1.5px hingga 2.0px.

---

## 8. Jadwal Pengoperasian & Roadmap Pengembangan

* **Minggu 1 - 2 (Fase Arsitektur & Autentikasi):** Inisiasi proyek Flutter, konfigurasi global `ThemeData`, pembuatan lembar kerja basis data di Google Sheets, integrasi awal Google Apps Script, penyelesaian UI/UX halaman Login, Beranda, dan Profil beserta manajemen *state* autentikasi.
* **Minggu 3 - 4 (Fase Modul Finansial):** Implementasi logika penarikan data kas keuangan perumahan pada Tab Cashflow, penyusunan fungsi kompresi citra pada perangkat lokal, serta mekanisme pengiriman data Base64/Multipart untuk fitur Tambah Bukti Bayar.
* **Minggu 5 - 6 (Fase Modul Layanan Warga & UAT):** Penyusunan modul pelaporan tiket keluhan, aktivasi fitur RBAC penugasan untuk *role* Satpam/Teknisi, pengerjaan Kotak Saran dan Berita, dilanjutkan pengujian validasi sistem menyeluruh (*User Acceptance Testing*) bersama perwakilan pengurus perumahan.
