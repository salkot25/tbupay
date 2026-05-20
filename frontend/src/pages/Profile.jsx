import useStore from "../store/useStore";
import { Key, Info, LogOut } from "lucide-react";
import "./Profile.css";

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
    <div className="profile-container">
      <div className="page-header">
        <h2>Profil Pengguna</h2>
      </div>

      <div className="profile-card">
        <div className="avatar-large">{user?.nama?.charAt(0) || "U"}</div>
        <h3 className="mt-2">{user?.nama || "Nama Warga"}</h3>
        <p className="caption text-secondary mt-1">
          {user?.blok_rumah || "Blok -"} • {user?.no_hp || "-"}
        </p>
        <div className="role-badge-large mt-2">{user?.role}</div>
      </div>

      <div className="menu-list">
        <button
          className="menu-item"
          onClick={() =>
            showAlert("Fitur ubah password dalam pengembangan", {
              title: "Segera Hadir",
              variant: "info",
            })
          }
        >
          <div className="menu-icon-box">
            <Key size={18} className="text-primary" />
          </div>
          <span className="body-text flex-1 text-left">Ubah Password Akun</span>
        </button>

        <button
          className="menu-item"
          onClick={() =>
            showAlert(
              "TBU Pay v1.2.0\nDikembangkan untuk lingkungan perumahan.",
              { title: "Tentang Aplikasi", variant: "info" },
            )
          }
        >
          <div className="menu-icon-box">
            <Info size={18} className="text-primary" />
          </div>
          <span className="body-text flex-1 text-left">
            Tentang Aplikasi TBU Pay
          </span>
        </button>
      </div>

      <button className="btn-danger mt-4" onClick={handleLogout}>
        <LogOut size={18} />
        Keluar
      </button>
    </div>
  );
}
