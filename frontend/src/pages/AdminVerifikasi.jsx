import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ImageOff,
  ShieldCheck,
  InboxIcon,
} from "lucide-react";
import {
  getTransactions,
  verifyTransaction,
} from "../application/use-cases/transactions/transactionUseCases";
import useStore from "../store/useStore";
import CacheFallbackBadge from "../components/CacheFallbackBadge";
import usePullToRefresh from "../hooks/usePullToRefresh";
import "./AdminVerifikasi.css";

const FILTERS = [
  { key: "pending", label: "Menunggu" },
  { key: "all", label: "Semua" },
  { key: "verified", label: "Terverifikasi" },
  { key: "rejected", label: "Ditolak" },
];

/** Konversi berbagai format URL Google Drive ke URL thumbnail yang bisa diembed di <img> */
function getDriveImgUrl(url) {
  if (!url) return null;
  // Sudah format thumbnail
  if (url.includes("/thumbnail") || url.includes("lh3.googleusercontent"))
    return url;
  // Format /file/d/FILE_ID/view
  const m =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  return url;
}

function formatRp(val) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(val) || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diffMs = Date.now() - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 2) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminVerifikasi() {
  const user = useStore((s) => s.user);
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [transactions, setTransactions] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [processingId, setProcessingId] = useState(null);
  const [dataSource, setDataSource] = useState("network");

  const fetchData = useCallback(
    async (showRefresh = false, forceRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await getTransactions(
          forceRefresh ? { forceRefresh: true } : {},
        );
        if (res?._meta?.source) {
          setDataSource(res._meta.source);
        }
        if (res.status === "success") {
          // Sort newest first
          const sorted = [...res.data].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
          );
          setTransactions(sorted);

          // Build a map id_user -> {nama, blok_rumah} from the transactions themselves
          // (We embed nama/blok in keterangan is not guaranteed; we rely on id_user label)
          // For now, we'll use id_user as label. If a getUsers endpoint is added later, swap here.
          const map = {};
          sorted.forEach((t) => {
            if (!map[t.id_user]) map[t.id_user] = t.id_user;
          });
          setUserMap(map);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pull = usePullToRefresh({
    onRefresh: () => fetchData(true, true),
    disabled: loading || refreshing || Boolean(processingId),
  });

  const handleAction = async (trx, actionType) => {
    const label = actionType === "verify" ? "verifikasi" : "tolak";
    const isVerify = actionType === "verify";
    showConfirm(
      `${trx.keterangan}\n${formatRp(trx.nominal)}`,
      async () => {
        setProcessingId(trx.id_transaksi);
        try {
          const res = await verifyTransaction({
            id_transaksi: trx.id_transaksi,
            action_type: isVerify ? "verify" : "reject",
          });
          if (res.status === "success") {
            setTransactions((prev) =>
              prev.map((t) =>
                t.id_transaksi === trx.id_transaksi
                  ? { ...t, status: isVerify ? "verified" : "rejected" }
                  : t,
              ),
            );
          } else {
            showAlert("Gagal: " + res.message, {
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
          setProcessingId(null);
        }
      },
      {
        title: isVerify ? "Setujui Pembayaran" : "Tolak Pembayaran",
        variant: isVerify ? "success" : "danger",
        confirmLabel: isVerify ? "Setujui" : "Tolak",
        cancelLabel: "Batal",
      },
    );
  };

  // Stats
  const pendingCount = transactions.filter(
    (t) => t.status === "pending",
  ).length;
  const verifiedCount = transactions.filter(
    (t) => t.status === "verified",
  ).length;
  const rejectedCount = transactions.filter(
    (t) => t.status === "rejected",
  ).length;

  // Filtered list
  const filtered =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.status === filter);

  // Guard: only admin can see this page
  if (user?.role !== "admin") {
    return (
      <div className="admin-page">
        <div className="empty-state">
          <ShieldCheck size={48} color="#9ca3af" />
          <p>Akses Terbatas</p>
          <span>Halaman ini hanya untuk Admin.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page fade-in" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`pull-refresh-hint ${pull.isReady ? "ready" : ""}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Verifikasi Pembayaran</h2>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            Tinjau bukti bayar warga
          </p>
        </div>
        <button
          className={`refresh-btn ${refreshing ? "spinning" : ""}`}
          onClick={() => fetchData(true, true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
          {refreshing ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats-row">
        <div className="stat-card pending" onClick={() => setFilter("pending")}>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Menunggu</div>
        </div>
        <div
          className="stat-card verified"
          onClick={() => setFilter("verified")}
        >
          <div className="stat-value">{verifiedCount}</div>
          <div className="stat-label">Terverifikasi</div>
        </div>
        <div
          className="stat-card rejected"
          onClick={() => setFilter("rejected")}
        >
          <div className="stat-value">{rejectedCount}</div>
          <div className="stat-label">Ditolak</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background:
                    filter === "pending" ? "rgba(255,255,255,0.3)" : "#fef3c7",
                  color: filter === "pending" ? "white" : "#d97706",
                  borderRadius: 9999,
                  padding: "1px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="loading-overlay">
          <RefreshCw
            size={28}
            style={{
              margin: "0 auto 8px",
              display: "block",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Memuat data transaksi...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <InboxIcon size={48} color="#9ca3af" />
          <p>Tidak ada transaksi</p>
          <span>
            {filter === "pending"
              ? "Semua bukti bayar sudah ditangani."
              : `Tidak ada data dengan status "${filter}".`}
          </span>
        </div>
      ) : (
        <div className="verif-list">
          {filtered.map((trx) => (
            <div key={trx.id_transaksi} className="verif-card">
              {/* Card Header */}
              <div className="verif-card-header">
                <div className="verif-user-info">
                  <span className="verif-user-name">{trx.id_user}</span>
                  <span className="verif-user-blok">
                    {timeAgo(trx.timestamp)}
                  </span>
                </div>
                <span className={`status-pill ${trx.status}`}>
                  {trx.status === "pending"
                    ? "⏳ Menunggu"
                    : trx.status === "verified"
                      ? "✅ Terverifikasi"
                      : "❌ Ditolak"}
                </span>
              </div>

              {/* Card Body */}
              <div className="verif-card-body">
                <div className="verif-detail-row">
                  <span className="verif-label">Keterangan</span>
                  <span className="verif-value">{trx.keterangan || "-"}</span>
                </div>
                <div className="verif-detail-row">
                  <span className="verif-label">Nominal</span>
                  <span className="verif-value amount">
                    {formatRp(trx.nominal)}
                  </span>
                </div>
                <div className="verif-detail-row">
                  <span className="verif-label">Jenis</span>
                  <span
                    className="verif-value"
                    style={{ textTransform: "capitalize" }}
                  >
                    {trx.jenis}
                  </span>
                </div>

                {/* Bukti foto */}
                <div className="bukti-img-wrap">
                  {trx.url_bukti ? (
                    <img
                      src={getDriveImgUrl(trx.url_bukti)}
                      alt="Bukti Pembayaran"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="no-bukti"
                    style={{ display: trx.url_bukti ? "none" : "flex" }}
                  >
                    <ImageOff
                      size={24}
                      style={{
                        margin: "0 auto 6px",
                        display: "block",
                        color: "#d1d5db",
                      }}
                    />
                    Tidak ada bukti foto
                  </div>
                </div>
              </div>

              {/* Action Buttons — only show for pending */}
              {trx.status === "pending" && (
                <div className="verif-actions">
                  <button
                    className="btn-verify approve"
                    disabled={processingId === trx.id_transaksi}
                    onClick={() => handleAction(trx, "verify")}
                  >
                    <CheckCircle2 size={16} />
                    {processingId === trx.id_transaksi
                      ? "Memproses..."
                      : "Setujui"}
                  </button>
                  <button
                    className="btn-verify reject"
                    disabled={processingId === trx.id_transaksi}
                    onClick={() => handleAction(trx, "reject")}
                  >
                    <XCircle size={16} />
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
