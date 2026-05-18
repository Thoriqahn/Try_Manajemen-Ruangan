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
    <div className="min-h-screen bg-gradient-to-br from-[#0F2144] to-[#1E3A5F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-[#1E3A5F]" />
          </div>
          <span className="text-2xl text-white" style={{ fontWeight: 700 }}>Menara</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <button
            onClick={() => onNavigate("login")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Login
          </button>

          {!sent ? (
            <>
              <h2 className="text-[#0F2144] mb-1" style={{ fontWeight: 700 }}>Lupa Password?</h2>
              <p className="text-sm text-gray-500 mb-6">Masukkan email terdaftar Anda. Kami akan mengirimkan kode OTP untuk reset password.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@oikn.go.id"
                    className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${
                      email && !emailValid ? "border-red-400 bg-red-50" :
                      emailValid ? "border-green-400 bg-green-50" :
                      "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    }`}
                  />
                  {email && !emailValid && <p className="text-red-500 text-xs mt-1">Format email tidak valid</p>}
                </div>

                <button
                  type="submit"
                  disabled={!emailValid || loading}
                  className={`w-full py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                    emailValid && !loading
                      ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144] shadow-md"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Mengirim...</span></>
                  ) : "Kirim Kode OTP"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[#0F2144] mb-2" style={{ fontWeight: 700 }}>Email Terkirim!</h2>
              <p className="text-sm text-gray-500 mb-1">
                Kode OTP telah dikirim ke
              </p>
              <p className="text-blue-600 text-sm mb-4" style={{ fontWeight: 500 }}>{email}</p>
              <p className="text-xs text-gray-400 mb-6">Periksa folder inbox atau spam Anda. Kode berlaku selama 30 menit.</p>

              <button
                onClick={() => onNavigate("login")}
                className="w-full py-3 rounded-lg bg-[#1E3A5F] text-white text-sm hover:bg-[#0F2144]"
              >
                Kembali ke Login
              </button>

              <button className="w-full py-2 mt-2 text-sm text-blue-600 hover:underline">
                Kirim Ulang (tersedia dalam 5 menit)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
