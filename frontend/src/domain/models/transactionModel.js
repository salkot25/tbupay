const toValidDateString = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export const toTransactionModel = (raw = {}) => ({
  id_transaksi: String(raw.id_transaksi || ""),
  id_user: String(raw.id_user || ""),
  jenis: String(raw.jenis || ""),
  nominal: Number(raw.nominal) || 0,
  keterangan: String(raw.keterangan || ""),
  url_bukti: String(raw.url_bukti || ""),
  status: String(raw.status || "pending"),
  timestamp: toValidDateString(raw.timestamp) || String(raw.timestamp || ""),
});

export const toTransactionCategoryModel = (raw = {}) => ({
  pemasukan: Array.isArray(raw.pemasukan)
    ? raw.pemasukan.map((x) => String(x || "").trim()).filter(Boolean)
    : [],
  pengeluaran: Array.isArray(raw.pengeluaran)
    ? raw.pengeluaran.map((x) => String(x || "").trim()).filter(Boolean)
    : [],
});
