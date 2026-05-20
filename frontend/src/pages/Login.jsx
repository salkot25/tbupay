import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/useStore";
import { ShieldCheck, HelpCircle } from "lucide-react";
import { loginUser } from "../application/use-cases/auth/authUseCases";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useStore((state) => state.login);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Harap isi Nomor Blok/Username dan Password");
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser({ username, password });
      if (result.status === "success") {
        login(result.user);
        navigate("/");
      } else {
        setError(
          result.message || "Kredensial tidak valid. Silakan coba lagi.",
        );
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleHelp = () => {
    window.open(
      "https://wa.me/6281234567890?text=Halo%20Pengurus,%20saya%20lupa%20password%20TBU%20Pay",
      "_blank",
    );
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-circle">
            <ShieldCheck size={36} color="white" />
          </div>
          <h1>TBU Pay</h1>
          <p className="text-secondary">Tata Kelola Lingkungan Terpadu</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="caption">Nomor Blok / Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Contoh: A-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="caption">Kata Sandi</label>
            <input
              type="password"
              className="input-field"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <button className="help-btn" onClick={handleHelp}>
          <HelpCircle size={16} />
          Bantuan Lupa Kata Sandi
        </button>
      </div>
    </div>
  );
}
