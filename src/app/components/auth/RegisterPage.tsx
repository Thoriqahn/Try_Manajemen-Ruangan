import { useState } from "react";
import { Eye, EyeOff, Building2, Check, X } from "lucide-react";
import { authService } from "../../services/authService";
import { ThemeToggle } from "../layout/ThemeToggle";

interface RegisterPageProps {
  onNavigate: (page: string) => void;
  onLogin?: (user: any) => void;
}

export function RegisterPage({ onNavigate, onLogin }: RegisterPageProps) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  const checks = {
    length: form.password.length >= 8,
    letter: /[a-zA-Z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^a-zA-Z0-9]/.test(form.password),
  };
  const passwordValid = Object.values(checks).every(Boolean);
  const emailValid = form.email.includes("@") && !form.email.includes(" ");
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword !== "";
  const formValid = emailValid && passwordValid && passwordsMatch && agreed && form.name.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    setGeneralError("");
    try {
      const res = await authService.register({ name: form.name, email: form.email, password: form.password });
      if (res.success) {
        setUserId(res.userId);
        setStep("otp");
      } else {
        setGeneralError(res.message || "Registrasi gagal");
      }
    } catch (err: any) {
      setGeneralError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
    // Handle backspace
    if (!value && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const otpVal = otp.join("");
    if (otpVal.length < 6) { setOtpError("Masukkan 6 digit OTP"); return; }
    setLoading(true);
    setOtpError("");
    try {
      const res = await authService.verifyOtp(userId, otpVal);
      if (res.success) {
        if (onLogin && res.user) onLogin(res.user);
        else onNavigate("login");
      } else {
        if (res.code === "OTP_EXPIRED") {
          setOtpError("Kode OTP sudah kadaluarsa. Silakan daftar ulang.");
          setTimeout(() => onNavigate("register"), 2000);
        } else {
          setOtpError(res.message || "Kode OTP tidak valid");
        }
      }
    } catch (err: any) {
      setOtpError(err.message || "Verifikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await authService.resendOtp(userId);
      setCanResend(false);
      let secs = 300; // 5 min
      setResendCooldown(secs);
      const timer = setInterval(() => {
        secs--;
        setResendCooldown(secs);
        if (secs <= 0) { clearInterval(timer); setCanResend(true); }
      }, 1000);
    } catch (err: any) {
      setOtpError(err.message);
    }
  };

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? "bg-green-100 dark:bg-green-500/20 dark:bg-green-500/30" : "bg-red-100 dark:bg-red-500/20 dark:bg-red-500/30"}`}>
        {ok ? <Check size={10} className="text-green-600 transition-colors duration-300 dark:text-green-400" /> : <X size={10} className="text-red-500 transition-colors duration-300 dark:text-red-400" />}
      </div>
      <span className={`text-xs ${ok ? "text-green-700 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300 dark:bg-slate-950">
      <div className="absolute top-4 right-4 z-50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm">
        <ThemeToggle />
      </div>
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] transition-colors duration-300 dark:bg-emerald-600/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] transition-colors duration-300 dark:bg-indigo-600/10" />
      
      {/* IKN Ornaments Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.03] dark:opacity-[0.05] transition-colors duration-300">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/200/svg">
          <defs>
            <pattern id="register-ikn-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-slate-300 transition-colors duration-300 dark:text-slate-200" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#register-ikn-pattern)" />
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
          {step === "form" ? (
            <>
              <h2 className="text-slate-800 text-xl font-bold tracking-tight mb-2 transition-colors dark:text-slate-100">Buat Akun Baru</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium transition-colors dark:text-slate-400">Daftar untuk mengakses sistem pemesanan ruangan</p>

              {generalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg transition-colors duration-300 dark:bg-red-500/30 dark:border-red-500/30">
                  <p className="text-red-600 text-sm transition-colors duration-300 dark:text-red-400">{generalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap Anda"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nama@oikn.go.id"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
                      form.email && !emailValid ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-900 dark:text-rose-200" :
                      emailValid ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-900 dark:text-emerald-200" :
                      "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 dark:text-slate-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors p-1 dark:text-indigo-400">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <CheckItem ok={checks.length} label="Min. 8 karakter" />
                      <CheckItem ok={checks.letter} label="Mengandung huruf" />
                      <CheckItem ok={checks.number} label="Mengandung angka" />
                      <CheckItem ok={checks.special} label="Karakter khusus" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2 font-semibold transition-colors dark:text-slate-300">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3.5 pr-12 rounded-xl border text-sm outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
                        form.confirmPassword && !passwordsMatch ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-900 dark:text-rose-200" :
                        passwordsMatch ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-900 dark:text-emerald-200" :
                        "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 dark:text-slate-200"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors p-1 dark:text-indigo-400">
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.confirmPassword && !passwordsMatch && (
                    <p className="text-rose-500 text-xs mt-1.5 font-medium transition-colors duration-300 dark:text-rose-400">Password tidak cocok</p>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white peer-checked:bg-indigo-500 dark:peer-checked:bg-emerald-500 peer-checked:border-indigo-500 dark:peer-checked:border-emerald-500 transition-all flex items-center justify-center dark:bg-emerald-600 dark:border-slate-600">
                      <Check size={14} className="text-white peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 font-medium transition-colors duration-300 dark:text-slate-400">
                    Saya menyetujui{" "}
                    <span className="text-indigo-600 font-bold hover:underline cursor-pointer transition-colors duration-300 dark:text-emerald-400">Syarat dan Ketentuan</span>{" "}
                    penggunaan sistem
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!formValid || loading}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2 ${
                    formValid && !loading
                      ? "bg-indigo-600 dark:bg-emerald-600 text-white hover:bg-indigo-700 dark:hover:bg-emerald-700 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Memproses...</span></>
                  ) : "Daftar"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-8 font-medium transition-colors duration-300 dark:text-slate-400">
                Sudah punya akun?{" "}
                <button onClick={() => onNavigate("login")} className="text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 font-bold hover:underline transition-colors dark:text-indigo-400">Masuk Sekarang</button>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg transition-colors duration-300 dark:bg-emerald-500/30 dark:border-slate-800">
                  <svg className="w-8 h-8 text-indigo-600 transition-colors duration-300 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-slate-800 text-xl font-bold tracking-tight mb-2 transition-colors duration-300 dark:text-slate-100">Verifikasi Email</h2>
                <p className="text-sm text-slate-500 font-medium mt-1 transition-colors duration-300 dark:text-slate-400">Kode OTP telah dikirim ke <br/><span className="text-indigo-600 font-bold transition-colors duration-300 dark:text-emerald-400">{form.email}</span></p>
                <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-100 inline-block px-3 py-1 rounded-full transition-colors duration-300 dark:bg-slate-800 dark:text-slate-500">Berlaku selama 30 menit</p>
              </div>

              <div className="flex gap-2 justify-center mb-4">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus();
                      }
                    }}
                    className="w-12 h-14 text-center text-xl font-bold border rounded-xl border-slate-200 bg-slate-50/50 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 text-slate-800 transition-all duration-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
              {otpError && <p className="text-red-500 text-xs text-center mb-3 transition-colors duration-300 dark:text-red-400">{otpError}</p>}

              <button
                onClick={handleOtpSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 dark:hover:bg-emerald-700 flex items-center justify-center gap-2 mt-2 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5 dark:bg-emerald-600"
              >
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Memverifikasi...</span></> : "Verifikasi"}
              </button>

              <p className="text-center text-sm text-slate-500 mt-6 font-medium transition-colors duration-300 dark:text-slate-400">
                Tidak menerima kode?{" "}
                {canResend ? (
                  <button onClick={handleResend} className="text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 font-bold hover:underline transition-colors dark:text-indigo-400">Kirim Ulang</button>
                ) : (
                  <span className="text-slate-400 transition-colors duration-300 dark:text-slate-500">Kirim ulang dalam {Math.floor(resendCooldown / 60)}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                )}
              </p>
            </>
          )}
        </div>

        <p className="text-center text-slate-400/80 text-xs mt-6 font-medium transition-colors duration-300 dark:text-slate-500/80">© 2025 OIKN — Sistem Manajemen Ruangan</p>
      </div>
    </div>
  );
}
