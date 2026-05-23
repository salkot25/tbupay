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
    if (e.target === e.currentTarget) {
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
      className={`fixed inset-0 z-50 flex justify-center items-end bg-black/50 transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`w-full max-w-[480px] bg-white rounded-t-3xl h-[85vh] flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center py-4 px-4.5 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-base tracking-[0.1px] text-gray-800 m-0">
            {isAdmin ? "Input Kas" : "Lapor Iuran"}
          </h3>
          <button 
            className="p-1.5 bg-gray-100 rounded-full text-gray-600 border-none cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-200" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative p-4 overflow-y-auto flex-1">
          <p className="text-[12px] font-medium leading-[1.4] text-gray-500 mb-5">
            {isAdmin
              ? "Catat pemasukan atau pengeluaran kas perumahan secara langsung."
              : "Kirim bukti transfer untuk verifikasi pembayaran Anda."}
          </p>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            {isAdmin && (
              <div className="flex flex-col gap-[3px]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Tipe transaksi">
                  <button
                    type="button"
                    className={`min-h-[34px] text-[11px] font-bold rounded-[9px] border cursor-pointer transition-all ${
                      transactionType === "pemasukan" 
                        ? "border-green-300 bg-green-50 text-green-800" 
                        : "border-[#dbe3ee] bg-slate-50 text-slate-600"
                    }`}
                    onClick={() => setTransactionType("pemasukan")}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    className={`min-h-[34px] text-[11px] font-bold rounded-[9px] border cursor-pointer transition-all ${
                      transactionType === "pengeluaran" 
                        ? "border-red-300 bg-red-50 text-red-800" 
                        : "border-[#dbe3ee] bg-slate-50 text-slate-600"
                    }`}
                    onClick={() => setTransactionType("pengeluaran")}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-[3px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">
                {transactionType === "pengeluaran" ? "Kategori Pengeluaran" : "Jenis Iuran"}
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select
                  className="w-full min-h-[40px] px-3 py-[9px] rounded-[10px] text-[13px] bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-900 focus:border-blue-500"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  {getActiveOptions().map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {isAdmin && (
                  <button
                    type="button"
                    className="border border-[#dbe3ee] rounded-[9px] bg-white text-slate-700 min-w-[58px] min-h-[34px] px-3 text-[11px] font-bold cursor-pointer hover:bg-slate-50"
                    onClick={() => setIsCategoryEditorOpen(true)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[3px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">Bulan Penagihan</label>
              <div className="relative flex items-center border border-[#dbe3ee] rounded-[10px] bg-gradient-to-b from-white to-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-within:border-blue-300 focus-within:ring-[3px] focus-within:ring-blue-500/10">
                <CalendarDays size={16} className="absolute left-[11px] text-slate-500 pointer-events-none" />
                <input
                  type="month"
                  className="w-full min-h-[40px] pl-[42px] pr-3 bg-transparent border-none font-semibold text-gray-800 text-[13px] outline-none"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  required
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-[1px]">Periode iuran yang dilaporkan</span>
            </div>

            <div className="flex flex-col gap-[3px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">Nominal (Rp)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-700 font-semibold text-[13px] z-[1] pointer-events-none">Rp</span>
                <div className="absolute left-10 top-[9px] bottom-[9px] w-[1px] bg-gray-200 pointer-events-none"></div>
                <input
                  type="text"
                  className="w-full min-h-[40px] pl-[50px] pr-3 rounded-[10px] text-[13px] bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-900 tabular-nums focus:border-blue-500"
                  placeholder="0"
                  value={nominal}
                  onChange={handleNominalChange}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-[3px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">Catatan Tambahan (Opsional)</label>
              <textarea
                className="w-full min-h-[72px] px-3 py-[9px] rounded-[10px] text-[13px] bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-900 resize-y focus:border-blue-500"
                placeholder="Contoh: Titip iuran sekalian buat Pak RT"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-[3px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.25px]">
                {transactionType === "pengeluaran" && isAdmin
                  ? "Upload Lampiran (Opsional)"
                  : "Upload Bukti Transfer"}
              </label>

              {!previewUrl ? (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-[22px_14px] flex flex-col items-center justify-center text-gray-400 bg-gray-50 cursor-pointer transition-colors hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={32} className="mb-2" />
                  <p className="text-[13px] font-semibold text-gray-600 m-0">
                    Klik untuk ambil foto / galeri
                  </p>
                  {transactionType === "pengeluaran" && isAdmin && (
                    <p className="text-[10px] text-gray-500 mt-1 m-0">
                      Boleh dikosongkan jika tidak ada lampiran.
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1 m-0">Maks. 500KB</p>
                </div>
              ) : (
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                  <img src={previewUrl} alt="Bukti Pembayaran" className="w-full max-h-[200px] object-cover block" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white/90 text-red-500 border-none rounded-full p-1.5 cursor-pointer flex items-center justify-center shadow-sm"
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
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <button
              type="submit"
              className="bg-[#0f4c81] text-white border-none rounded-lg mt-4 min-h-[40px] text-[14px] font-semibold cursor-pointer w-full flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="absolute inset-0 z-[5] bg-slate-900/45 flex items-center justify-center p-4 max-h-[820px]:fixed max-h-[820px]:z-[120] max-h-[820px]:p-0 max-[480px]:items-stretch"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsCategoryEditorOpen(false);
              }}
            >
              <div className="w-full max-w-[420px] max-h-[78vh] overflow-y-auto bg-white rounded-[14px] p-3 border border-slate-200 shadow-[0_14px_40px_rgba(15,23,42,0.2)] max-[480px]:max-w-none max-[480px]:max-h-none max-[480px]:h-full max-[480px]:rounded-none max-[480px]:border-none max-[480px]:shadow-none max-[480px]:p-[14px_14px_18px] max-[480px]:flex max-[480px]:flex-col">
                <div className="flex items-center justify-between mb-1.5 max-[480px]:sticky max-[480px]:top-0 max-[480px]:z-[2] max-[480px]:bg-white max-[480px]:pb-2 max-[480px]:mb-2 max-[480px]:border-b max-[480px]:border-slate-200">
                  <h4 className="m-0 text-[13px] font-bold text-slate-900">
                    {transactionType === "pengeluaran" ? "Kelola Kategori Pengeluaran" : "Kelola Jenis Iuran"}
                  </h4>
                  <button
                    type="button"
                    className="border-none bg-slate-100 text-slate-600 rounded-lg w-7 h-7 inline-flex items-center justify-center cursor-pointer"
                    onClick={() => setIsCategoryEditorOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="m-0 mb-2.5 text-[11px] text-slate-500 max-[480px]:mb-2">
                  Tambah, hapus, atau drag kategori untuk mengatur urutan dropdown.
                </p>

                <div className="grid grid-cols-[1fr_auto] gap-2 mb-2 max-[480px]:mb-2">
                  <input
                    type="text"
                    className="w-full min-h-[40px] px-3 py-[9px] rounded-[10px] text-[13px] bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-900 focus:border-blue-500"
                    placeholder={transactionType === "pengeluaran" ? "Tambah kategori pengeluaran" : "Tambah jenis iuran"}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <button
                    type="button"
                    className="border-none rounded-[9px] bg-teal-700 text-white text-[11px] font-bold px-3 min-h-[34px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleAddCategory}
                    disabled={addingCategory}
                  >
                    {addingCategory ? "..." : "Tambah"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-[42vh] overflow-y-auto max-[480px]:flex-1 max-[480px]:max-h-none max-[480px]:content-start max-[480px]:pb-2.5">
                  {getActiveOptions().map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      className={`inline-flex items-center gap-1.5 border rounded-full text-[10px] font-semibold p-[5px_7px_5px_9px] cursor-pointer max-[480px]:min-h-[34px] ${
                        kategori === opt ? "border-blue-300 bg-blue-50 text-blue-700" : "border-[#dbe3ee] bg-white text-slate-600"
                      } ${sortingCategory ? "cursor-grab" : ""} ${dragIndex === idx ? "opacity-50" : ""}`}
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
                      <span className="text-[10px] tracking-[-1px] text-slate-400">::</span>
                      <span>{opt}</span>
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-red-500 hover:bg-red-500/10"
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
                  <span className="inline-block mt-2.5 text-[11px] text-slate-500">
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
