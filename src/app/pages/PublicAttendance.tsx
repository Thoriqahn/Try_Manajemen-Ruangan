import { useState, useRef, useEffect } from "react";
import { CheckCircle2, ChevronRight, X, Building, Video, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export default function PublicAttendance() {
  // Extract ID from /presensi/:id
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [zoomData, setZoomData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    position: "",
    attendance_type: "offline"
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        // We bypass standard service if they require auth token, by directly hitting public endpoint
        const res = await fetch(`/api/public/bookings/${id}`);
        const data = await res.json();
        
        if (data.success) {
          setBooking(data.data);
          let defaultType = data.data.meeting_type === 'online' || data.data.meeting_type === 'digital' ? 'online' : 'offline';
          if (data.data.meeting_type === 'hybrid') {
            defaultType = mode === 'offline' ? 'offline' : 'online';
          }
          setFormData(prev => ({ ...prev, attendance_type: defaultType }));
        } else {
          toast.error(data.message || "Rapat tidak ditemukan");
        }
      } catch (err) {
        toast.error("Gagal memuat data rapat");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
  }, [id]);

  // Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Prevent scrolling when touching canvas
    // It's handled by touch-action-none class

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) {
      toast.error("Silakan berikan tanda tangan digital Anda");
      return;
    }

    setSubmitting(true);
    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL("image/png") : "";

    try {
      const res = await fetch(`/api/public/attendances/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          signature: signatureBase64
        })
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        if (data.zoom_join_url) {
          setZoomData({ url: data.zoom_join_url, passcode: data.zoom_passcode });
        }
      } else {
        toast.error(data.message || "Gagal mengirim presensi");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-pulse bg-white p-8 rounded-2xl w-full max-w-md shadow-sm space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-40 bg-slate-100 rounded w-full mt-8"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <X className="text-red-500 w-16 h-16 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Rapat Tidak Ditemukan</h1>
        <p className="text-slate-500 mt-2">Tautan presensi mungkin tidak valid atau kedaluwarsa.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 sm:px-6">
      
      {/* Header Info */}
      <div className="w-full max-w-xl mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl mb-4 shadow-sm">
          <Building size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Presensi Kehadiran</h1>
        <h2 className="text-lg font-medium text-slate-600 mt-2">{booking.agenda}</h2>
        <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm font-semibold text-slate-500">
          <span className="bg-white border px-3 py-1 rounded-full shadow-sm">{booking.date}</span>
          <span className="bg-white border px-3 py-1 rounded-full shadow-sm">{booking.start_time} - {booking.end_time}</span>
        </div>
      </div>

      {/* Main Form Card */}
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800" placeholder="Contoh: Dr. Budi Santoso" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800" placeholder="contoh@email.com" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Instansi / Perusahaan</label>
                    <input type="text" required value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800" placeholder="Contoh: Kementerian Kesehatan" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Jabatan</label>
                    <input type="text" required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800" placeholder="Contoh: Direktur Jenderal" />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-slate-700">Tanda Tangan Digital</label>
                    <button type="button" onClick={clearSignature} className="text-xs font-bold text-blue-600 hover:text-blue-800">Bersihkan</button>
                  </div>
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden touch-none relative">
                    {!hasSignature && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium pointer-events-none">Tanda tangan di area ini</div>}
                    <canvas 
                      ref={canvasRef}
                      width={600} 
                      height={200}
                      className="w-full h-40 cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={endDrawing}
                    />
                  </div>
                </div>
              </div>

              <button disabled={submitting} type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                {submitting ? "Menyimpan..." : "Hadir"} <ChevronRight size={20} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white rounded-[2rem] shadow-xl border border-slate-100 p-10 text-center flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Terima Kasih!</h2>
            <p className="text-slate-600 mb-8 max-w-sm">Presensi kehadiran Anda telah berhasil dicatat oleh sistem Menara OIKN.</p>
            
            {zoomData && formData.attendance_type === 'online' && (
              <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-6 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><VideoIcon size={64} /></div>
                <h3 className="text-lg font-bold text-blue-800 mb-1">Rapat Dimulai!</h3>
                <p className="text-sm text-blue-600 mb-4">Silakan masuk ke ruangan Zoom menggunakan tautan di bawah ini.</p>
                {zoomData.passcode && (
                  <div className="mb-4 inline-block bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-sm font-bold text-slate-700">
                    Passcode: <span className="text-blue-600 tracking-wider">{zoomData.passcode}</span>
                  </div>
                )}
                <a href={zoomData.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all">
                  Masuk Rapat Zoom
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-12 text-center text-xs font-medium text-slate-400">
        &copy; {new Date().getFullYear()} Otorita Ibu Kota Nusantara (OIKN). Hak cipta dilindungi undang-undang.
      </div>
    </div>
  );
}
