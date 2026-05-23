import { useState } from "react";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { authService } from "../../services/authService";

interface LoginPageProps {
  onLogin: (user: any) => void;
  onNavigate: (page: string) => void;
}

export function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.includes("@") || email.includes(" ")) newErrors.email = "Format email tidak valid";
    if (password.length < 8) newErrors.password = "Password minimal 8 karakter";
    return newErrors;
  };

  const isValid = email.includes("@") && !email.includes(" ") && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await authService.login({ email, password });
      if (res.success && res.user) {
        onLogin(res.user);
      } else {
        setErrors({ general: res.message || "Login gagal" });
      }
    } catch (err: any) {
      setErrors({ general: err.message || "Terjadi kesalahan. Coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2144] to-[#1E3A5F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-[#1E3A5F]" />
            </div>
            <span className="text-3xl text-white" style={{ fontWeight: 700, letterSpacing: "-0.5px" }}>Menara</span>
          </div>
          <p className="text-blue-200 text-sm">Platform Manajemen Ruangan Internal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-[#0F2144] mb-1" style={{ fontWeight: 700 }}>Selamat Datang</h2>
          <p className="text-sm text-gray-500 mb-6">Masuk untuk mengakses sistem</p>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                placeholder="nama@oikn.go.id"
                className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${
                  errors.email
                    ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : email && email.includes("@")
                    ? "border-green-400 bg-green-50 focus:border-green-400 focus:ring-2 focus:ring-green-100"
                    : "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm text-gray-700" style={{ fontWeight: 500 }}>Password</label>
                <button type="button" onClick={() => onNavigate("forgot-password")} className="text-xs text-blue-600 hover:underline">
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm outline-none transition-all ${
                    errors.password
                      ? "border-red-400 bg-red-50 focus:border-red-400"
                      : "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`w-full py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                isValid && !loading
                  ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144] shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : "Masuk"}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">atau masuk dengan</span>
              </div>
            </div>

            {/* Google SSO (demo only) */}
            <button
              type="button"
              onClick={() => {
                setEmail("user@oikn.go.id");
                setPassword("password123!");
              }}
              className="w-full py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Masuk dengan SSO IKN
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{" "}
            <button onClick={() => onNavigate("register")} className="text-blue-600 hover:underline" style={{ fontWeight: 500 }}>
              Daftar
            </button>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 bg-white/10 rounded-xl p-4 text-center">
          <p className="text-blue-200 text-xs mb-2" style={{ fontWeight: 500 }}>Demo: Gunakan email berikut</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {[
              { label: "Ujicoba 1", email: "ujicoba1@mail.com" },
              { label: "Ujicoba 2", email: "ujicoba2@mail.com" },
              { label: "Admin A", email: "admin_a@mail.com" },
              { label: "Pengguna", email: "user@oikn.go.id" },
              { label: "Admin", email: "admin@oikn.go.id" },
              { label: "Super Admin", email: "superadmin@oikn.go.id" },
            ].map((d) => (
              <button
                key={d.email}
                onClick={() => { setEmail(d.email); setPassword("password123!"); }}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
