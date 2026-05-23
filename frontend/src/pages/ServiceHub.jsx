import { useState, useEffect, useMemo } from "react";
import useStore from "../store/useStore";
import {
  MessageSquareWarning,
  Lightbulb,
  Newspaper,
  ClipboardList,
  X,
  MessageCircle,
  Send,
  Clock3,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  getTickets,
  createTicket,
  updateTicketStatus,
} from "../application/use-cases/tickets/ticketUseCases";
import {
  getNews,
  createNews,
  getNewsReplies,
  createNewsReply,
} from "../application/use-cases/news/newsUseCases";
import CacheFallbackBadge from "../components/CacheFallbackBadge";
import usePullToRefresh from "../hooks/usePullToRefresh";

// ---------- Reusable Bottom Sheet Wrapper ----------
function BottomSheet({ isOpen, onClose, title, children, heightClass = "h-[82vh]" }) {
  return (
    <div
      className={`fixed inset-0 z-[70] flex justify-center items-end transition-colors duration-300 ${
        isOpen ? "bg-black/50 pointer-events-auto" : "bg-transparent pointer-events-none"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full max-w-[480px] bg-white rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${heightClass} ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="w-[44px] h-[5px] rounded-full bg-gray-200 mx-auto mt-3 mb-1 shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="m-0 text-[17px] font-bold text-gray-800">{title}</h3>
          <button
            className="p-2 bg-gray-100 rounded-full text-gray-600 border-none cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-200"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function ServiceHub() {
  const user = useStore((state) => state.user);
  const showAlert = useStore((s) => s.showAlert);

  // Which bottom sheet is open
  const [openSheet, setOpenSheet] = useState(null); // null | 'keluhan' | 'saran' | 'berita' | 'pantauan'

  const [tickets, setTickets] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState("network");

  const [keluhanForm, setKeluhanForm] = useState({ kategori: "Lampu Penerangan", deskripsi: "" });
  const [saranForm, setSaranForm] = useState({ deskripsi: "" });
  const [newsForm, setNewsForm] = useState({ judul: "", konten: "" });
  const [publishingNews, setPublishingNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [newsReplies, setNewsReplies] = useState([]);
  const [replyForm, setReplyForm] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const ticketSummary = useMemo(() => {
    const counts = { open: 0, proses: 0, done: 0 };
    tickets.forEach((ticket) => {
      const key = ticket?.status;
      if (key && counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [tickets]);

  const fetchTickets = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getTickets(forceRefresh ? { forceRefresh: true } : {});
      if (res?._meta?.source) setDataSource(res._meta.source);
      if (res.status === "success") {
        setTickets(res.data);
      }
    } catch (e) { 
      console.error(e); 
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getNews(forceRefresh ? { forceRefresh: true } : {});
      if (res?._meta?.source) setDataSource(res._meta.source);
      if (res.status === "success") {
        const sorted = [...res.data].sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
        setNewsList(sorted);
      }
    } catch (e) { 
      console.error(e); 
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchTickets();
    fetchNews();
  }, []);

  const pull = usePullToRefresh({
    onRefresh: async () => { await Promise.all([fetchTickets(true), fetchNews(true)]); },
    disabled: loading || refreshing || openSheet !== null,
  });

  const fetchNewsReplies = async (idBerita) => {
    if (!idBerita) return;
    setLoadingReplies(true);
    try {
      const res = await getNewsReplies(idBerita);
      setNewsReplies(res.status === "success" ? (res.data || []) : []);
    } catch (e) { setNewsReplies([]); }
    finally { setLoadingReplies(false); }
  };

  const closeSheet = () => {
    setOpenSheet(null);
  };

  const openNewsDetail = async (news) => {
    setSelectedNews(news);
    setOpenSheet("newsDetail");
    setReplyForm("");
    await fetchNewsReplies(news.id_berita);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = replyForm.trim();
    if (!selectedNews?.id_berita || !text) return;
    setSendingReply(true);
    try {
      const res = await createNewsReply({
        id_berita: selectedNews.id_berita,
        id_user: user?.id_user || "",
        nama_pengirim: user?.nama || "Pengguna",
        isi_balasan: text,
      });
      if (res.status === "success") {
        setReplyForm("");
        await fetchNewsReplies(selectedNews.id_berita);
      } else {
        showAlert(res.message || "Gagal mengirim balasan.", { variant: "danger", title: "Gagal" });
      }
    } catch { showAlert("Terjadi kesalahan koneksi.", { variant: "danger", title: "Kesalahan Koneksi" }); }
    finally { setSendingReply(false); }
  };

  const handlePublishNews = async (e) => {
    e.preventDefault();
    if (!newsForm.judul.trim() || !newsForm.konten.trim()) {
      showAlert("Judul dan isi berita wajib diisi.", { variant: "warning", title: "Form Tidak Lengkap" });
      return;
    }
    setPublishingNews(true);
    try {
      const res = await createNews({ judul: newsForm.judul.trim(), konten: newsForm.konten.trim(), created_by_role: user?.role || "" });
      if (res.status === "success") {
        showAlert("Berita berhasil dipublikasikan.", { variant: "success", title: "Berhasil" });
        setNewsForm({ judul: "", konten: "" });
        await fetchNews();
      } else {
        showAlert(res.message || "Gagal mempublikasikan berita.", { variant: "danger", title: "Gagal" });
      }
    } catch { showAlert("Terjadi kesalahan koneksi.", { variant: "danger", title: "Kesalahan Koneksi" }); }
    finally { setPublishingNews(false); }
  };

  const handleKeluhanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTicket({ id_user_pelapor: user.id_user, kategori: "keluhan", deskripsi: `[${keluhanForm.kategori}] ${keluhanForm.deskripsi}`, imageBase64: "" });
      showAlert("Keluhan terkirim", { variant: "success", title: "Berhasil" });
      setKeluhanForm({ kategori: "Lampu Penerangan", deskripsi: "" });
      closeSheet();
    } catch { showAlert("Gagal mengirim keluhan", { variant: "danger", title: "Gagal" }); }
    finally { setLoading(false); }
  };

  const handleSaranSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTicket({ id_user_pelapor: user.id_user, kategori: "saran", deskripsi: saranForm.deskripsi, imageBase64: "" });
      showAlert("Saran terkirim", { variant: "success", title: "Berhasil" });
      setSaranForm({ deskripsi: "" });
      closeSheet();
    } catch { showAlert("Gagal mengirim saran", { variant: "danger", title: "Gagal" }); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id_tiket, status) => {
    try {
      await updateTicketStatus({ id_tiket, status, id_petugas_pic: user.id_user });
      fetchTickets();
    } catch { showAlert("Gagal update status", { variant: "danger", title: "Gagal" }); }
  };

  // -------- Skeleton --------
  const Skeleton = () => (
    <div className="border border-gray-200 rounded-[14px] bg-white p-[14px] flex flex-col gap-2">
      <span className="h-2.5 rounded-full bg-[linear-gradient(90deg,#f1f5f9_0%,#e2e8f0_50%,#f1f5f9_100%)] bg-[length:180%_100%] animate-[skeletonShimmer_1.2s_ease-in-out_infinite]" />
      <span className="h-2.5 rounded-full bg-[linear-gradient(90deg,#f1f5f9_0%,#e2e8f0_50%,#f1f5f9_100%)] bg-[length:180%_100%] animate-[skeletonShimmer_1.2s_ease-in-out_infinite] w-[62%]" />
    </div>
  );

  // -------- Form Field Styles --------
  const inputCls = "bg-gray-50 border border-gray-200 rounded-xl p-[12px_14px] text-[14px] font-sans text-gray-900 outline-none w-full focus:bg-white focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/10 transition-colors";
  const labelCls = "text-[11px] text-gray-500 uppercase tracking-[0.5px] font-bold";

  return (
    <div className="flex flex-col" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`sticky top-2 z-[31] mx-auto mb-2.5 w-fit px-3 py-[7px] rounded-full border text-xs font-semibold ${pull.isReady ? "border-green-300 bg-green-50 text-green-800" : "border-indigo-200 bg-indigo-50 text-indigo-800"}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />

      {/* ========== HUB (always rendered) ========== */}
      <div className="py-4">
        <h2 className="text-xl font-bold m-0 text-gray-800">Layanan Warga</h2>
        <p className="text-[12px] text-gray-500 mt-1 m-0">Pusat informasi dan pengaduan</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
          onClick={() => setOpenSheet("keluhan")}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 text-red-500">
            <MessageSquareWarning size={28} />
          </div>
          <span className="text-[14px] font-semibold text-gray-800">Buat Keluhan</span>
          <span className="text-[12px] text-gray-500">Lapor fasilitas rusak</span>
        </button>

        <button
          className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all hover:border-amber-300 hover:bg-amber-50 active:scale-95"
          onClick={() => setOpenSheet("saran")}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-100 text-amber-500">
            <Lightbulb size={28} />
          </div>
          <span className="text-[14px] font-semibold text-gray-800">Kotak Saran</span>
          <span className="text-[12px] text-gray-500">Aspirasi untuk RT/RW</span>
        </button>
      </div>

      {/* Berita section */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="m-0 text-[17px] font-bold text-gray-700 tracking-[-0.01em]">Berita Terkini</h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
            onClick={() => setOpenSheet("berita")}
          >
            <Newspaper size={12} />
            Lihat Semua
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {loading && newsList.length === 0 && <Skeleton />}
          {!loading && newsList.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-[14px] bg-white p-4 text-center">
              <p className="text-[14px] font-bold m-0 mb-1 text-gray-800">Belum ada berita</p>
              <span className="text-[12px] text-gray-500">Informasi dari pengurus akan muncul di sini.</span>
            </div>
          )}
          {newsList.slice(0, 2).map((news) => (
            <button
              key={news.id_berita}
              type="button"
              className="w-full border border-gray-100 rounded-[14px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-[14px] flex gap-3 text-left cursor-pointer transition-all hover:bg-slate-50 hover:shadow-md"
              onClick={() => openNewsDetail(news)}
            >
              <div className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <Newspaper size={18} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="m-0 text-[13px] font-bold text-gray-800">{news.judul}</p>
                <p className="m-0 mt-[3px] text-[12px] text-gray-500 leading-[1.4] line-clamp-2">{news.konten}</p>
              </div>
              <ChevronRight size={14} className="self-center text-gray-400" />
            </button>
          ))}
        </div>
      </section>

      {/* Pantauan section */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="m-0 text-[17px] font-bold text-gray-700 tracking-[-0.01em]">Pantau Keluhan</h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 text-slate-700 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
            onClick={() => setOpenSheet("pantauan")}
          >
            <ClipboardList size={12} />
            Lihat Semua
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {loading && tickets.length === 0 && <Skeleton />}
          {!loading && tickets.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-[14px] bg-white p-4 text-center">
              <p className="text-[14px] font-bold m-0 mb-1 text-gray-800">Belum ada tiket</p>
              <span className="text-[12px] text-gray-500">Warga dapat membuat laporan baru.</span>
            </div>
          )}
          {tickets.slice(0, 3).map((ticket) => (
            <button
              key={ticket.id_tiket}
              type="button"
              className={`w-full text-left cursor-pointer transition-all hover:bg-slate-50 hover:shadow-md border border-gray-100 rounded-[14px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-[14px] ${
                ticket.status === "open" ? "border-l-4 border-l-amber-400" :
                ticket.status === "proses" ? "border-l-4 border-l-blue-400" :
                "border-l-4 border-l-green-400"
              }`}
              onClick={() => { setSelectedTicket(ticket); setOpenSheet("ticketDetail"); }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  ticket.status === "open" ? "bg-amber-100 text-amber-700" :
                  ticket.status === "proses" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>{ticket.status}</span>
                <span className="text-[13px] font-semibold text-gray-700">{ticket.kategori}</span>
              </div>
              <p className="m-0 text-[12px] text-gray-500 line-clamp-2">{ticket.deskripsi}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ========== BOTTOM SHEET: KELUHAN ========== */}
      <BottomSheet isOpen={openSheet === "keluhan"} onClose={closeSheet} title="Buat Keluhan Warga" heightClass="max-h-[88vh]">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Kategori Keluhan</label>
            <select className={inputCls} value={keluhanForm.kategori} onChange={(e) => setKeluhanForm({ ...keluhanForm, kategori: e.target.value })}>
              <option>Lampu Penerangan</option>
              <option>Kebersihan / Sampah</option>
              <option>Keamanan</option>
              <option>Fasilitas Umum</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Deskripsi Detail</label>
            <textarea
              className={`${inputCls} resize-y`}
              rows="4"
              placeholder="Jelaskan masalah secara detail..."
              value={keluhanForm.deskripsi}
              onChange={(e) => setKeluhanForm({ ...keluhanForm, deskripsi: e.target.value })}
            />
          </div>
          <button
            className="bg-red-500 hover:bg-red-600 text-white min-h-[48px] rounded-xl font-bold shadow-[0_8px_16px_rgba(239,68,68,0.25)] border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            onClick={handleKeluhanSubmit}
            disabled={loading || !keluhanForm.deskripsi.trim()}
          >
            {loading ? "Mengirim..." : "Kirim Keluhan"}
          </button>
        </div>
      </BottomSheet>

      {/* ========== BOTTOM SHEET: SARAN ========== */}
      <BottomSheet isOpen={openSheet === "saran"} onClose={closeSheet} title="Kotak Saran & Masukan" heightClass="max-h-[88vh]">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Saran / Aspirasi</label>
            <textarea
              className={`${inputCls} resize-y`}
              rows="5"
              placeholder="Tuliskan saran Anda di sini..."
              value={saranForm.deskripsi}
              onChange={(e) => setSaranForm({ deskripsi: e.target.value })}
            />
          </div>
          <button
            className="bg-[#0f4c81] hover:bg-[#0d3d6b] text-white min-h-[48px] rounded-xl font-bold shadow-[0_8px_16px_rgba(15,76,129,0.25)] border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            onClick={handleSaranSubmit}
            disabled={loading || !saranForm.deskripsi.trim()}
          >
            {loading ? "Mengirim..." : "Kirim Saran"}
          </button>
        </div>
      </BottomSheet>

      {/* ========== BOTTOM SHEET: BERITA ========== */}
      <BottomSheet isOpen={openSheet === "berita"} onClose={closeSheet} title="Berita Terkini" heightClass="h-[88vh]">
        <div className="p-4 flex flex-col gap-3">
          {user?.role === "admin" && (
            <form className="bg-blue-50 border border-blue-200 rounded-[14px] p-4 flex flex-col gap-3 mb-1" onSubmit={handlePublishNews}>
              <h4 className="text-[13px] font-bold text-blue-900 m-0">Publikasi Berita Baru</h4>
              <input type="text" className="w-full border border-blue-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-blue-400" placeholder="Judul Berita" value={newsForm.judul} onChange={(e) => setNewsForm({ ...newsForm, judul: e.target.value })} required />
              <textarea className="w-full border border-blue-200 rounded-xl px-3 py-2 text-[13px] bg-white resize-y focus:outline-none focus:border-blue-400" rows="3" placeholder="Isi Berita" value={newsForm.konten} onChange={(e) => setNewsForm({ ...newsForm, konten: e.target.value })} required />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-[13px] border-none cursor-pointer hover:bg-blue-700 disabled:opacity-50" disabled={publishingNews}>
                {publishingNews ? "Memublikasikan..." : "Publikasi Sekarang"}
              </button>
            </form>
          )}

          {loading && (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-24 bg-gray-100 rounded-[14px]"></div>
              <div className="h-24 bg-gray-100 rounded-[14px]"></div>
            </div>
          )}
          
          {!loading && newsList.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-[14px] border border-dashed border-gray-200">
              <p className="text-[13px] text-gray-500 m-0">Belum ada berita terbaru</p>
            </div>
          ) : (
            newsList.map((news) => (
              <div key={news.id_berita} className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-sm">
                <div className="flex justify-between items-center gap-2 mb-1">
                  <p className="text-[11px] text-gray-400 m-0">{news.tanggal ? new Date(news.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2 py-1 text-[11px] font-semibold cursor-pointer"
                    onClick={() => openNewsDetail(news)}
                  >
                    <MessageCircle size={12} />
                    Detail & Balas
                  </button>
                </div>
                <h4 className="mt-1 m-0 text-[15px] font-bold text-gray-900">{news.judul}</h4>
                <p className="text-[13px] text-gray-500 mt-1 m-0 line-clamp-3">{news.konten}</p>
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* ========== BOTTOM SHEET: NEWS DETAIL ========== */}
      <BottomSheet isOpen={openSheet === "newsDetail" && !!selectedNews} onClose={closeSheet} title="Detail Informasi" heightClass="h-[88vh]">
        {selectedNews && (
          <div className="p-4 flex flex-col gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 bg-gray-100 border-none rounded-full px-3 py-1.5 w-fit cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setOpenSheet("berita")}
            >
              ← Kembali ke Daftar Berita
            </button>
            <p className="text-[11px] text-gray-400 m-0">{selectedNews.tanggal ? new Date(selectedNews.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</p>
            <h3 className="m-0 text-[17px] font-bold text-gray-900 leading-[1.3]">{selectedNews.judul}</h3>
            <p className="text-[14px] text-gray-600 m-0 leading-relaxed whitespace-pre-wrap">{selectedNews.konten}</p>
            
            <div className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-4">
              <p className="text-[14px] font-bold text-gray-800 m-0">Komentar Warga</p>
              {loadingReplies ? (
                <p className="text-[12px] text-gray-400 animate-pulse">Memuat komentar...</p>
              ) : newsReplies.length === 0 ? (
                <p className="text-[12px] text-gray-400">Belum ada komentar. Jadilah yang pertama merespons.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {newsReplies.map((reply) => (
                    <div key={reply.id_balasan} className="border border-slate-200 bg-slate-50 rounded-[14px] p-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>{reply.nama_pengirim || "Pengguna"}</span>
                        <span>{reply.timestamp ? new Date(reply.timestamp).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                      <p className="m-0 text-[13px] text-gray-700 leading-relaxed">{reply.isi_balasan}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <form className="flex flex-col gap-2 mt-2 bg-white sticky bottom-0 pt-2 pb-4" onSubmit={handleSendReply}>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white resize-none focus:outline-none focus:border-blue-400"
                  rows="2"
                  placeholder="Tulis balasan atau pertanyaan Anda..."
                  value={replyForm}
                  onChange={(e) => setReplyForm(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-[13px] border-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-blue-700 disabled:opacity-50"
                  disabled={sendingReply || !replyForm.trim()}
                >
                  <Send size={14} />
                  {sendingReply ? "Mengirim..." : "Kirim"}
                </button>
              </form>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ========== BOTTOM SHEET: PANTAUAN ========== */}
      <BottomSheet isOpen={openSheet === "pantauan"} onClose={closeSheet} title="Pantauan Keluhan Warga" heightClass="h-[88vh]">
        <div className="p-4 flex flex-col gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 text-[12px] font-semibold text-gray-500 bg-gray-100 rounded-xl py-2 border-none cursor-pointer hover:bg-gray-200 transition-colors w-full"
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Memuat..." : "Refresh"}
          </button>

          {loading && <Skeleton />}
          {!loading && tickets.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-[14px] bg-white p-4 text-center">
              <p className="text-[14px] font-bold m-0 mb-1 text-gray-800">Tidak ada tiket</p>
              <span className="text-[12px] text-gray-500">Daftar pantauan akan terisi ketika ada laporan masuk.</span>
            </div>
          )}
          {tickets.map((ticket) => (
            <button
              key={ticket.id_tiket}
              type="button"
              className="w-full text-left cursor-pointer transition-all hover:bg-slate-50 hover:shadow-md bg-white border border-gray-100 rounded-[14px] p-4 shadow-sm"
              onClick={() => { setSelectedTicket(ticket); setOpenSheet("ticketDetail"); }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-semibold text-gray-500">[{ticket.kategori}]</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  ticket.status === "open" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                  ticket.status === "proses" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                  "bg-green-100 text-green-700 border border-green-200"
                }`}>{ticket.status}</span>
              </div>
              <p className="text-[14px] mt-1 m-0 text-gray-800 line-clamp-3">{ticket.deskripsi}</p>
              <p className="text-[11px] text-gray-400 mt-2 m-0">
                Dilaporkan oleh ID: {ticket.id_user_pelapor} • {new Date(ticket.timestamp).toLocaleDateString("id-ID")}
              </p>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ========== BOTTOM SHEET: TICKET DETAIL ========== */}
      <BottomSheet isOpen={openSheet === "ticketDetail" && !!selectedTicket} onClose={closeSheet} title="Detail Keluhan" heightClass="h-[75vh]">
        {selectedTicket && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
                {selectedTicket.kategori}
              </span>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                selectedTicket.status === "open" ? "bg-amber-100 text-amber-700" :
                selectedTicket.status === "proses" ? "bg-blue-100 text-blue-700" :
                "bg-green-100 text-green-700"
              }`}>{selectedTicket.status.toUpperCase()}</span>
            </div>
            
            <div>
              <p className="text-[12px] text-gray-400 m-0 mb-1">Pelapor</p>
              <p className="text-[14px] font-medium text-gray-800 m-0">{selectedTicket.id_user_pelapor}</p>
            </div>
            
            <div>
              <p className="text-[12px] text-gray-400 m-0 mb-1">Tanggal</p>
              <p className="text-[14px] font-medium text-gray-800 m-0">{new Date(selectedTicket.timestamp).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-[14px] p-4">
              <p className="text-[12px] text-gray-400 m-0 mb-2">Isi Laporan</p>
              <p className="text-[15px] text-gray-800 m-0 leading-relaxed whitespace-pre-wrap">{selectedTicket.deskripsi}</p>
            </div>

            {selectedTicket.url_foto_kondisi && (
              <div className="mt-2 flex justify-center">
                <img src={selectedTicket.url_foto_kondisi} alt="Foto Kondisi" className="w-full max-h-[240px] object-cover rounded-[14px] border border-gray-200" />
              </div>
            )}

            {selectedTicket.id_petugas_pic && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-[14px] p-4">
                <p className="text-[12px] text-blue-500 font-semibold m-0 mb-1">PIC Petugas</p>
                <p className="text-[14px] text-blue-800 font-bold m-0">{selectedTicket.id_petugas_pic}</p>
              </div>
            )}

            {user?.role === "petugas" && selectedTicket.status === "open" && (
              <button
                className="mt-4 flex w-full items-center justify-center gap-1.5 bg-blue-100 text-blue-700 font-bold py-3.5 px-4 rounded-xl text-[14px] cursor-pointer border-none transition-colors hover:bg-blue-200 active:scale-95"
                onClick={() =>
                  showConfirm(
                    "Konfirmasi",
                    `Tandai keluhan ini sedang diproses?\n\n"${selectedTicket.deskripsi}"`,
                    () => { updateStatus(selectedTicket.id_tiket, "proses"); closeSheet(); },
                    "warning"
                  )
                }
              >
                <MessageSquareWarning size={18} /> Tandai Sedang Diproses
              </button>
            )}
            
            {user?.role === "petugas" && selectedTicket.status === "proses" && (
              <button
                className="mt-4 flex w-full items-center justify-center gap-1.5 bg-green-100 text-green-700 font-bold py-3.5 px-4 rounded-xl text-[14px] cursor-pointer border-none transition-colors hover:bg-green-200 active:scale-95"
                onClick={() => { showConfirm("Konfirmasi", "Tandai keluhan ini selesai?", () => { updateStatus(selectedTicket.id_tiket, "done"); closeSheet(); }, "success"); }}
              >
                <CheckCircle size={18} /> Tandai Selesai (Done)
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
