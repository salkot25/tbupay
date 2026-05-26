import { useState, useRef, useEffect } from "react";
import useStore from "../store/useStore";
import imageCompression from "browser-image-compression";
import { Camera, CalendarDays, X, Eye } from "lucide-react";
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
  const [uploadMeta, setUploadMeta] = useState({ name: "", size: "", type: "" });
  const [isZoomOpen, setIsZoomOpen] = useState(false);
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
    setUploadMeta({ name: "", size: "", type: "" });
    setIsZoomOpen(false);
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

  const handleClearImage = () => {
    setPreviewUrl(null);
    setUploadMeta({ name: "", size: "", type: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi file gambar
    if (!file.type.startsWith("image/")) {
      showAlert("File harus berupa gambar (JPG, PNG, dll.).", {
        variant: "danger",
        title: "Format Salah",
      });
      return;
    }

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const sizeKb = Math.round(compressedFile.size / 1024);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setUploadMeta({
          name: file.name,
          size: `${sizeKb} KB`,
          type: file.type.split("/")[1].toUpperCase(),
        });
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
      className={`fixed inset-0 z-50 flex justify-center items-end bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`w-full max-w-[480px] bg-white rounded-t-[32px] h-fit max-h-[96vh] flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 border-b border-gray-100 shrink-0">
          <h3 className="font-extrabold text-[16px] text-gray-900 m-0">
            {isAdmin ? "Input Kas Baru" : "Lapor Iuran Warga"}
          </h3>
          <button 
            type="button"
            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full border-none cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-90" 
            onClick={onClose}
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </div>
 
        <div className="relative p-6 overflow-y-auto min-h-0 no-scrollbar">
          <p className="text-[11px] font-medium leading-relaxed text-gray-400 m-0 mb-4">
            {isAdmin
              ? "Catat pemasukan atau pengeluaran kas perumahan secara langsung untuk pembukuan RT."
              : "Kirim bukti transfer pembayaran iuran rutin bulanan Anda untuk diverifikasi oleh bendahara."}
          </p>
 
          <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipe Transaksi</label>
                <div className="p-1 rounded-xl flex gap-1 bg-gray-100/80" role="tablist" aria-label="Tipe transaksi">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg cursor-pointer transition-all duration-200 border-none outline-none ${
                      transactionType === "pemasukan" 
                        ? "bg-emerald-500 text-white shadow-sm" 
                        : "bg-transparent text-gray-500 hover:text-gray-900"
                    }`}
                    onClick={() => setTransactionType("pemasukan")}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg cursor-pointer transition-all duration-200 border-none outline-none ${
                      transactionType === "pengeluaran" 
                        ? "bg-rose-500 text-white shadow-sm" 
                        : "bg-transparent text-gray-500 hover:text-gray-900"
                    }`}
                    onClick={() => setTransactionType("pengeluaran")}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>
            )}
 
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {transactionType === "pengeluaran" ? "Kategori Pengeluaran" : "Jenis Iuran"}
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                  >
                    {getActiveOptions().map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
 
                {isAdmin && (
                  <button
                    type="button"
                    className="border-none rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 min-h-[44px] text-xs font-extrabold cursor-pointer transition-all duration-200 active:scale-95 shrink-0 flex items-center justify-center"
                    onClick={() => setIsCategoryEditorOpen(true)}
                  >
                    Kelola
                  </button>
                )}
              </div>
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bulan Penagihan</label>
              <div className="relative flex items-center bg-[#fcfdff] border border-gray-200 rounded-xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all min-h-[44px]">
                <CalendarDays size={16} className="absolute left-3.5 text-gray-400 pointer-events-none stroke-[1.75]" />
                <input
                  type="month"
                  className="w-full min-h-[44px] pl-10 pr-3 bg-transparent border-none font-semibold text-gray-800 text-[12px] outline-none font-sans cursor-pointer"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  required
                />
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Periode iuran yang dilaporkan</span>
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nominal Transaksi</label>
              <div className="flex items-center bg-[#fcfdff] border border-gray-200 rounded-xl px-3.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all min-h-[44px]">
                <span className="text-gray-500 font-extrabold text-xs pr-3 border-r border-gray-200/80 mr-3.5 pointer-events-none">Rp</span>
                <input
                  type="text"
                  className="w-full min-h-[44px] bg-transparent border-none outline-none font-sans text-gray-800 text-[12px] font-extrabold tabular-nums placeholder-gray-300"
                  placeholder="0"
                  value={nominal}
                  onChange={handleNominalChange}
                  required
                />
              </div>
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
              <textarea
                className="w-full min-h-[72px] px-4 py-2.5 rounded-xl text-[12px] bg-[#fcfdff] border border-gray-200 outline-none font-sans text-gray-800 resize-y focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-gray-300"
                placeholder="Contoh: Titip iuran sekalian buat Pak RT"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {transactionType === "pengeluaran" && isAdmin
                  ? "Upload Lampiran (Opsional)"
                  : "Upload Bukti Transfer"}
              </label>
  
              {!previewUrl ? (
                <div
                  className="border-2 border-dashed border-indigo-200/85 bg-indigo-50/10 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl py-7 px-5 flex flex-col items-center justify-center text-gray-400 cursor-pointer transition-all duration-300 active:scale-[0.99] gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={26} className="text-indigo-500 stroke-[1.5]" />
                  <p className="text-[12px] font-bold text-gray-600 m-0 text-center">
                    Klik untuk ambil foto / galeri
                  </p>
                  {transactionType === "pengeluaran" && isAdmin && (
                    <p className="text-[9.5px] text-gray-400 m-0 font-medium text-center">
                      Boleh dikosongkan jika tidak ada lampiran.
                    </p>
                  )}
                  <p className="text-[9.5px] text-gray-400 m-0 font-medium text-center">Format JPG/PNG, maks. 500KB</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-indigo-50/30 border border-indigo-100/80 rounded-2xl p-3 shadow-sm hover:border-indigo-200 transition-all duration-200">
                  {/* Thumbnail */}
                  <div 
                    className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer shrink-0 group"
                    onClick={() => setIsZoomOpen(true)}
                  >
                    <img 
                      src={previewUrl} 
                      alt="Thumbnail Bukti" 
                      className="w-full h-full object-cover block group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] text-white font-extrabold bg-black/40 px-1 py-0.5 rounded shadow">ZOOM</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[11px] font-extrabold text-gray-700 m-0 truncate leading-snug">
                      {uploadMeta.name || "bukti_pembayaran.jpg"}
                    </p>
                    <div className="text-[9.5px] font-bold text-emerald-600 m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-none">
                      <span>{uploadMeta.size || "0 KB"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{uploadMeta.type || "JPG"}</span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 px-1 py-0.2 rounded text-[8px] text-emerald-700">
                        Terkompresi ✓
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="border-none bg-indigo-100/60 hover:bg-indigo-100 text-indigo-700 rounded-lg p-2 cursor-pointer flex items-center justify-center transition-all active:scale-90"
                      onClick={() => setIsZoomOpen(true)}
                      title="Perbesar Bukti"
                    >
                      <Eye size={14} className="stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      className="border-none bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg p-2 cursor-pointer flex items-center justify-center transition-all active:scale-90"
                      onClick={handleClearImage}
                      title="Hapus Bukti"
                    >
                      <X size={14} className="stroke-[2.5]" />
                    </button>
                  </div>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-xl mt-3.5 min-h-[46px] text-[11px] font-extrabold tracking-wide uppercase cursor-pointer w-full flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading
                ? "Menyimpan..."
                : transactionType === "pengeluaran" && isAdmin
                  ? "Simpan Pengeluaran"
                  : "Kirim Bukti Pembayaran"}
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

                <div className="flex flex-col gap-2 mt-3 max-h-[42vh] overflow-y-auto pr-1">
                  {getActiveOptions().map((opt, idx) => (
                    <div
                      key={opt}
                      className={`flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border rounded-xl p-3 cursor-grab transition-all ${
                        kategori === opt ? "border-indigo-300 bg-indigo-50/20" : "border-slate-100"
                      } ${dragIndex === idx ? "opacity-50" : ""}`}
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
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[12px] font-bold text-slate-300 select-none tracking-tighter">::</span>
                        <span className="text-[12px] font-bold text-slate-700 truncate">{opt}</span>
                      </div>
                      <button
                        type="button"
                        className="border-none bg-transparent hover:bg-rose-50 text-rose-500 rounded-lg p-1.5 cursor-pointer flex items-center justify-center transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(opt);
                        }}
                      >
                        <X size={14} className="stroke-[2.5]" />
                      </button>
                    </div>
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

          {/* Zoom Lightbox Preview */}
          {isZoomOpen && previewUrl && (
            <div
              className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-5 cursor-zoom-out"
              onClick={() => setIsZoomOpen(false)}
            >
              {/* Top Bar */}
              <div className="w-full max-w-[440px] flex items-center justify-between text-white mb-4 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="min-w-0 pr-4">
                  <p className="text-[11px] font-extrabold m-0 truncate text-white">{uploadMeta.name || "bukti_pembayaran.jpg"}</p>
                  <p className="text-[9px] font-bold text-gray-400 m-0 mt-0.5">{uploadMeta.size} • {uploadMeta.type} • Preview</p>
                </div>
                <button
                  type="button"
                  className="bg-white/10 hover:bg-white/20 text-white border-none rounded-full p-2 cursor-pointer flex items-center justify-center transition-all active:scale-90 shrink-0"
                  onClick={() => setIsZoomOpen(false)}
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Full Image */}
              <div className="relative max-w-full max-h-[72vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={previewUrl} 
                  alt="Bukti Transfer Zoom" 
                  className="max-w-full max-h-[72vh] object-contain block" 
                />
              </div>

              {/* Guidance Info */}
              <p className="text-[10px] font-bold text-gray-400 mt-4 text-center max-w-[280px] leading-relaxed">
                Pastikan nominal transfer, nama rekening tujuan, tanggal, dan status berhasil terlihat jelas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
