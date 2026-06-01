import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/apiClient";

export default function QrRedirect() {
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];

    if (!token) {
      setError("Token tidak valid");
      return;
    }

    const checkToken = async () => {
      try {
        // Fetch current active meeting for this room QR token
        const res = await fetch(`/api/public/qr/${token}`);
        const data = await res.json();

        if (data.success && data.bookingId) {
          // Redirect to public attendance page for that booking with mode=offline
          window.location.replace(`/presensi/${data.bookingId}?mode=offline`);
        } else {
          // If logged in, maybe try to check-in internally?
          const tokenStr = localStorage.getItem('token');
          if (tokenStr) {
             // User is logged in, and maybe there's an internal meeting or they just want to check-in?
             // Actually, if there is a meeting, the public API returns it. If there isn't, they get an error.
             setError(data.message || "Tidak ada rapat aktif saat ini di ruangan ini.");
          } else {
             setError(data.message || "Tidak ada rapat aktif saat ini di ruangan ini.");
          }
        }
      } catch (err) {
        setError("Gagal menghubungi server");
      }
    };

    checkToken();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl text-center">
        {error ? (
          <>
            <div className="text-red-500 font-bold text-xl mb-2">Gagal</div>
            <p className="text-slate-600">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800">Memproses QR Code...</h2>
            <p className="text-sm text-slate-500 mt-2">Mengarahkan ke halaman presensi</p>
          </>
        )}
      </div>
    </div>
  );
}
