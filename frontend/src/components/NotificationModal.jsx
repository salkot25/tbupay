import { useEffect, useState } from "react";
import {
  X,
  Bell,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  BellOff,
} from "lucide-react";
import { getTransactions } from "../application/use-cases/transactions/transactionUseCases";
import { getNews } from "../application/use-cases/news/newsUseCases";
import CacheFallbackBadge from "./CacheFallbackBadge";
import useStore from "../store/useStore";
import "./NotificationModal.css";

/**
 * Builds a notification list dynamically from:
 * 1. Unverified transactions (pending bukti bayar) → tipe "warning"
 * 2. Transactions that were recently verified → tipe "success"
 * 3. News/announcements from admin → tipe "info"
 * 4. Static: reminder iuran if no payment this month → tipe "danger"
 */
function buildNotifications(transactions, news, user) {
  const notifs = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // --- 1. Pending / belum terverifikasi dari user ini ---
  const myPendingTrx = transactions.filter(
    (t) => t.id_user === user?.id_user && t.status === "pending",
  );
  myPendingTrx.forEach((t) => {
    notifs.push({
      id: `pending-${t.id_transaksi}`,
      type: "warning",
      title: "Menunggu Verifikasi",
      body: `Bukti bayar untuk "${t.keterangan}" sebesar ${formatRp(t.nominal)} sedang menunggu konfirmasi dari Admin.`,
      time: timeAgo(t.timestamp),
      read: false,
      icon: "clock",
    });
  });

  // --- 2. Transaksi diverifikasi bulan ini (milik user) ---
  const myVerifiedTrx = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return (
      t.id_user === user?.id_user &&
      t.status === "verified" &&
      d.getMonth() === thisMonth &&
      d.getFullYear() === thisYear
    );
  });
  if (myVerifiedTrx.length > 0) {
    const last = myVerifiedTrx[0];
    notifs.push({
      id: `verified-${last.id_transaksi}`,
      type: "success",
      title: "Pembayaran Dikonfirmasi ✓",
      body: `Bukti bayar "${last.keterangan}" sebesar ${formatRp(last.nominal)} telah diverifikasi oleh Admin.`,
      time: timeAgo(last.timestamp),
      read: false,
      icon: "check",
    });
  }

  // --- 3. Cek apakah user belum bayar iuran bulan ini (warga only) ---
  if (user?.role === "warga") {
    const hasPaymentThisMonth = transactions.some((t) => {
      const d = new Date(t.timestamp);
      return (
        t.id_user === user?.id_user &&
        d.getMonth() === thisMonth &&
        d.getFullYear() === thisYear &&
        (t.status === "verified" || t.status === "pending")
      );
    });

    if (!hasPaymentThisMonth) {
      const monthName = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      notifs.push({
        id: "reminder-iuran",
        type: "danger",
        title: "Tagihan Belum Dibayar",
        body: `Iuran bulan ${monthName} belum tercatat. Harap segera kirim bukti pembayaran Anda.`,
        time: "Hari ini",
        read: false,
        icon: "alert",
        action: { label: "Bayar Sekarang", type: "danger", key: "pay" },
      });
    }
  }

  // --- 4. Berita / pengumuman admin (terbaru 3) ---
  const latestNews = [...news]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 3);
  latestNews.forEach((n, idx) => {
    notifs.push({
      id: `news-${n.id_berita || idx}`,
      type: "info",
      title: n.judul || "Pengumuman Admin",
      body:
        n.isi ||
        n.konten ||
        "Silakan cek halaman layanan untuk informasi lengkap.",
      time: n.tanggal ? timeAgo(n.tanggal) : "Baru saja",
      read: idx > 0, // hanya yang pertama dianggap belum dibaca
      icon: "shield",
    });
  });

  return notifs;
}

function formatRp(nominal) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(nominal);
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (isNaN(date.getTime())) return "";
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

const TypeIcon = ({ icon, type }) => {
  const colorMap = {
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-green-500",
    info: "text-blue-500",
  };
  const cls = colorMap[type] || "text-gray-500";

  if (icon === "shield") return <ShieldCheck size={16} className={cls} />;
  if (icon === "check") return <CheckCircle size={16} className={cls} />;
  if (icon === "alert") return <AlertTriangle size={16} className={cls} />;
  if (icon === "clock") return <Clock size={16} className={cls} />;
  return <Bell size={16} className={cls} />;
};

export default function NotificationModal({ isOpen, onClose, onPayNow }) {
  const user = useStore((state) => state.user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(new Set());
  const [dataSource, setDataSource] = useState("network");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([getTransactions(), getNews()])
      .then(([trxRes, newsRes]) => {
        const sourceA = trxRes?._meta?.source;
        const sourceB = newsRes?._meta?.source;
        const hasFallback =
          sourceA === "cache-fallback" || sourceB === "cache-fallback";
        const hasCache = sourceA === "cache" || sourceB === "cache";

        if (hasFallback) setDataSource("cache-fallback");
        else if (hasCache) setDataSource("cache");
        else setDataSource("network");

        const trx = trxRes.status === "success" ? trxRes.data : [];
        const news = newsRes.status === "success" ? newsRes.data : [];
        setNotifications(buildNotifications(trx, news, user));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("notif-overlay")) onClose();
  };

  const markRead = (id) => setReadIds((prev) => new Set([...prev, id]));

  const unreadCount = notifications.filter(
    (n) => !n.read && !readIds.has(n.id),
  ).length;

  const handleAction = (notif) => {
    markRead(notif.id);
    if (notif.action?.key === "pay") {
      onClose();
      if (onPayNow) onPayNow();
    }
  };

  return (
    <div
      className={`notif-overlay ${isOpen ? "open" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className="notif-sheet">
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <h3>Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="notif-count-badge">{unreadCount} Baru</span>
            )}
          </div>
          <button className="notif-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="notif-body">
          <CacheFallbackBadge source={dataSource} />
          {loading && (
            <div className="notif-empty">
              <Bell size={32} />
              <span>Memuat notifikasi...</span>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="notif-empty">
              <BellOff size={40} />
              <p style={{ fontWeight: 600, color: "#374151" }}>
                Tidak ada notifikasi
              </p>
              <p>Semua transaksi dan tagihan Anda dalam kondisi baik.</p>
            </div>
          )}

          {!loading &&
            notifications.map((notif) => {
              const isRead = notif.read || readIds.has(notif.id);
              return (
                <div
                  key={notif.id}
                  className={`notif-item ${isRead ? "read" : `unread-${notif.type}`}`}
                  onClick={() => markRead(notif.id)}
                >
                  <div className="notif-item-header">
                    <div className="notif-item-title-row">
                      <TypeIcon icon={notif.icon} type={notif.type} />
                      <p className="notif-item-title">{notif.title}</p>
                    </div>
                    <span className="notif-item-time">{notif.time}</span>
                  </div>
                  <p className="notif-item-body">{notif.body}</p>
                  {notif.action && (
                    <button
                      className={`notif-action-btn ${notif.action.type}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(notif);
                      }}
                    >
                      {notif.action.label}
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
