import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, PieChart, LayoutGrid, User, Plus } from "lucide-react";
import useStore from "../store/useStore";
import PaymentModal from "../components/PaymentModal";
import {
  prefetchAdminLikelyRoutes,
  prefetchHomeLikelyRoutes,
  prefetchRoute,
} from "../routes/routePrefetch";
import "./MainLayout.css";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore((state) => state.user);

  const navItems = [
    {
      id: "home",
      path: "/",
      icon: Home,
      label: "Beranda",
      roles: ["warga", "petugas", "admin"],
    },
    {
      id: "cashflow",
      path: "/cashflow",
      icon: PieChart,
      label: "Keuangan",
      roles: ["warga", "petugas", "admin"],
    },
    {
      id: "service",
      path: "/service",
      icon: LayoutGrid,
      label: "Layanan",
      roles: ["warga", "petugas", "admin"],
    },
    {
      id: "profile",
      path: "/profile",
      icon: User,
      label: "Profil",
      roles: ["warga", "petugas", "admin"],
    },
  ];

  // Filter nav items based on role
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || "warga"),
  );

  // Insert the FAB in the middle (index 2)
  const leftNavItems = visibleNavItems.slice(0, 2);
  const rightNavItems = visibleNavItems.slice(2);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Listen for custom event dispatched from NotificationModal's "Bayar Sekarang"
  useEffect(() => {
    const handler = () => setIsPaymentModalOpen(true);
    window.addEventListener("open-payment-modal", handler);
    return () => window.removeEventListener("open-payment-modal", handler);
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      if (user?.role === "admin") {
        prefetchAdminLikelyRoutes();
      } else {
        prefetchHomeLikelyRoutes();
      }
    }
  }, [location.pathname, user?.role]);

  const handleNavIntent = (itemId) => {
    if (
      itemId === "cashflow" ||
      itemId === "service" ||
      itemId === "profile" ||
      itemId === "adminVerifikasi" ||
      itemId === "adminUsers"
    ) {
      prefetchRoute(itemId);
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {leftNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onMouseEnter={() => handleNavIntent(item.id)}
              onTouchStart={() => handleNavIntent(item.id)}
              onClick={() => navigate(item.path)}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="caption">{item.label}</span>
            </button>
          );
        })}

        {/* FAB in Center */}
        {user?.role !== "petugas" && (
          <div className="flex justify-center w-full">
            <button
              className="nav-center-btn"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <Plus size={32} />
            </button>
          </div>
        )}

        {rightNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onMouseEnter={() => handleNavIntent(item.id)}
              onTouchStart={() => handleNavIntent(item.id)}
              onClick={() => navigate(item.path)}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="caption">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
}
