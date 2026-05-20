const toValidDateString = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export const toTicketModel = (raw = {}) => ({
  id_tiket: String(raw.id_tiket || ""),
  id_user_pelapor: String(raw.id_user_pelapor || ""),
  kategori: String(raw.kategori || ""),
  deskripsi: String(raw.deskripsi || ""),
  url_foto_kondisi: String(raw.url_foto_kondisi || ""),
  status: String(raw.status || "open"),
  id_petugas_pic: String(raw.id_petugas_pic || ""),
  timestamp: toValidDateString(raw.timestamp) || String(raw.timestamp || ""),
});
