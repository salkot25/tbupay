import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/useStore";
import {
  Wallet,
  Bell,
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  ChevronRight,
  Users,
} from "lucide-react";
import { getTransactions } from "../application/use-cases/transactions/transactionUseCases";
import NotificationModal from "../components/NotificationModal";
import CacheFallbackBadge from "../components/CacheFallbackBadge";
import usePullToRefresh from "../hooks/usePullToRefresh";
import "./Home.css";

export default function Home() {
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  const [totalKas, setTotalKas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [dataSource, setDataSource] = useState("network");

  const myLatestTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => t.id_user === user?.id_user)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [transactions, user?.id_user]);

  // Computed payment status for this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const myTrxThisMonth = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return (
      t.id_user === user?.id_user &&
      d.getMonth() === thisMonth &&
      d.getFullYear() === thisYear
    );
  });
  const statusIuran = myTrxThisMonth.some((t) => t.status === "verified")
    ? "lunas"
    : myTrxThisMonth.some((t) => t.status === "pending")
      ? "pending"
      : "belum_bayar";

  // Count all pending transactions (for admin quick action badge)
  const pendingCount = transactions.filter(
    (t) => t.status === "pending",
  ).length;

  const fetchData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const transRes = await getTransactions(
        forceRefresh ? { forceRefresh: true } : {},
      );
      if (transRes?._meta?.source) {
        setDataSource(transRes._meta.source);
      }

      if (transRes.status === "success") {
        setTransactions(transRes.data);

        let total = 0;
        transRes.data.forEach((t) => {
          if (t.status === "verified") {
            if (t.jenis === "pemasukan") total += parseFloat(t.nominal);
            if (t.jenis === "pengeluaran") total -= parseFloat(t.nominal);
          }
        });
        setTotalKas(total);

        // Determine if there are unread notifications
        // Unread = pending trx milik user, atau belum bayar bulan ini
        const myPending = transRes.data.filter(
          (t) => t.id_user === user?.id_user && t.status === "pending",
        );
        const hasPayment = transRes.data.some((t) => {
          const d = new Date(t.timestamp);
          return (
            t.id_user === user?.id_user &&
            d.getMonth() === thisMonth &&
            d.getFullYear() === thisYear
          );
        });
        // Show badge if pending trx exists OR no payment this month (warga only)
        const showBadge =
          myPending.length > 0 || (user?.role === "warga" && !hasPayment);
        setHasUnread(showBadge);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const pull = usePullToRefresh({
    onRefresh: () => fetchData(true),
    disabled: loading || refreshing,
  });

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Trigger FAB: called from notification "Bayar Sekarang" action
  // We need to reach MainLayout's FAB — use a custom event
  const handlePayNow = () => {
    window.dispatchEvent(new CustomEvent("open-payment-modal"));
  };

  return (
    <div className="home-container" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`pull-refresh-hint ${pull.isReady ? "ready" : ""}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      {/* Header */}
      <header className="home-header">
        <div>
          <h2>Halo, {user?.nama || "Warga"}</h2>
          <p className="text-secondary">
            {user?.blok_rumah || "-"} •{" "}
            <span className="role-badge">{user?.role}</span>
          </p>
        </div>
        <div
          className="notification-bell"
          onClick={() => {
            setIsNotifOpen(true);
            setHasUnread(false);
          }}
        >
          <Bell size={20} />
          {hasUnread && <span className="notification-badge"></span>}
        </div>
      </header>

      {/* Financial Card */}
      <section className="kas-card">
        <div className="kas-header">
          <Wallet size={20} className="text-secondary" />
          <span className="caption text-secondary">Total Kas Perumahan</span>
        </div>
        <h1 className="kas-amount tabular-nums">{formatRupiah(totalKas)}</h1>
        <p className="caption text-success">Saldo kas aktif</p>
      </section>

      {/* Status Widget */}
      <section className="status-widget">
        <div className="status-content">
          <h3>Status Iuran Bulan Ini</h3>
          <p className="caption text-secondary">
            {new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className={`status-badge ${statusIuran}`}>
          {statusIuran === "lunas" && <CheckCircle size={18} />}
          {statusIuran === "pending" && <AlertCircle size={18} />}
          {statusIuran === "belum_bayar" && <AlertCircle size={18} />}

          <span className="caption">
            {statusIuran === "lunas"
              ? "Lunas"
              : statusIuran === "pending"
                ? "Menunggu Verifikasi"
                : "Belum Bayar"}
          </span>
        </div>
      </section>

      {/* ===== ADMIN QUICK ACTIONS (only for admin role) ===== */}
      {user?.role === "admin" && (
        <section className="admin-quickactions">
          <p className="admin-qa-title">Aksi Cepat Admin</p>
          <div className="admin-qa-grid">
            {/* Verifikasi Pembayaran */}
            <button
              className="admin-qa-card verif"
              onClick={() => navigate("/admin/verifikasi")}
            >
              <div className="admin-qa-icon">
                <ClipboardCheck size={22} />
              </div>
              <div className="admin-qa-info">
                <span className="admin-qa-label">Verifikasi</span>
                <span className="admin-qa-sub">Tinjau bukti bayar warga</span>
              </div>
              {pendingCount > 0 && (
                <span className="admin-qa-badge">{pendingCount}</span>
              )}
              <ChevronRight size={16} className="admin-qa-arrow" />
            </button>

            {/* Kelola Pengguna */}
            <button
              className="admin-qa-card users"
              onClick={() => navigate("/admin/users")}
            >
              <div className="admin-qa-icon">
                <Users size={22} />
              </div>
              <div className="admin-qa-info">
                <span className="admin-qa-label">Pengguna</span>
                <span className="admin-qa-sub">Tambah & kelola akun warga</span>
              </div>
              <ChevronRight size={16} className="admin-qa-arrow" />
            </button>
          </div>
        </section>
      )}

      {/* Quick Info Slider */}
      <section className="news-section">
        <div className="news-header-title">
          <Bell size={18} className="text-primary" />
          <h3>5 Riwayat Transaksi Terakhir</h3>
        </div>
        <div className="history-list-panel">
          {myLatestTransactions.length > 0 ? (
            myLatestTransactions.map((trx) => {
              const isPemasukan = trx.jenis === "pemasukan";
              const statusLabel =
                trx.status === "verified"
                  ? "Terverifikasi"
                  : trx.status === "pending"
                    ? "Menunggu Verifikasi"
                    : "Ditolak";
              const statusClass =
                trx.status === "verified"
                  ? "verified"
                  : trx.status === "pending"
                    ? "pending"
                    : "rejected";

              return (
                <div key={trx.id_transaksi} className="history-item">
                  <div className="history-item-left">
                    <div
                      className={`history-item-icon ${isPemasukan ? "income" : "expense"}`}
                    >
                      {isPemasukan ? (
                        <CheckCircle size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                    </div>
                    <div>
                      <p className="history-item-title">
                        {trx.keterangan || "-"}
                      </p>
                      <p className="history-item-meta">
                        {new Date(trx.timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <span className={`history-status-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p
                    className={`history-item-amount tabular-nums ${isPemasukan ? "text-success" : "text-danger"}`}
                  >
                    {isPemasukan ? "+" : "-"}{" "}
                    {formatRupiah(Number(trx.nominal) || 0)}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="history-empty-state">
              <p className="body-text text-secondary">
                {loading
                  ? "Memuat riwayat transaksi..."
                  : "Belum ada riwayat transaksi."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onPayNow={handlePayNow}
      />
    </div>
  );
}
