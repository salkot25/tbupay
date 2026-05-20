# TBU Pay Backend API Template (Google Apps Script)

Dokumen ini adalah template dokumentasi API backend TBU Pay. Gunakan sebagai standar saat menambah, mengubah, atau men-deprecate action pada [backend/Code.gs](backend/Code.gs).

## 1. Metadata Dokumen

- Versi API: v1
- Last Updated: YYYY-MM-DD
- Owner: Team Backend
- Reviewer: Team Frontend
- Environment: dev | staging | production

## 2. Base Endpoint

```text
{GAS_WEB_APP_URL}
```

Contoh:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

## 3. Pola Request

### GET

```text
GET {GAS_WEB_APP_URL}?action={actionName}&param1=value1
```

### POST

```text
POST {GAS_WEB_APP_URL}
Content-Type: application/json

{
  "action": "actionName",
  "...": "payload"
}
```

## 4. Standar Response

### Success

```json
{
  "status": "success",
  "data": [],
  "message": "optional"
}
```

### Error

```json
{
  "status": "error",
  "message": "Human readable error"
}
```

## 5. Daftar Action Aktif

### 5.1 Authentication

#### POST login

- Deskripsi: autentikasi user menggunakan blok rumah atau no_hp + password.
- Payload:

```json
{
  "action": "login",
  "username": "A-12",
  "password": "******"
}
```

- Success Response:

```json
{
  "status": "success",
  "user": {
    "id_user": "uuid",
    "nama": "Nama User",
    "blok_rumah": "A-12",
    "no_hp": "08xxxxxxxxxx",
    "role": "warga"
  }
}
```

### 5.2 Transactions

#### GET getTransactions

- Deskripsi: mengambil daftar transaksi.
- Query params: action=getTransactions

#### POST addTransaction

- Deskripsi: menambah transaksi pemasukan/pengeluaran.
- Catatan: transaksi tertentu dapat auto-verified sesuai role/jenis.

#### POST verifyTransaction

- Deskripsi: verifikasi atau reject transaksi.
- Payload minimum:

```json
{
  "action": "verifyTransaction",
  "id_transaksi": "uuid",
  "action_type": "verify"
}
```

### 5.3 Tickets

#### GET getTickets

- Deskripsi: mengambil daftar tiket layanan.

#### POST addTicket

- Deskripsi: membuat tiket keluhan/saran.

#### POST updateTicketStatus

- Deskripsi: mengubah status tiket (open/proses/done).

### 5.4 News

#### GET getNews

- Deskripsi: mengambil daftar berita.

#### POST addNews

- Deskripsi: menambahkan berita baru (admin only).

#### GET getNewsReplies

- Deskripsi: mengambil balasan berita berdasarkan id_berita.

#### POST addNewsReply

- Deskripsi: menambahkan balasan pada berita.

### 5.5 Users

#### GET getUsers

- Deskripsi: mengambil daftar user.

#### POST addUser

- Deskripsi: menambahkan user baru.

#### POST updateUser

- Deskripsi: memperbarui data user.

#### POST deleteUser

- Deskripsi: menghapus user.

### 5.6 Transaction Category Management

#### GET getTransactionCategories

- Deskripsi: mengambil kategori pemasukan dan pengeluaran.

#### POST addTransactionCategory

- Deskripsi: menambah kategori transaksi (admin only).

#### POST deleteTransactionCategory

- Deskripsi: menghapus kategori transaksi (admin only).

#### POST reorderTransactionCategories

- Deskripsi: mengubah urutan kategori transaksi (admin only).

## 6. Template Detail Endpoint Baru

Salin blok berikut untuk action baru.

```md
### {METHOD} {actionName}

- Status: active | deprecated
- Owner: {team/person}
- Deskripsi: {ringkasan fungsi}
- Auth: public | authenticated | admin-only
- Input:
  - Query Params: {jika GET}
  - Body: {jika POST}
- Validasi:
  - {rule 1}
  - {rule 2}
- Success Response:
  - HTTP: 200
  - Body: {contoh}
- Error Response:
  - status=error
  - message={daftar kemungkinan pesan}
- Side Effects:
  - Update sheet: {sheet_name}
  - Upload file: {folder_name jika ada}
- Idempotency: yes | no
- Observability:
  - Log key: {id/action/user}
- Security Notes:
  - {risiko dan mitigasi}
```

## 7. Mapping Data Store

Isi mapping sumber data aktual:

- Spreadsheet ID: {isi di environment/secrets manager}
- Sheets:
  - tb_users
  - tb_transaksi
  - tb_tiket_layanan
  - tb_berita
  - tb_berita_balasan
  - tb_kategori_transaksi
- Drive Folder ID: {isi di environment/secrets manager}

## 8. Error Catalog Template

| Code               | Message              | Cause                         | Mitigation                              |
| ------------------ | -------------------- | ----------------------------- | --------------------------------------- |
| AUTH_INVALID       | Invalid credentials  | Username/password tidak cocok | Validasi input user                     |
| ACTION_NOT_FOUND   | Action not found     | action tidak terdaftar        | Update frontend/backend contract        |
| VALIDATION_ERROR   | Data tidak valid     | payload tidak sesuai skema    | Tambahkan validasi di client dan server |
| RESOURCE_NOT_FOUND | Data tidak ditemukan | ID tidak ada di sheet         | Cek eksistensi sebelum update           |

## 9. Versioning dan Perubahan

- Strategi versi: action-based backward compatibility
- Setiap breaking change wajib:
  - Diumumkan pada changelog
  - Dikoordinasikan dengan tim frontend
  - Disertai migration plan

## 10. Changelog

| Date       | Version | Change                             | Author    |
| ---------- | ------- | ---------------------------------- | --------- |
| YYYY-MM-DD | v1      | Initial API documentation template | Your Name |
