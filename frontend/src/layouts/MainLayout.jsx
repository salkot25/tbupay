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

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface border-t border-border flex justify-around pt-2 pb-4 z-50">
        {leftNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer py-2 px-3 transition-colors flex-1 ${isActive ? "text-primary" : "text-text-secondary hover:text-primary"}`}
              onMouseEnter={() => handleNavIntent(item.id)}
              onTouchStart={() => handleNavIntent(item.id)}
              onClick={() => navigate(item.path)}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-medium leading-[1.4]">{item.label}</span>
            </button>
          );
        })}

        {/* FAB in Center */}
        {user?.role !== "petugas" && (
          <div className="flex justify-center items-start flex-1 pt-0">
            <button
              className="relative -top-5 bg-primary border-4 border-surface shadow-[0_4px_10px_rgba(0,0,0,0.1)] w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer transition-colors shrink-0 active:bg-[#1e40af]"
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
              className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer py-2 px-3 transition-colors flex-1 ${isActive ? "text-primary" : "text-text-secondary hover:text-primary"}`}
              onMouseEnter={() => handleNavIntent(item.id)}
              onTouchStart={() => handleNavIntent(item.id)}
              onClick={() => navigate(item.path)}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-medium leading-[1.4]">{item.label}</span>
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
