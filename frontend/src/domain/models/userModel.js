export const toUserModel = (raw = {}) => ({
  id_user: String(raw.id_user || ""),
  nama: String(raw.nama || ""),
  blok_rumah: String(raw.blok_rumah || ""),
  no_hp: String(raw.no_hp || ""),
  role: String(raw.role || "warga"),
});
