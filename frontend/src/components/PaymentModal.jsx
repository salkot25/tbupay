import { useState, useRef, useEffect } from "react";
import useStore from "../store/useStore";
import imageCompression from "browser-image-compression";
import { Camera, CalendarDays, X } from "lucide-react";
import {
  createTransaction,
  addTransactionCategory,
  deleteTransactionCategory,
  getTransactionCategories,
  reorderTransactionCategories,
} from "../application/use-cases/transactions/transactionUseCases";
import "./PaymentModal.css";

export default function PaymentModal({ isOpen, onClose }) {
  const user = useStore((state) => state.user);
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const isAdmin = user?.role === "admin";
  const [transactionType, setTransactionType] = useState("pemasukan");
  const [kategori, setKategori] = useState("Kas Rutin");

  // Format YYYY-MM for <input type="month">
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [bulan, setBulan] = useState(currentMonth);
  const [nominal, setNominal] = useState("");
  const [catatan, setCatatan] = useState(""); // New Notes field
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [sortingCategory, setSortingCategory] = useState(false);
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const fileInputRef = useRef(null);

  const defaultPemasukanOptions = [
    "Kas Rutin",
    "Sumbangan Sosial",
    "Kebersihan Ekstra",
  ];
  const defaultPengeluaranOptions = [
    "Operasional RT",
    "Perawatan Lingkungan",
    "Keamanan",
    "Kebersihan",
    "Lainnya",
  ];
  const [pemasukanOptions, setPemasukanOptions] = useState(
    defaultPemasukanOptions,
  );
  const [pengeluaranOptions, setPengeluaranOptions] = useState(
    defaultPengeluaranOptions,
  );

  const getActiveOptions = () =>
    transactionType === "pengeluaran" ? pengeluaranOptions : pemasukanOptions;

  const setActiveOptions = (newOptions) => {
    if (transactionType === "pengeluaran") {
      setPengeluaranOptions(newOptions);
    } else {
      setPemasukanOptions(newOptions);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await getTransactionCategories();
      if (res.status === "success") {
        const serverPemasukan = res.data?.pemasukan || [];
        const serverPengeluaran = res.data?.pengeluaran || [];
        setPemasukanOptions(
          serverPemasukan.length > 0
            ? serverPemasukan
            : defaultPemasukanOptions,
        );
        setPengeluaranOptions(
          serverPengeluaran.length > 0
            ? serverPengeluaran
            : defaultPengeluaranOptions,
        );
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadCategories();
    setTransactionType("pemasukan");
    setKategori("Kas Rutin");
    setBulan(currentMonth);
    setNominal("");
    setCatatan("");
    setPreviewUrl(null);
    setNewCategory("");
    setIsCategoryEditorOpen(false);
  }, [isOpen, currentMonth]);

  useEffect(() => {
    const opts = getActiveOptions();
    if (!opts.includes(kategori)) {
      setKategori(opts[0] || "");
    }
  }, [transactionType, pemasukanOptions, pengeluaranOptions]);

  useEffect(() => {
    setIsCategoryEditorOpen(false);
    setNewCategory("");
  }, [transactionType]);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      showAlert("Nama kategori tidak boleh kosong.", {
        variant: "warning",
        title: "Validasi",
      });
      return;
    }

    setAddingCategory(true);
    try {
      const res = await addTransactionCategory({
        jenis_transaksi: transactionType,
        nama_kategori: trimmed,
        created_by_role: user?.role || "",
      });
      if (res.status === "success") {
        setNewCategory("");
        await loadCategories();
        setKategori(trimmed);
      } else {
        showAlert(res.message || "Gagal menambahkan kategori.", {
          variant: "danger",
          title: "Gagal",
        });
      }
    } catch (err) {
      showAlert("Terjadi kesalahan koneksi.", {
        variant: "danger",
        title: "Kesalahan Koneksi",
      });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = (name) => {
    const activeOptions = getActiveOptions();
    if (activeOptions.length <= 1) {
      showAlert("Kategori minimal harus tersisa 1 item.", {
        variant: "warning",
        title: "Tidak Bisa Dihapus",
      });
      return;
    }

    showConfirm(
      `Hapus kategori "${name}"?`,
      async () => {
        try {
          const res = await deleteTransactionCategory({
            jenis_transaksi: transactionType,
            nama_kategori: name,
            created_by_role: user?.role || "",
          });
          if (res.status === "success") {
            await loadCategories();
          } else {
            showAlert(res.message || "Gagal menghapus kategori.", {
              variant: "danger",
              title: "Gagal",
            });
          }
        } catch (err) {
          showAlert("Terjadi kesalahan koneksi.", {
            variant: "danger",
            title: "Kesalahan Koneksi",
          });
        }
      },
      {
        title: "Hapus Kategori",
        variant: "danger",
        confirmLabel: "Hapus",
      },
    );
  };

  const handleSortSave = async (orderedOptions) => {
    setSortingCategory(true);
    try {
      const res = await reorderTransactionCategories({
        jenis_transaksi: transactionType,
        ordered_names: orderedOptions,
        created_by_role: user?.role || "",
      });
      if (res.status !== "success") {
        showAlert(res.message || "Gagal menyimpan urutan kategori.", {
          variant: "danger",
          title: "Gagal",
        });
        await loadCategories();
      }
    } catch (err) {
      showAlert("Terjadi kesalahan koneksi saat menyimpan urutan.", {
        variant: "danger",
        title: "Kesalahan Koneksi",
      });
      await loadCategories();
    } finally {
      setSortingCategory(false);
    }
  };

  const moveOption = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const options = [...getActiveOptions()];
    const [moved] = options.splice(fromIndex, 1);
    options.splice(toIndex, 0, moved);
    setActiveOptions(options);
    handleSortSave(options);
  };

  // Close when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      onClose();
    }
  };

  const handleNominalChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value) {
      setNominal(new Intl.NumberFormat("id-ID").format(value));
    } else {
      setNominal("");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      showAlert("Gagal mengompres gambar.", {
        variant: "danger",
        title: "Gagal",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiresProof = !isAdmin || transactionType === "pemasukan";
    if (!kategori) {
      showAlert("Pilih kategori transaksi terlebih dahulu.", {
        variant: "warning",
        title: "Form Tidak Lengkap",
      });
      return;
    }
    if (!nominal || (requiresProof && !previewUrl)) {
      showAlert(
        requiresProof
          ? "Mohon lengkapi nominal dan bukti foto."
          : "Mohon lengkapi nominal transaksi.",
        {
          variant: "warning",
          title: "Form Tidak Lengkap",
        },
      );
      return;
    }

    setLoading(true);
    try {
      const numericNominal = parseInt(nominal.replace(/\./g, ""), 10);

      // Convert "2026-05" back to "Mei 2026" or just pass "2026-05"
      // Let's pass the raw YYYY-MM so the backend can parse it, or format it
      const dateObj = new Date(bulan + "-01");
      const bulanFormatted = dateObj.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      let ket = `${kategori} - ${bulanFormatted}`;
      if (catatan) {
        ket += ` (${catatan})`;
      }

      const res = await createTransaction({
        id_user: user?.id_user || "",
        jenis: transactionType,
        nominal: numericNominal,
        keterangan: ket,
        imageBase64: previewUrl,
        created_by_role: user?.role || "",
      });

      if (res.status === "success") {
        const successMessage =
          transactionType === "pengeluaran"
            ? "Pengeluaran berhasil dicatat ke kas perumahan."
            : isAdmin
              ? "Pemasukan berhasil dicatat ke kas perumahan."
              : "Bukti pembayaran berhasil dikirim dan menunggu verifikasi.";
        showAlert(successMessage, { variant: "success", title: "Berhasil" });
        onClose(); // close modal on success
      } else {
        showAlert("Gagal mengirim bukti pembayaran: " + res.message, {
          variant: "danger",
          title: "Gagal",
        });
      }
    } catch (err) {
      showAlert("Terjadi kesalahan koneksi.", {
        variant: "danger",
        title: "Kesalahan Koneksi",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`modal-overlay ${isOpen ? "open" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className="modal-content enterprise-compact">
        <div className="modal-header">
          <h3>{isAdmin ? "Input Kas" : "Lapor Iuran"}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p
            className="caption text-secondary"
            style={{ marginBottom: "20px" }}
          >
            {isAdmin
              ? "Catat pemasukan atau pengeluaran kas perumahan secara langsung."
              : "Kirim bukti transfer untuk verifikasi pembayaran Anda."}
          </p>

          <form className="payment-form" onSubmit={handleSubmit}>
            {isAdmin && (
              <div className="form-group">
                <label>Tipe Transaksi</label>
                <div
                  className="transaction-toggle"
                  role="tablist"
                  aria-label="Tipe transaksi"
                >
                  <button
                    type="button"
                    className={`tx-btn ${transactionType === "pemasukan" ? "active pemasukan" : ""}`}
                    onClick={() => setTransactionType("pemasukan")}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    className={`tx-btn ${transactionType === "pengeluaran" ? "active pengeluaran" : ""}`}
                    onClick={() => setTransactionType("pengeluaran")}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>
                {transactionType === "pengeluaran"
                  ? "Kategori Pengeluaran"
                  : "Jenis Iuran"}
              </label>
              <div className="category-select-row">
                <select
                  className="input-field"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  {getActiveOptions().map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {isAdmin && (
                  <button
                    type="button"
                    className="btn-edit-category"
                    onClick={() => setIsCategoryEditorOpen(true)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Bulan Penagihan</label>
              <div className="month-input-shell">
                <CalendarDays size={16} />
                <input
                  type="month"
                  className="input-field month-input"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  required
                />
              </div>
              <span className="field-hint">Periode iuran yang dilaporkan</span>
            </div>

            <div className="form-group">
              <label>Nominal (Rp)</label>
              <div className="nominal-input-wrapper">
                <span className="currency-prefix">Rp</span>
                <input
                  type="text"
                  className="input-field with-prefix tabular-nums"
                  placeholder="0"
                  value={nominal}
                  onChange={handleNominalChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Catatan Tambahan (Opsional)</label>
              <textarea
                className="input-field"
                rows="2"
                placeholder="Contoh: Titip iuran sekalian buat Pak RT"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>
                {transactionType === "pengeluaran" && isAdmin
                  ? "Upload Lampiran (Opsional)"
                  : "Upload Bukti Transfer"}
              </label>

              {!previewUrl ? (
                <div
                  className="image-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={32} style={{ marginBottom: "8px" }} />
                  <p
                    className="caption"
                    style={{ color: "#4b5563", fontWeight: 600 }}
                  >
                    Klik untuk ambil foto / galeri
                  </p>
                  {transactionType === "pengeluaran" && isAdmin && (
                    <p
                      style={{ fontSize: "10px" }}
                      className="text-secondary mt-1"
                    >
                      Boleh dikosongkan jika tidak ada lampiran.
                    </p>
                  )}
                  <p
                    style={{ fontSize: "10px" }}
                    className="text-secondary mt-1"
                  >
                    Maks. 500KB
                  </p>
                </div>
              ) : (
                <div className="image-preview-area">
                  <img
                    src={previewUrl}
                    alt="Bukti Pembayaran"
                    className="preview-img"
                  />
                  <button
                    type="button"
                    className="remove-img-btn"
                    onClick={() => setPreviewUrl(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: "16px" }}
              disabled={loading}
            >
              {loading
                ? "Menyimpan..."
                : transactionType === "pengeluaran" && isAdmin
                  ? "Simpan Pengeluaran"
                  : "Kirim Laporan"}
            </button>
          </form>

          {isAdmin && isCategoryEditorOpen && (
            <div
              className="category-popup-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsCategoryEditorOpen(false);
                }
              }}
            >
              <div className="category-popup">
                <div className="category-popup-header">
                  <h4>
                    {transactionType === "pengeluaran"
                      ? "Kelola Kategori Pengeluaran"
                      : "Kelola Jenis Iuran"}
                  </h4>
                  <button
                    type="button"
                    className="category-popup-close"
                    onClick={() => setIsCategoryEditorOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="category-popup-hint">
                  Tambah, hapus, atau drag kategori untuk mengatur urutan
                  dropdown.
                </p>

                <div className="category-input-row">
                  <input
                    type="text"
                    className="input-field"
                    placeholder={
                      transactionType === "pengeluaran"
                        ? "Tambah kategori pengeluaran"
                        : "Tambah jenis iuran"
                    }
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-add-category"
                    onClick={handleAddCategory}
                    disabled={addingCategory}
                  >
                    {addingCategory ? "..." : "Tambah"}
                  </button>
                </div>

                <div className="category-chip-wrap popup">
                  {getActiveOptions().map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      className={`category-chip ${kategori === opt ? "active" : ""} ${sortingCategory ? "sorting" : ""} ${dragIndex === idx ? "dragging" : ""}`}
                      onClick={() => setKategori(opt)}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        moveOption(dragIndex, idx);
                        setDragIndex(null);
                      }}
                      onDragEnd={() => setDragIndex(null)}
                    >
                      <span className="drag-handle">::</span>
                      <span>{opt}</span>
                      <span
                        className="chip-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(opt);
                        }}
                      >
                        <X size={12} />
                      </span>
                    </button>
                  ))}
                </div>

                {sortingCategory && (
                  <span className="category-saving-hint">
                    Menyimpan urutan...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
