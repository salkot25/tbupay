import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../application/use-cases/users/userUseCases";
import useStore from "../store/useStore";
import CacheFallbackBadge from "../components/CacheFallbackBadge";
import usePullToRefresh from "../hooks/usePullToRefresh";
import "./AdminUserManagement.css";

const EMPTY_FORM = {
  nama: "",
  blok_rumah: "",
  no_hp: "",
  role: "warga",
  password: "",
};

export default function AdminUserManagement() {
  const currentUser = useStore((s) => s.user);
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState("network");
  const [search, setSearch] = useState("");

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchUsers = useCallback(
    async (showRefresh = false, forceRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getUsers(forceRefresh ? { forceRefresh: true } : {});
        if (res?._meta?.source) {
          setDataSource(res._meta.source);
        }
        if (res.status === "success") {
          setUsers(res.data);
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
    fetchUsers();
  }, [fetchUsers]);

  const pull = usePullToRefresh({
    onRefresh: () => fetchUsers(true, true),
    disabled: loading || refreshing || saving,
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setForm({
      nama: user.nama,
      blok_rumah: user.blok_rumah,
      no_hp: user.no_hp || "",
      role: user.role,
      password: "", // blank means keep existing
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditTarget(null);
  };

  const handleDelete = async (user) => {
    showConfirm(
      `Hapus user "${user.nama}" (${user.blok_rumah})? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          const res = await deleteUser(user.id_user);
          if (res.status === "success") {
            setUsers((prev) => prev.filter((u) => u.id_user !== user.id_user));
          } else {
            showAlert("Gagal: " + res.message, {
              variant: "danger",
              title: "Gagal",
            });
          }
        } catch (e) {
          showAlert("Terjadi kesalahan koneksi.", {
            variant: "danger",
            title: "Kesalahan Koneksi",
          });
        }
      },
      { title: "Hapus User", variant: "danger", confirmLabel: "Hapus" },
    );
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.nama.trim() || !form.blok_rumah.trim()) {
      setFormError("Nama dan Blok/Username wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editTarget) {
        res = await updateUser({ ...form, id_user: editTarget.id_user });
      } else {
        res = await createUser(form);
      }

      if (res.status === "success") {
        closeForm();
        fetchUsers(true, true);
      } else {
        setFormError(res.message || "Terjadi kesalahan.");
      }
    } catch (e) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setSaving(false);
    }
  };

  // Guard
  if (currentUser?.role !== "admin") {
    return (
      <div className="user-mgmt-page">
        <div className="um-empty">
          <ShieldCheck size={48} color="#9ca3af" />
          <p>Akses Terbatas</p>
          <span>Halaman ini hanya untuk Admin.</span>
        </div>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.nama?.toLowerCase().includes(search.toLowerCase()) ||
      u.blok_rumah?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    warga: users.filter((u) => u.role === "warga").length,
    admin: users.filter((u) => u.role === "admin").length,
    petugas: users.filter((u) => u.role === "petugas").length,
  };

  return (
    <div className="user-mgmt-page fade-in" {...pull.bind}>
      {pull.showPullHint && (
        <div className={`pull-refresh-hint ${pull.isReady ? "ready" : ""}`}>
          {pull.isReady ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
        </div>
      )}
      <CacheFallbackBadge source={dataSource} />
      {/* Header */}
      <div className="user-mgmt-header">
        <div>
          <h2>Manajemen Pengguna</h2>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            {users.length} pengguna terdaftar
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`add-user-btn`}
            style={{ background: "#f3f4f6", color: "#6b7280" }}
            onClick={() => fetchUsers(true, true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spinning" : ""} />
          </button>
          <button className="add-user-btn" onClick={openAdd}>
            <Plus size={16} />
            Tambah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="user-stats-row">
        <div className="user-stat-card warga">
          <div className="stat-num">{counts.warga}</div>
          <div className="stat-name">Warga</div>
        </div>
        <div className="user-stat-card admin">
          <div className="stat-num">{counts.admin}</div>
          <div className="stat-name">Admin</div>
        </div>
        <div className="user-stat-card petugas">
          <div className="stat-num">{counts.petugas}</div>
          <div className="stat-name">Petugas</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Cari nama, blok, atau role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User List */}
      {loading ? (
        <div className="um-empty">
          <RefreshCw
            size={28}
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <span>Memuat data pengguna...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="um-empty">
          <Users size={40} color="#d1d5db" />
          <p>Tidak ada pengguna</p>
          <span>
            {search
              ? "Coba kata kunci lain."
              : "Belum ada pengguna yang terdaftar."}
          </span>
        </div>
      ) : (
        <div className="user-list">
          {filtered.map((user) => (
            <div key={user.id_user} className={`user-card role-${user.role}`}>
              <div className="user-avatar">
                {user.nama?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="user-info">
                <div className="user-name">{user.nama}</div>
                <div className="user-meta">
                  <span>{user.blok_rumah}</span>
                  {user.no_hp && <span>· {user.no_hp}</span>}
                </div>
                <span className={`role-badge-pill ${user.role}`}>
                  {user.role}
                </span>
              </div>
              <div className="user-actions">
                <button
                  className="icon-btn edit"
                  onClick={() => openEdit(user)}
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn del"
                  onClick={() => handleDelete(user)}
                  title="Hapus"
                  disabled={user.id_user === currentUser?.id_user}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <div
        className={`user-form-overlay ${isFormOpen ? "open" : ""}`}
        onClick={(e) => {
          if (e.target.classList.contains("user-form-overlay")) closeForm();
        }}
      >
        <div className="user-form-sheet">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 className="user-form-title">
              {editTarget ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </h3>
            <button
              onClick={closeForm}
              style={{
                background: "#f3f4f6",
                border: "none",
                borderRadius: "50%",
                padding: 8,
                cursor: "pointer",
              }}
            >
              <X size={18} color="#6b7280" />
            </button>
          </div>

          <div className="form-field">
            <label>Nama Lengkap</label>
            <input
              className="form-input"
              type="text"
              placeholder="Contoh: Pak Budi Santoso"
              value={form.nama}
              onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Blok / Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="A-12"
                value={form.blok_rumah}
                onChange={(e) =>
                  setForm((p) => ({ ...p, blok_rumah: e.target.value }))
                }
              />
              <span className="form-hint">
                Digunakan sebagai username login
              </span>
            </div>
            <div className="form-field">
              <label>No. HP</label>
              <input
                className="form-input"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={form.no_hp}
                onChange={(e) =>
                  setForm((p) => ({ ...p, no_hp: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Role</label>
              <select
                className="form-input"
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value }))
                }
              >
                <option value="warga">Warga</option>
                <option value="petugas">Petugas</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                className="form-input"
                type="password"
                placeholder={
                  editTarget ? "(biarkan kosong)" : "Default: 123456"
                }
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
              />
              {editTarget && (
                <span className="form-hint">Kosongkan jika tidak diubah</span>
              )}
            </div>
          </div>

          {formError && (
            <div
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-cancel" onClick={closeForm}>
              Batal
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving
                ? "Menyimpan..."
                : editTarget
                  ? "Simpan Perubahan"
                  : "Tambah Pengguna"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
