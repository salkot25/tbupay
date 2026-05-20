import { useState, useEffect, useMemo } from "react";
import useStore from "../store/useStore";
import {
  MessageSquareWarning,
  Lightbulb,
  Newspaper,
  ClipboardList,
  ChevronLeft,
  MessageCircle,
  Send,
  Clock3,
  ChevronRight,
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
import "./ServiceHub.css";

export default function ServiceHub() {
  const [activeView, setActiveView] = useState("hub"); // 'hub', 'keluhan', 'saran', 'berita', 'pantauan'
  const user = useStore((state) => state.user);
  const showAlert = useStore((s) => s.showAlert);

  const [tickets, setTickets] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState("network");

  const [keluhanForm, setKeluhanForm] = useState({
    kategori: "Lampu Penerangan",
    deskripsi: "",
  });
  const [saranForm, setSaranForm] = useState({ deskripsi: "" });
  const [newsForm, setNewsForm] = useState({ judul: "", konten: "" });
  const [publishingNews, setPublishingNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [newsReplies, setNewsReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyForm, setReplyForm] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const ticketSummary = useMemo(() => {
    const counts = { open: 0, proses: 0, done: 0 };
    tickets.forEach((ticket) => {
      const key = ticket?.status;
      if (key && counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [tickets]);

  const totalNews = newsList.length;
  const totalTickets = tickets.length;

  const fetchTickets = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getTickets(forceRefresh ? { forceRefresh: true } : {});
      if (res?._meta?.source) {
        setDataSource(res._meta.source);
      }
      if (res.status === "success") setTickets(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getNews(forceRefresh ? { forceRefresh: true } : {});
      if (res?._meta?.source) {
        setDataSource(res._meta.source);
      }
      if (res.status === "success") {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0),
        );
        setNewsList(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeView === "pantauan" || activeView === "hub") {
      fetchTickets();
    }
    if (activeView === "berita" || activeView === "hub") {
      fetchNews();
    }
  }, [activeView]);

  const pull = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([fetchTickets(true), fetchNews(true)]);
    },
    disabled: loading || refreshing,
  });

  const fetchNewsReplies = async (idBerita) => {
    if (!idBerita) return;
    setLoadingReplies(true);
    try {
      const res = await getNewsReplies(idBerita);
      if (res.status === "success") {
        setNewsReplies(res.data || []);
      } else {
        setNewsReplies([]);
      }
    } catch (e) {
      setNewsReplies([]);
      console.error(e);
    } finally {
      setLoadingReplies(false);
    }
  };

  const openNewsDetail = async (news) => {
    setSelectedNews(news);
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
        showAlert(res.message || "Gagal mengirim balasan.", {
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
      setSendingReply(false);
    }
  };

  const handlePublishNews = async (e) => {
    e.preventDefault();
    if (!newsForm.judul.trim() || !newsForm.konten.trim()) {
      showAlert("Judul dan isi berita wajib diisi.", {
        variant: "warning",
        title: "Form Tidak Lengkap",
      });
      return;
    }

    setPublishingNews(true);
    try {
      const res = await createNews({
        judul: newsForm.judul.trim(),
        konten: newsForm.konten.trim(),
        created_by_role: user?.role || "",
      });

      if (res.status === "success") {
        showAlert("Berita berhasil dipublikasikan.", {
          variant: "success",
          title: "Berhasil",
        });
        setNewsForm({ judul: "", konten: "" });
        await fetchNews();
      } else {
        showAlert(res.message || "Gagal mempublikasikan berita.", {
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
      setPublishingNews(false);
    }
  };

  const handleKeluhanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTicket({
        id_user_pelapor: user.id_user,
        kategori: "keluhan",
        deskripsi: `[${keluhanForm.kategori}] ${keluhanForm.deskripsi}`,
        imageBase64: "", // Not implementing image for now to save time
      });
      showAlert("Keluhan terkirim", { variant: "success", title: "Berhasil" });
      setKeluhanForm({ kategori: "Lampu Penerangan", deskripsi: "" });
      setActiveView("hub");
    } catch (err) {
      showAlert("Gagal mengirim keluhan", {
        variant: "danger",
        title: "Gagal",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaranSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTicket({
        id_user_pelapor: user.id_user,
        kategori: "saran",
        deskripsi: saranForm.deskripsi,
        imageBase64: "",
      });
      showAlert("Saran terkirim", { variant: "success", title: "Berhasil" });
      setSaranForm({ deskripsi: "" });
      setActiveView("hub");
    } catch (err) {
      showAlert("Gagal mengirim saran", { variant: "danger", title: "Gagal" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (id_tiket, status) => {
    try {
      await updateTicketStatus({
        id_tiket,
        status,
        id_petugas_pic: user.id_user,
      });
      fetchTickets(); // refresh
    } catch (err) {
      showAlert("Gagal update status", { variant: "danger", title: "Gagal" });
    }
  };

  const renderHub = () => (
    <>
      <div className="page-header">
        <h2>Layanan Warga</h2>
        <p className="text-secondary caption mt-1">
          Pusat informasi dan pengaduan
        </p>
      </div>

      <div
        className="service-quick-actions"
        role="navigation"
        aria-label="Akses cepat layanan"
      >
        <button
          type="button"
          className="quick-action-pill"
          onClick={() => setActiveView("berita")}
        >
          <Newspaper size={14} />
          Berita
          <span className="pill-count">{totalNews}</span>
        </button>
        <button
          type="button"
          className="quick-action-pill"
          onClick={() => setActiveView("pantauan")}
        >
          <ClipboardList size={14} />
          Pantauan
          <span className="pill-count">{totalTickets}</span>
        </button>
      </div>

      <div className="service-summary-row">
        <div className="service-summary-card open">
          <span className="caption">Open</span>
          <strong>{ticketSummary.open}</strong>
        </div>
        <div className="service-summary-card proses">
          <span className="caption">Proses</span>
          <strong>{ticketSummary.proses}</strong>
        </div>
        <div className="service-summary-card done">
          <span className="caption">Done</span>
          <strong>{ticketSummary.done}</strong>
        </div>
      </div>

      <div className="service-grid">
        <button
          className="service-card"
          onClick={() => setActiveView("keluhan")}
        >
          <div className="service-icon keluhan">
            <MessageSquareWarning size={28} />
          </div>
          <span className="body-text" style={{ fontWeight: 600 }}>
            Buat Keluhan
          </span>
          <span className="caption text-secondary">Lapor fasilitas rusak</span>
        </button>

        <button className="service-card" onClick={() => setActiveView("saran")}>
          <div className="service-icon saran">
            <Lightbulb size={28} />
          </div>
          <span className="body-text" style={{ fontWeight: 600 }}>
            Kotak Saran
          </span>
          <span className="caption text-secondary">Aspirasi untuk RT/RW</span>
        </button>
      </div>

      <section className="service-section">
        <div className="service-section-head">
          <h3>Berita & Laporan Terkini</h3>
          <button
            type="button"
            className="service-link-btn"
            onClick={() => setActiveView("berita")}
          >
            Lihat Semua
          </button>
        </div>

        <div className="service-preview-list">
          {loading && newsList.length === 0 && (
            <div className="service-loading-skeleton" aria-hidden="true">
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          )}
          {!loading && newsList.length === 0 && (
            <div className="service-empty-card">
              <p className="body-text">Belum ada berita terbaru</p>
              <span className="caption text-secondary">
                Informasi dari pengurus akan muncul di sini.
              </span>
            </div>
          )}
          {newsList.slice(0, 2).map((news) => (
            <button
              key={news.id_berita}
              type="button"
              className="service-preview-card news stagger-item"
              style={{
                animationDelay: `${Math.min(newsList.indexOf(news), 6) * 35}ms`,
              }}
              onClick={() => openNewsDetail(news)}
            >
              <div className="service-preview-icon berita">
                <Newspaper size={18} />
              </div>
              <div className="service-preview-body">
                <p className="service-preview-title">{news.judul}</p>
                <p className="service-preview-text">
                  {String(news.konten || "").length > 90
                    ? `${String(news.konten).slice(0, 90)}...`
                    : news.konten}
                </p>
                <p className="service-preview-time">
                  <Clock3 size={12} />
                  {news.tanggal
                    ? new Date(news.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </p>
              </div>
              <ChevronRight size={14} className="service-preview-arrow" />
            </button>
          ))}
        </div>
      </section>

      <section className="service-section">
        <div className="service-section-head">
          <h3>Pantau Keluhan Warga</h3>
          <button
            type="button"
            className="service-link-btn"
            onClick={() => setActiveView("pantauan")}
          >
            Lihat Semua
          </button>
        </div>

        <div className="service-preview-list">
          {loading && tickets.length === 0 && (
            <div className="service-loading-skeleton" aria-hidden="true">
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          )}
          {!loading && tickets.length === 0 && (
            <div className="service-empty-card">
              <p className="body-text">Belum ada tiket laporan</p>
              <span className="caption text-secondary">
                Warga dapat membuat laporan baru dari menu keluhan.
              </span>
            </div>
          )}
          {tickets.slice(0, 3).map((ticket) => (
            <button
              key={ticket.id_tiket}
              type="button"
              className={`service-preview-card ticket stagger-item ${ticket.status || "open"}`}
              style={{
                animationDelay: `${Math.min(tickets.indexOf(ticket), 6) * 35}ms`,
              }}
              onClick={() => setActiveView("pantauan")}
            >
              <div className="service-preview-body">
                <div className="service-preview-ticket-head">
                  <span className={`status-badge-small ${ticket.status}`}>
                    {ticket.status}
                  </span>
                  <span className="service-preview-title">
                    {ticket.kategori}
                  </span>
                </div>
                <p className="service-preview-text clamp-2">
                  {ticket.deskripsi}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );

  const renderKeluhan = () => (
    <div className="sub-view sub-view-animated">
      <div className="sub-view-shell">
        <div className="sub-view-handle" />
        <div className="sub-view-topbar">
          <button className="back-btn" onClick={() => setActiveView("hub")}>
            <ChevronLeft size={18} />
          </button>
          <h3 className="sub-view-title">Buat Keluhan Warga</h3>
          <div className="sub-view-spacer" />
        </div>

        <div className="sub-view-content">
          <form className="service-form" onSubmit={handleKeluhanSubmit}>
            <div className="form-group">
              <label className="caption">Kategori Keluhan</label>
              <select
                className="input-field select-field"
                value={keluhanForm.kategori}
                onChange={(e) =>
                  setKeluhanForm({ ...keluhanForm, kategori: e.target.value })
                }
              >
                <option>Lampu Penerangan</option>
                <option>Kebersihan / Sampah</option>
                <option>Keamanan</option>
                <option>Fasilitas Umum</option>
              </select>
            </div>
            <div className="form-group">
              <label className="caption">Deskripsi Detail</label>
              <textarea
                className="input-field"
                rows="4"
                placeholder="Jelaskan masalah secara detail..."
                value={keluhanForm.deskripsi}
                onChange={(e) =>
                  setKeluhanForm({ ...keluhanForm, deskripsi: e.target.value })
                }
                required
              ></textarea>
            </div>
            <button className="btn-danger" type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Keluhan"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderSaran = () => (
    <div className="sub-view sub-view-animated">
      <div className="sub-view-shell">
        <div className="sub-view-handle" />
        <div className="sub-view-topbar">
          <button className="back-btn" onClick={() => setActiveView("hub")}>
            <ChevronLeft size={18} />
          </button>
          <h3 className="sub-view-title">Kotak Saran & Masukan</h3>
          <div className="sub-view-spacer" />
        </div>

        <div className="sub-view-content">
          <form className="service-form" onSubmit={handleSaranSubmit}>
            <div className="form-group">
              <label className="caption">Saran / Aspirasi</label>
              <textarea
                className="input-field"
                rows="5"
                placeholder="Tuliskan saran Anda di sini..."
                value={saranForm.deskripsi}
                onChange={(e) =>
                  setSaranForm({ ...saranForm, deskripsi: e.target.value })
                }
                required
              ></textarea>
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Saran"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderBerita = () => (
    <div className="sub-view sub-view-animated">
      <div className="sub-view-shell">
        <div className="sub-view-handle" />
        <div className="sub-view-topbar">
          <button className="back-btn" onClick={() => setActiveView("hub")}>
            <ChevronLeft size={18} />
          </button>
          <h3 className="sub-view-title">Berita Terkini</h3>
          <div className="sub-view-spacer" />
        </div>

        <div className="sub-view-content">
          {user?.role === "admin" && (
            <form className="news-admin-form" onSubmit={handlePublishNews}>
              <p className="news-admin-title">Publikasi Berita Baru</p>
              <div className="form-group">
                <label className="caption">Judul Berita</label>
                <input
                  type="text"
                  className="input-field"
                  value={newsForm.judul}
                  onChange={(e) =>
                    setNewsForm((prev) => ({ ...prev, judul: e.target.value }))
                  }
                  placeholder="Contoh: Jadwal Kerja Bakti Minggu Ini"
                  required
                />
              </div>

              <div className="form-group">
                <label className="caption">Isi Berita</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={newsForm.konten}
                  onChange={(e) =>
                    setNewsForm((prev) => ({ ...prev, konten: e.target.value }))
                  }
                  placeholder="Tuliskan informasi terbaru untuk warga..."
                  required
                ></textarea>
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={publishingNews}
              >
                {publishingNews ? "Memublikasikan..." : "Publikasikan Berita"}
              </button>
            </form>
          )}

          <div className="news-list">
            {loading && (
              <div className="service-loading-skeleton" aria-hidden="true">
                <span className="skeleton-line" />
                <span className="skeleton-line short" />
              </div>
            )}
            {!loading && newsList.length === 0 && (
              <div className="service-empty-card">
                <p className="body-text">Belum ada pengumuman</p>
                <span className="caption text-secondary">
                  Nanti pengumuman resmi akan muncul pada daftar ini.
                </span>
              </div>
            )}
            {newsList.map((news) => (
              <div
                key={news.id_berita}
                className="news-item stagger-item"
                style={{
                  animationDelay: `${Math.min(newsList.indexOf(news), 8) * 32}ms`,
                }}
              >
                <div className="news-item-head">
                  <p className="caption text-secondary">
                    {news.tanggal
                      ? new Date(news.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                  <button
                    type="button"
                    className="news-detail-btn"
                    onClick={() => openNewsDetail(news)}
                  >
                    <MessageCircle size={14} />
                    Detail & Balas
                  </button>
                </div>
                <h4 className="mt-1">{news.judul}</h4>
                <p className="body-text text-secondary mt-1">
                  {String(news.konten || "").length > 160
                    ? `${String(news.konten).slice(0, 160)}...`
                    : news.konten}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedNews && (
        <div
          className="news-detail-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNews(null);
          }}
        >
          <div className="news-detail-modal">
            <div className="news-detail-handle" />
            <div className="news-detail-header">
              <button
                type="button"
                className="news-detail-close"
                onClick={() => setSelectedNews(null)}
              >
                <ChevronLeft size={16} />
              </button>
              <h4>Detail Informasi</h4>
              <div className="news-detail-spacer" />
            </div>

            <p className="caption text-secondary">
              {selectedNews.tanggal
                ? new Date(selectedNews.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </p>
            <h3 className="news-detail-title">{selectedNews.judul}</h3>
            <p className="news-detail-content">{selectedNews.konten}</p>

            <div className="news-reply-section">
              <p className="news-reply-heading">Balasan Warga</p>

              {loadingReplies && (
                <p className="caption text-secondary">Memuat balasan...</p>
              )}

              {!loadingReplies && newsReplies.length === 0 && (
                <p className="caption text-secondary">
                  Belum ada balasan. Jadilah yang pertama merespons.
                </p>
              )}

              {!loadingReplies && newsReplies.length > 0 && (
                <div className="news-reply-list">
                  {newsReplies.map((reply) => (
                    <div
                      key={reply.id_balasan}
                      className="news-reply-item stagger-item"
                      style={{
                        animationDelay: `${Math.min(newsReplies.indexOf(reply), 10) * 24}ms`,
                      }}
                    >
                      <div className="news-reply-meta">
                        <span>{reply.nama_pengirim || "Pengguna"}</span>
                        <span>
                          {reply.timestamp
                            ? new Date(reply.timestamp).toLocaleString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : ""}
                        </span>
                      </div>
                      <p>{reply.isi_balasan}</p>
                    </div>
                  ))}
                </div>
              )}

              <form className="news-reply-form" onSubmit={handleSendReply}>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Tulis balasan atau pertanyaan Anda..."
                  value={replyForm}
                  onChange={(e) => setReplyForm(e.target.value)}
                ></textarea>
                <button
                  type="submit"
                  className="news-reply-send"
                  disabled={sendingReply || !replyForm.trim()}
                >
                  <Send size={14} />
                  {sendingReply ? "Mengirim..." : "Kirim"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPantauan = () => (
    <div className="sub-view sub-view-animated">
      <div className="sub-view-shell">
        <div className="sub-view-handle" />
        <div className="sub-view-topbar">
          <button className="back-btn" onClick={() => setActiveView("hub")}>
            <ChevronLeft size={18} />
          </button>
          <h3 className="sub-view-title">Pantauan Keluhan Warga</h3>
          <div className="sub-view-spacer" />
        </div>

        <div className="sub-view-content">
          <div className="ticket-list">
            {loading && (
              <div className="service-loading-skeleton" aria-hidden="true">
                <span className="skeleton-line" />
                <span className="skeleton-line short" />
              </div>
            )}
            {!loading && tickets.length === 0 && (
              <div className="service-empty-card">
                <p className="body-text">Tidak ada tiket laporan</p>
                <span className="caption text-secondary">
                  Daftar pantauan akan otomatis terisi ketika ada laporan masuk.
                </span>
              </div>
            )}
            {tickets.map((ticket) => (
              <div
                key={ticket.id_tiket}
                className="ticket-card stagger-item"
                style={{
                  animationDelay: `${Math.min(tickets.indexOf(ticket), 10) * 28}ms`,
                }}
              >
                <div className="ticket-header">
                  <span className="caption font-semibold">
                    [{ticket.kategori}]
                  </span>
                  <span className={`status-badge-small ${ticket.status}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="body-text mt-1">{ticket.deskripsi}</p>
                <p className="caption text-secondary mt-1">
                  Dilaporkan oleh ID: {ticket.id_user_pelapor} •{" "}
                  {new Date(ticket.timestamp).toLocaleDateString("id-ID")}
                </p>

                {ticket.id_petugas_pic && (
                  <p className="caption text-primary mt-1">
                    Petugas PIC: {ticket.id_petugas_pic}
                  </p>
                )}

                {user?.role === "petugas" && ticket.status === "open" && (
                  <button
                    className="btn-primary mt-2"
                    style={{ padding: "8px", fontSize: "12px" }}
                    onClick={() =>
                      handleUpdateTicket(ticket.id_tiket, "proses")
                    }
                  >
                    Tandai Sedang Diproses
                  </button>
                )}
                {user?.role === "petugas" && ticket.status === "proses" && (
                  <button
                    className="btn-success mt-2"
                    style={{ padding: "8px", fontSize: "12px", width: "100%" }}
                    onClick={() => handleUpdateTicket(ticket.id_tiket, "done")}
                  >
                    Tandai Selesai (Done)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="service-container" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`pull-refresh-hint ${pull.isReady ? "ready" : ""}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      {activeView === "hub" && renderHub()}
      {activeView === "keluhan" && renderKeluhan()}
      {activeView === "saran" && renderSaran()}
      {activeView === "berita" && renderBerita()}
      {activeView === "pantauan" && renderPantauan()}
    </div>
  );
}
