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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300 dark:bg-slate-950">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] transition-colors duration-300 dark:bg-emerald-600/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] transition-colors duration-300 dark:bg-indigo-600/10" />
      
      {/* IKN Ornaments Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.03] dark:opacity-[0.05] transition-colors duration-300">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/200/svg">
          <defs>
            <pattern id="login-ikn-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-slate-300 transition-colors duration-300 dark:text-slate-200" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#login-ikn-pattern)" />
        </svg>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-indigo-600 dark:from-emerald-500 dark:to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 dark:shadow-emerald-500/20 ring-4 ring-white dark:ring-slate-900 transition-all">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl text-slate-800 tracking-tight font-extrabold transition-colors dark:text-slate-100">Menara</span>
          </div>
          <p className="text-slate-500 text-sm font-medium transition-colors dark:text-slate-400">Platform Manajemen Ruangan Internal</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white p-8 transition-colors dark:bg-slate-900/80 dark:border-slate-800">
          <h2 className="text-slate-800 text-xl font-bold tracking-tight mb-2 transition-colors dark:text-slate-100">Selamat Datang</h2>
          <p className="text-sm text-slate-500 mb-8 font-medium transition-colors dark:text-slate-400">Masuk untuk mengakses sistem</p>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg transition-colors duration-300 dark:bg-red-500/30 dark:border-red-500/30">
              <p className="text-red-600 text-sm transition-colors duration-300 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                placeholder="nama@oikn.go.id"
                className={`w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
                  errors.email
                    ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-900 dark:text-rose-200"
                    : email && email.includes("@")
                    ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 dark:text-slate-200"
                }`}
              />
              {errors.email && <p className="text-rose-500 text-xs mt-1.5 font-medium transition-colors duration-300 dark:text-rose-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-slate-700 font-semibold transition-colors dark:text-slate-300">Password</label>
                <button type="button" onClick={() => onNavigate("forgot-password")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 font-semibold hover:underline transition-all dark:text-indigo-400">
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl border text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
                    errors.password
                      ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-900 dark:text-rose-200"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 dark:text-slate-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors p-1 dark:text-indigo-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-500 text-xs mt-1.5 font-medium transition-colors duration-300 dark:text-rose-400">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2 ${
                isValid && !loading
                  ? "bg-indigo-600 dark:bg-emerald-600 text-white hover:bg-indigo-700 dark:hover:bg-emerald-700 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : "Masuk ke Sistem"}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 transition-colors duration-300 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs font-semibold text-slate-400 tracking-wider uppercase transition-colors dark:bg-slate-900 dark:text-slate-500">atau masuk dengan</span>
              </div>
            </div>

            {/* Google SSO (demo only) */}
            <button
              type="button"
              onClick={() => {
                setEmail("user@oikn.go.id");
                setPassword("password123!");
              }}
              className="w-full py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Masuk dengan SSO IKN
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8 font-medium transition-colors dark:text-slate-400">
            Belum punya akun?{" "}
            <button onClick={() => onNavigate("register")} className="text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 font-bold hover:underline transition-colors dark:text-indigo-400">
              Daftar Sekarang
            </button>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-6 bg-indigo-50/80 backdrop-blur-md rounded-2xl p-5 border border-indigo-100/50 shadow-sm text-center transition-colors dark:bg-slate-900/80 dark:border-slate-800">
          <p className="text-indigo-800 text-xs font-bold mb-3 uppercase tracking-wider transition-colors dark:text-emerald-400">Mode Demo: Coba Akses Cepat</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {[
              { label: "Dimas", email: "dimas@oikn.go.id" },
              { label: "Rina", email: "rina@oikn.go.id" },
              { label: "Pengguna", email: "user@oikn.go.id" },
              { label: "Admin", email: "admin@oikn.go.id" },
              { label: "Super Admin", email: "superadmin@oikn.go.id" },
            ].map((d) => (
              <button
                key={d.email}
                onClick={() => { setEmail(d.email); setPassword("password123!"); }}
                className="text-xs bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white px-3.5 py-2 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md border border-indigo-100/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
