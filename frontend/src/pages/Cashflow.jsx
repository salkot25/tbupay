import { useState, useEffect, useMemo } from "react";
import { TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getTransactions } from "../application/use-cases/transactions/transactionUseCases";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import CacheFallbackBadge from "../components/CacheFallbackBadge";
import usePullToRefresh from "../hooks/usePullToRefresh";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const DOUGHNUT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#94a3b8",
  "#ef4444",
  "#14b8a6",
  "#8b5cf6",
  "#f97316",
];

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function Cashflow() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState("network");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState("");

  const fetchTransactions = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getTransactions(
        forceRefresh ? { forceRefresh: true } : {},
      );
      if (res?._meta?.source) {
        setDataSource(res._meta.source);
      }
      if (res.status === "success") {
        // Sort by timestamp descending
        const sortedData = res.data.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
        setTransactions(sortedData);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const pull = usePullToRefresh({
    onRefresh: () => fetchTransactions(true),
    disabled: loading || refreshing,
  });

  const verifiedTransactions = useMemo(
    () =>
      transactions.filter((t) => String(t.status).toLowerCase() === "verified"),
    [transactions],
  );

  const totalSaldo = useMemo(
    () =>
      verifiedTransactions.reduce((acc, trx) => {
        const nominal = Number(trx.nominal) || 0;
        if (trx.jenis === "pemasukan") return acc + nominal;
        if (trx.jenis === "pengeluaran") return acc - nominal;
        return acc;
      }, 0),
    [verifiedTransactions],
  );

  const yearOptions = useMemo(() => {
    const uniqueYears = new Set();
    verifiedTransactions.forEach((trx) => {
      const date = parseDate(trx.timestamp);
      if (date) uniqueYears.add(String(date.getFullYear()));
    });
    const years = Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
    if (years.length === 0) years.push(String(new Date().getFullYear()));
    return years;
  }, [verifiedTransactions]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);

  const monthOptions = useMemo(() => {
    const uniqueMonthKeys = new Set();
    verifiedTransactions.forEach((trx) => {
      if (trx.jenis !== "pengeluaran") return;
      const date = parseDate(trx.timestamp);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      uniqueMonthKeys.add(key);
    });

    const months = Array.from(uniqueMonthKeys)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => {
        const [year, month] = key.split("-");
        const monthIndex = Number(month) - 1;
        return { key, label: `${MONTH_LABELS[monthIndex]} ${year}` };
      });

    if (months.length === 0) {
      const now = new Date();
      const fallbackKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key: fallbackKey,
        label: `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`,
      });
    }

    return months;
  }, [verifiedTransactions]);

  useEffect(() => {
    if (!monthOptions.find((m) => m.key === selectedMonthKey)) {
      setSelectedMonthKey(monthOptions[0]?.key || "");
    }
  }, [monthOptions, selectedMonthKey]);

  const barData = useMemo(() => {
    const pemasukanByMonth = Array(12).fill(0);
    const pengeluaranByMonth = Array(12).fill(0);
    const yearNum = Number(selectedYear);

    verifiedTransactions.forEach((trx) => {
      const date = parseDate(trx.timestamp);
      if (!date || date.getFullYear() !== yearNum) return;
      const month = date.getMonth();
      const nominal = Number(trx.nominal) || 0;
      if (trx.jenis === "pemasukan") pemasukanByMonth[month] += nominal;
      if (trx.jenis === "pengeluaran") pengeluaranByMonth[month] += nominal;
    });

    return {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Pemasukan",
          data: pemasukanByMonth.map((v) => Number((v / 1000000).toFixed(2))),
          backgroundColor: "#22c55e",
          borderRadius: 4,
          barPercentage: 0.6,
        },
        {
          label: "Pengeluaran",
          data: pengeluaranByMonth.map((v) => Number((v / 1000000).toFixed(2))),
          backgroundColor: "#ef4444",
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    };
  }, [verifiedTransactions, selectedYear]);

  const doughnutData = useMemo(() => {
    const perCategory = {};
    verifiedTransactions.forEach((trx) => {
      if (trx.jenis !== "pengeluaran") return;
      const date = parseDate(trx.timestamp);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (key !== selectedMonthKey) return;

      const nominal = Number(trx.nominal) || 0;
      const kategori = String(trx.keterangan || "Lainnya").trim() || "Lainnya";
      perCategory[kategori] = (perCategory[kategori] || 0) + nominal;
    });

    const entries = Object.entries(perCategory).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return {
        labels: ["Belum ada data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e5e7eb"],
            borderWidth: 0,
            hoverOffset: 2,
          },
        ],
      };
    }

    return {
      labels: entries.map(([name]) => name),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map(
            (_, idx) => DOUGHNUT_COLORS[idx % DOUGHNUT_COLORS.length],
          ),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  }, [verifiedTransactions, selectedMonthKey]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Bar chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return context.dataset.label + ": Rp " + context.raw + " Juta";
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + "jt";
          },
          font: { size: 10 },
        },
        grid: { color: "#f3f4f6", drawBorder: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };

  // Doughnut chart options
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const raw = Number(context.raw) || 0;
            return `${context.label}: ${formatRupiah(raw)}`;
          },
        },
      },
      legend: {
        position: "right",
        labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } },
      },
    },
  };

  return (
    <div className="pb-6 animate-[fadeIn_0.3s_ease-in-out]" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`sticky top-2 z-[31] mx-auto mb-2.5 w-fit px-3 py-[7px] rounded-full border text-xs font-semibold ${pull.isReady ? "border-green-300 bg-green-50 text-green-800" : "border-indigo-200 bg-indigo-50 text-indigo-800"}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      <div className="py-4 mb-2">
        <h2 className="text-xl font-bold text-gray-800 m-0">Laporan Keuangan</h2>
      </div>

      <h3 className="font-bold text-gray-700 mb-4 text-[14px]">Ringkasan Kas RT</h3>

      <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-gray-100 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-[12px] m-0">Total Saldo Tersedia</p>
            <p className="text-2xl font-bold text-green-600 mt-1 mb-0">{formatRupiah(totalSaldo)}</p>
          </div>
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex justify-between text-center">
          <div>
            <p className="text-[10px] text-gray-400 uppercase m-0">Status Data</p>
            <p className="text-[14px] font-bold text-gray-700 m-0">Terhubung Server</p>
          </div>
        </div>
      </div>

      {/* Grafik Arus Kas */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700 text-[14px] m-0">Grafik Arus Kas</h3>
          <select
            className="text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-lg p-1.5 outline-none focus:border-blue-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                Tahun {year}
              </option>
            ))}
          </select>
        </div>
        <div className="relative h-48 w-full">
          {barData && <Bar data={barData} options={barOptions} />}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-[10px] font-medium text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>Pemasukan
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>Pengeluaran
          </div>
        </div>
      </div>

      {/* Grafik Kategori Pengeluaran */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700 text-[14px] m-0">Kategori Pengeluaran</h3>
          <select
            className="text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-lg p-1.5 outline-none focus:border-blue-500"
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
          >
            {monthOptions.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative h-40 w-full flex justify-center">
          {doughnutData && (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          )}
        </div>
      </div>

      <h3 className="font-bold text-gray-700 mb-4 text-[14px]">Alokasi Dana Terakhir</h3>
      <div className="flex flex-col gap-3">
        {loading && <div className="p-4 text-center text-[12px] text-gray-400">Memuat mutasi kas...</div>}
        {!loading && transactions.length === 0 && (
          <div className="p-4 text-center text-[12px] text-gray-400">Belum ada transaksi kas.</div>
        )}

        {!loading &&
          transactions.slice(0, 5).map((trx) => {
            const isPemasukan = trx.jenis === "pemasukan";
            return (
              <div
                key={trx.id_transaksi || Math.random()}
                className="bg-white p-4 rounded-xl flex items-center justify-between border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${isPemasukan ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
                  >
                    {isPemasukan ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-gray-800 m-0 truncate">{trx.keterangan}</p>
                    <p className="text-[10px] text-gray-400 m-0 mt-0.5">
                      {new Date(trx.timestamp).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-[14px] font-bold tabular-nums shrink-0 m-0 ${isPemasukan ? "text-green-600" : "text-red-500"}`}
                >
                  {isPemasukan ? "+" : "-"} {formatRupiah(trx.nominal)}
                </p>
              </div>
            );
          })}
      </div>
    </div>
  );
}
