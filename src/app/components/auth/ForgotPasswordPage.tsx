import { useState } from "react";
import { Building2, ArrowLeft } from "lucide-react";
import { authService } from "../../services/authService";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [userId, setUserId] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const emailValid = email.includes("@") && !email.includes(" ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await authService.forgotPassword(email);
      if (res.userId) setUserId(res.userId);
      setSent(true);
      setStep("otp");
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSent(true);
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp || !newPassword) return;
    setLoading(true);
    setError("");
    try {
      const res = await authService.resetPassword(userId, otp, newPassword);
      if (res.success) {
        onNavigate("login");
      } else {
        setError(res.message || "Reset gagal");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
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
            <pattern id="forgot-ikn-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-slate-300 transition-colors duration-300 dark:text-slate-200" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#forgot-ikn-pattern)" />
        </svg>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-indigo-600 dark:from-emerald-500 dark:to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 dark:shadow-emerald-500/20 ring-4 ring-white dark:ring-slate-900 transition-all">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl text-slate-800 tracking-tight font-extrabold transition-colors dark:text-slate-100">Menara</span>
          </div>
          <p className="text-slate-500 text-sm font-medium transition-colors dark:text-slate-400">Platform Manajemen Ruangan Internal</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white p-8 transition-colors dark:bg-slate-900/80 dark:border-slate-800">
          <button
            onClick={() => onNavigate("login")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-emerald-400 mb-8 transition-colors font-medium group dark:text-slate-400"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Kembali ke Login
          </button>

          {!sent ? (
            <>
              <h2 className="text-slate-800 text-xl font-bold tracking-tight mb-2 transition-colors dark:text-slate-100">Lupa Password?</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium transition-colors leading-relaxed dark:text-slate-400">Masukkan email terdaftar Anda. Kami akan mengirimkan kode OTP untuk reset password.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@oikn.go.id"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
                      email && !emailValid ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-900 dark:text-rose-200" :
                      emailValid ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-900 dark:text-emerald-200" :
                      "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 dark:text-slate-200"
                    }`}
                  />
                  {email && !emailValid && <p className="text-rose-500 text-xs mt-1.5 font-medium transition-colors duration-300 dark:text-rose-400">Format email tidak valid</p>}
                </div>

                <button
                  type="submit"
                  disabled={!emailValid || loading}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2 ${
                    emailValid && !loading
                      ? "bg-indigo-600 dark:bg-emerald-600 text-white hover:bg-indigo-700 dark:hover:bg-emerald-700 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Mengirim...</span></>
                  ) : "Kirim Kode OTP"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg transition-colors duration-300 dark:bg-emerald-500/30 dark:border-slate-800">
                <svg className="w-8 h-8 text-emerald-500 transition-colors duration-300 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-slate-800 text-xl font-bold tracking-tight mb-2 transition-colors duration-300 dark:text-slate-100">Email Terkirim!</h2>
              <p className="text-sm text-slate-500 mb-1 font-medium transition-colors duration-300 dark:text-slate-400">
                Kode OTP telah dikirim ke
              </p>
              <p className="text-indigo-600 text-sm mb-6 font-bold transition-colors duration-300 dark:text-emerald-400">{email}</p>
              <p className="text-xs text-slate-400 mb-8 font-medium bg-slate-100 inline-block px-3 py-1.5 rounded-full leading-relaxed transition-colors duration-300 dark:bg-slate-800 dark:text-slate-500">Periksa folder inbox atau spam Anda.<br/>Kode berlaku selama 30 menit.</p>

              <button
                onClick={() => onNavigate("login")}
                className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 dark:hover:bg-emerald-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 dark:bg-emerald-600"
              >
                Kembali ke Login
              </button>

              <button className="w-full py-3 mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 hover:underline transition-colors rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 dark:bg-indigo-500/30 dark:text-indigo-400">
                Kirim Ulang (tersedia dalam 5 menit)
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-slate-400/80 text-xs mt-6 font-medium transition-colors duration-300 dark:text-slate-500/80">© 2025 OIKN — Sistem Manajemen Ruangan</p>
      </div>
    </div>
  );
}
