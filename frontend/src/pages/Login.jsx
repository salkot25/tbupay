import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/useStore";
import { ShieldCheck, HelpCircle } from "lucide-react";
import { loginUser } from "../application/use-cases/auth/authUseCases";

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
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gray-50">
      <div className="w-full max-w-[400px] bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] bg-[#0f4c81] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={36} color="white" />
          </div>
          <h1 className="text-3xl font-bold mb-1">TBU Pay</h1>
          <p className="text-gray-500">Tata Kelola Lingkungan Terpadu</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nomor Blok / Username</label>
            <input
              type="text"
              className="w-full py-3 px-4 border border-gray-200 rounded-lg font-sans text-sm text-gray-900 bg-gray-50 outline-none transition-colors focus:border-[#0f4c81]"
              placeholder="Contoh: A-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kata Sandi</label>
            <input
              type="password"
              className="w-full py-3 px-4 border border-gray-200 rounded-lg font-sans text-sm text-gray-900 bg-gray-50 outline-none transition-colors focus:border-[#0f4c81]"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="bg-[#0f4c81] text-white border-none rounded-lg py-3 px-4 text-sm font-semibold cursor-pointer w-full flex items-center justify-center gap-2 mt-4 transition-opacity active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading}
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <button 
          className="bg-transparent border-none text-gray-500 text-sm flex items-center justify-center gap-2 w-full mt-8 cursor-pointer transition-colors hover:text-[#0f4c81]" 
          onClick={handleHelp}
        >
          <HelpCircle size={16} />
          Bantuan Lupa Kata Sandi
        </button>
      </div>
    </div>
  );
}
