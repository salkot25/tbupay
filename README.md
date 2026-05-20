# TBU Pay Monorepo

Repositori ini berisi seluruh komponen utama TBU Pay, yaitu frontend web (React + Vite) dan backend serverless berbasis Google Apps Script (GAS).

## Tujuan

TBU Pay dirancang untuk mendukung operasional perumahan skala mikro:

- Transparansi cashflow warga
- Digitalisasi bukti pembayaran iuran
- Pelaporan layanan warga (ticketing)
- Manajemen berita dan komunikasi internal

## Struktur Monorepo

```text
tbu_pay/
  backend/
    Code.gs
  frontend/
    src/
    package.json
  PRD_TBU_Pay_v1.2.0.md
  design.html
```

## Arsitektur Tingkat Tinggi

- Frontend: React 19, Vite, Zustand, React Router
- Backend: Google Apps Script sebagai action-based API
- Data store: Google Sheets
- File store: Google Drive

Alur ringkas:

1. Frontend memanggil endpoint GAS melalui parameter action.
2. GAS memproses request GET/POST sesuai action.
3. GAS membaca/menulis data pada Google Sheets.
4. Untuk lampiran gambar, GAS menyimpan file ke Google Drive.

## Modul Utama

### Frontend ([frontend](frontend))

- UI role-based untuk admin, warga, petugas
- Clean architecture (domain, use-case, repository, adapter)
- Cache dan fallback offline untuk endpoint baca

Dokumentasi detail frontend tersedia di [frontend/README.md](frontend/README.md).

### Backend ([backend](backend))

- Endpoint tunggal Web App dengan routing action
- Mendukung fitur auth, transaksi, ticketing, berita, user management
- Mendukung kategori transaksi dinamis

Template dokumentasi API backend tersedia di [backend/API_TEMPLATE.md](backend/API_TEMPLATE.md).

## Quick Start

### 1. Jalankan Frontend Lokal

```bash
cd frontend
npm install
npm run dev
```

### 2. Konfigurasi Frontend ke Backend

Buat file .env pada folder frontend:

```env
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### 3. Deploy Backend GAS

1. Buka [backend/Code.gs](backend/Code.gs) di Google Apps Script.
2. Deploy sebagai Web App.
3. Atur Execute as dan Who has access sesuai kebijakan lingkungan.
4. Salin URL deployment ke VITE_GAS_URL.

## Praktik Operasional

- Pisahkan environment dev/staging/prod
- Lindungi identifier sensitif Spreadsheet dan Drive folder
- Lakukan audit perubahan data kritis (verifikasi transaksi, perubahan user)
- Gunakan proses review pull request sebelum merge

## Standar Kontribusi

1. Buat branch fitur dari main.
2. Pastikan lint/build frontend lolos.
3. Perbarui dokumentasi jika ada perubahan kontrak API atau perilaku bisnis.
4. Ajukan pull request dengan ringkasan risiko dan rollback plan.

## Dokumen Referensi

- PRD: [PRD_TBU_Pay_v1.2.0.md](PRD_TBU_Pay_v1.2.0.md)
- Desain awal: [design.html](design.html)
- Frontend docs: [frontend/README.md](frontend/README.md)
- Backend API template: [backend/API_TEMPLATE.md](backend/API_TEMPLATE.md)

## Lisensi

Tentukan lisensi resmi proyek sesuai kebijakan organisasi sebelum distribusi publik.
