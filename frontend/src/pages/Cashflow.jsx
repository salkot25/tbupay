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
import "./Cashflow.css";

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
    <div className="keuangan-container fade-in" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`pull-refresh-hint ${pull.isReady ? "ready" : ""}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      <div className="page-header">
        <h2>Laporan Keuangan</h2>
      </div>

      <h3 className="section-title">Ringkasan Kas RT</h3>

      <div className="summary-card">
        <div className="summary-header">
          <div>
            <p className="caption text-secondary">Total Saldo Tersedia</p>
            <p className="total-amount">{formatRupiah(totalSaldo)}</p>
          </div>
          <div className="icon-box-green">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="summary-footer">
          <div>
            <p className="footer-label">Status Data</p>
            <p className="footer-value">Terhubung Server</p>
          </div>
        </div>
      </div>

      {/* Grafik Arus Kas */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Grafik Arus Kas</h3>
          <select
            className="chart-select"
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
        <div className="chart-wrapper">
          {barData && <Bar data={barData} options={barOptions} />}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-dot bg-green"></div>Pemasukan
          </div>
          <div className="legend-item">
            <div className="legend-dot bg-red"></div>Pengeluaran
          </div>
        </div>
      </div>

      {/* Grafik Kategori Pengeluaran */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Kategori Pengeluaran</h3>
          <select
            className="chart-select"
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
        <div className="doughnut-wrapper">
          {doughnutData && (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          )}
        </div>
      </div>

      <h3 className="section-title">Alokasi Dana Terakhir</h3>
      <div className="mutasi-list">
        {loading && <div className="loading-state">Memuat mutasi kas...</div>}
        {!loading && transactions.length === 0 && (
          <div className="empty-state">Belum ada transaksi kas.</div>
        )}

        {!loading &&
          transactions.slice(0, 5).map((trx) => {
            const isPemasukan = trx.jenis === "pemasukan";
            return (
              <div
                key={trx.id_transaksi || Math.random()}
                className="mutasi-item"
              >
                <div className="mutasi-left">
                  <div
                    className={`mutasi-icon ${isPemasukan ? "bg-green-light text-green" : "bg-red-light text-red"}`}
                  >
                    {isPemasukan ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>
                  <div>
                    <p className="mutasi-title">{trx.keterangan}</p>
                    <p className="mutasi-date">
                      {new Date(trx.timestamp).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <p
                  className={`mutasi-amount tabular-nums ${isPemasukan ? "text-green" : "text-red"}`}
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
