import { useState } from "react";
import { Eye, EyeOff, Building2, Check, X } from "lucide-react";
import { authService } from "../../services/authService";

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
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? "bg-green-100" : "bg-red-100"}`}>
        {ok ? <Check size={10} className="text-green-600" /> : <X size={10} className="text-red-500" />}
      </div>
      <span className={`text-xs ${ok ? "text-green-700" : "text-red-500"}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2144] to-[#1E3A5F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-[#1E3A5F]" />
          </div>
          <span className="text-2xl text-white" style={{ fontWeight: 700 }}>Menara</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === "form" ? (
            <>
              <h2 className="text-[#0F2144] mb-1" style={{ fontWeight: 700 }}>Buat Akun Baru</h2>
              <p className="text-sm text-gray-500 mb-6">Daftar untuk mengakses sistem pemesanan ruangan</p>

              {generalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{generalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap Anda"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nama@oikn.go.id"
                    className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${
                      form.email && !emailValid ? "border-red-400 bg-red-50" :
                      emailValid ? "border-green-400 bg-green-50" :
                      "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm outline-none transition-all ${
                        form.confirmPassword && !passwordsMatch ? "border-red-400 bg-red-50" :
                        passwordsMatch ? "border-green-400 bg-green-50" :
                        "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.confirmPassword && !passwordsMatch && (
                    <p className="text-red-500 text-xs mt-1">Password tidak cocok</p>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">
                    Saya menyetujui{" "}
                    <span className="text-blue-600 underline cursor-pointer">Syarat dan Ketentuan</span>{" "}
                    penggunaan sistem
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!formValid || loading}
                  className={`w-full py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                    formValid && !loading
                      ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144] shadow-md"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Memproses...</span></>
                  ) : "Daftar"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Sudah punya akun?{" "}
                <button onClick={() => onNavigate("login")} className="text-blue-600 hover:underline" style={{ fontWeight: 500 }}>Masuk</button>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-[#0F2144]" style={{ fontWeight: 700 }}>Verifikasi Email</h2>
                <p className="text-sm text-gray-500 mt-1">Kode OTP telah dikirim ke <span className="text-blue-600" style={{ fontWeight: 500 }}>{form.email}</span></p>
                <p className="text-xs text-gray-400 mt-1">Berlaku selama 30 menit</p>
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
                    className="w-11 h-12 text-center text-lg border rounded-lg border-gray-200 bg-gray-50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ fontWeight: 600 }}
                  />
                ))}
              </div>
              {otpError && <p className="text-red-500 text-xs text-center mb-3">{otpError}</p>}

              <button
                onClick={handleOtpSubmit}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#1E3A5F] text-white text-sm hover:bg-[#0F2144] flex items-center justify-center gap-2"
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Memverifikasi...</span></> : "Verifikasi"}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Tidak menerima kode?{" "}
                {canResend ? (
                  <button onClick={handleResend} className="text-blue-600 hover:underline" style={{ fontWeight: 500 }}>Kirim Ulang</button>
                ) : (
                  <span className="text-gray-400">Kirim ulang dalam {Math.floor(resendCooldown / 60)}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                )}
              </p>
            </>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">© 2025 OIKN — Sistem Manajemen Ruangan</p>
      </div>
    </div>
  );
}
