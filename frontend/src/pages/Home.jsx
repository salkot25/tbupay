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

  const handlePayNow = () => {
    window.dispatchEvent(new CustomEvent("open-payment-modal"));
  };

  return (
    <div className="flex flex-col gap-6" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`sticky top-2 z-[31] mx-auto mb-2.5 w-fit px-3 py-[7px] rounded-full border text-xs font-semibold ${pull.isReady ? "border-green-300 bg-green-50 text-green-800" : "border-indigo-200 bg-indigo-50 text-indigo-800"}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h2>Halo, {user?.nama || "Warga"}</h2>
          <p className="text-gray-500">
            {user?.blok_rumah || "-"} •{" "}
            <span className="capitalize bg-indigo-100 text-[#0f4c81] px-2 py-0.5 rounded-full text-[11px] font-medium">
              {user?.role}
            </span>
          </p>
        </div>
        <div
          className="bg-gray-100 p-2 rounded-full cursor-pointer relative transition-colors flex items-center justify-center hover:bg-gray-200"
          onClick={() => {
            setIsNotifOpen(true);
            setHasUnread(false);
          }}
        >
          <Bell size={20} />
          {hasUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-gray-100 rounded-full"></span>}
        </div>
      </header>

      {/* Financial Card */}
      <section className="bg-[#0f4c81] text-white p-6 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-200">
          <Wallet size={20} />
          <span className="text-xs font-medium">Total Kas Perumahan</span>
        </div>
        <h1 className="text-white my-2 tabular-nums">{formatRupiah(totalKas)}</h1>
        <p className="text-xs font-medium text-emerald-300">Saldo kas aktif</p>
      </section>

      {/* Status Widget */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
        <div>
          <h3 className="text-[15px] font-bold m-0">Status Iuran Bulan Ini</h3>
          <p className="text-xs font-medium text-gray-500 mt-1">
            {new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full ${
          statusIuran === "lunas" ? "bg-emerald-100 text-emerald-500" :
          statusIuran === "pending" ? "bg-amber-100 text-amber-500" :
          "bg-red-100 text-red-500"
        }`}>
          {statusIuran === "lunas" && <CheckCircle size={18} />}
          {(statusIuran === "pending" || statusIuran === "belum_bayar") && <AlertCircle size={18} />}

          <span className="text-xs font-medium">
            {statusIuran === "lunas"
              ? "Lunas"
              : statusIuran === "pending"
                ? "Menunggu Verifikasi"
                : "Belum Bayar"}
          </span>
        </div>
      </section>

      {/* ===== ADMIN QUICK ACTIONS ===== */}
      {user?.role === "admin" && (
        <section className="flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest m-0">Aksi Cepat Admin</p>
          <div className="flex flex-col gap-2.5">
            {/* Verifikasi Pembayaran */}
            <button
              className="flex items-center gap-3.5 bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer text-left w-full shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-95 active:bg-gray-50"
              onClick={() => navigate("/admin/verifikasi")}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <ClipboardCheck size={22} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-sm font-bold text-gray-800">Verifikasi</span>
                <span className="text-[11px] text-gray-400">Tinjau bukti bayar warga</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[11px] font-extrabold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                  {pendingCount}
                </span>
              )}
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>

            {/* Kelola Pengguna */}
            <button
              className="flex items-center gap-3.5 bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer text-left w-full shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-95 active:bg-gray-50"
              onClick={() => navigate("/admin/users")}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
                <Users size={22} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-sm font-bold text-gray-800">Pengguna</span>
                <span className="text-[11px] text-gray-400">Tambah & kelola akun warga</span>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          </div>
        </section>
      )}

      {/* Quick Info Slider */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[#0f4c81]" />
          <h3 className="text-[15px] font-bold m-0">5 Riwayat Transaksi Terakhir</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {myLatestTransactions.length > 0 ? (
            <div className="flex flex-col">
              {myLatestTransactions.map((trx, index) => {
                const isPemasukan = trx.jenis === "pemasukan";
                const statusLabel =
                  trx.status === "verified"
                    ? "Terverifikasi"
                    : trx.status === "pending"
                      ? "Menunggu Verifikasi"
                      : "Ditolak";
                
                return (
                  <div key={trx.id_transaksi} className={`flex items-center justify-between gap-2.5 p-3.5 ${index !== myLatestTransactions.length - 1 ? 'border-b border-gray-100' : ''} transition-colors hover:bg-slate-50`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7.5 h-7.5 min-w-[30px] rounded-full flex items-center justify-center shrink-0 ${isPemasukan ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                        {isPemasukan ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 leading-snug m-0 truncate">
                          {trx.keterangan || "-"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400 flex items-center gap-1.5 m-0">
                          {new Date(trx.timestamp).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight ${
                            trx.status === "verified" ? "bg-green-100 text-green-800" :
                            trx.status === "pending" ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {statusLabel}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs font-bold shrink-0 tabular-nums m-0 ${isPemasukan ? "text-green-500" : "text-red-500"}`}>
                      {isPemasukan ? "+" : "-"}{" "}
                      {formatRupiah(Number(trx.nominal) || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4.5 px-3.5 text-center">
              <p className="text-sm font-normal text-gray-500 m-0">
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
