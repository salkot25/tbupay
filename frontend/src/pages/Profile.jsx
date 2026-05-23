import useStore from "../store/useStore";
import { Key, Info, LogOut } from "lucide-react";

export default function Profile() {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);

  const handleLogout = () => {
    showConfirm("Apakah Anda yakin ingin keluar?", logout, {
      title: "Keluar",
      variant: "warning",
      confirmLabel: "Keluar",
    });
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold m-0">Profil Pengguna</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center mt-4 shadow-sm">
        <div className="w-20 h-20 bg-[#0f4c81] text-white rounded-full flex items-center justify-center text-[32px] font-semibold shadow-sm">
          {user?.nama?.charAt(0) || "U"}
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-800 m-0">{user?.nama || "Nama Warga"}</h3>
        <p className="text-[12px] font-medium text-gray-500 mt-2 m-0">
          {user?.blok_rumah || "Blok -"} • {user?.no_hp || "-"}
        </p>
        <div className="capitalize bg-indigo-100 text-[#0f4c81] px-3 py-1 rounded-full text-xs font-semibold mt-3">
          {user?.role}
        </div>
      </div>

      <div className="flex flex-col mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <button
          className="flex items-center gap-4 p-5 bg-transparent border-none border-b border-gray-200 cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
          onClick={() =>
            showAlert("Fitur ubah password dalam pengembangan", {
              title: "Segera Hadir",
              variant: "info",
            })
          }
        >
          <div className="w-8 h-8 bg-blue-50/50 rounded-lg flex items-center justify-center shrink-0">
            <Key size={18} className="text-[#0f4c81]" />
          </div>
          <span className="text-[14px] font-medium text-gray-700 flex-1 text-left">Ubah Password Akun</span>
        </button>

        <button
          className="flex items-center gap-4 p-5 bg-transparent border-none cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
          onClick={() =>
            showAlert(
              "TBU Pay v1.2.0\nDikembangkan untuk lingkungan perumahan.",
              { title: "Tentang Aplikasi", variant: "info" },
            )
          }
        >
          <div className="w-8 h-8 bg-blue-50/50 rounded-lg flex items-center justify-center shrink-0">
            <Info size={18} className="text-[#0f4c81]" />
          </div>
          <span className="text-[14px] font-medium text-gray-700 flex-1 text-left">
            Tentang Aplikasi TBU Pay
          </span>
        </button>
      </div>

      <button 
        className="bg-red-500 text-white border-none rounded-lg py-3.5 px-4 text-[14px] font-semibold cursor-pointer w-full flex items-center justify-center gap-2 mt-6 transition-colors hover:bg-red-600 active:bg-red-700 shadow-sm" 
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Keluar
      </button>
    </div>
  );
}
