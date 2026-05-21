import { useState, useEffect } from "react";
import { QrCode, X, CheckCircle, AlertTriangle, Play, HelpCircle, Copy, Check } from "lucide-react";
import { bookingService, Booking } from "../../services/bookingService";
import { roomService } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";
import { toast } from "sonner";

interface QrScanSimulatorProps {
  onCheckInSuccess?: () => void;
}

export function QrScanSimulator({ onCheckInSuccess }: QrScanSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [qrTokenInput, setQrTokenInput] = useState("");
  const [actualToken, setActualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const currentUser = UserStore.get();

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const loadBookings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // We want to fetch confirmed OR ongoing bookings (for attendance)
      const res = await bookingService.list({ status: "confirmed,ongoing" }); // Need to ensure list API supports multiple statuses or we just fetch all and filter client side.
      // Wait, let's fetch all and filter client side since the API might not support comma separated statuses easily if not implemented.
      const allRes = await bookingService.list();
      if (allRes.success && allRes.data) {
        const validBookings = allRes.data.filter(b => b.status === "confirmed" || b.status === "ongoing");
        setBookings(validBookings);
        addLog(`Berhasil memuat ${validBookings.length} booking (CONFIRMED / ONGOING).`);
      }
    } catch (err: any) {
      addLog(`Gagal memuat booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      addLog("Simulator Check-In QR Code Statis diaktifkan.");
      loadBookings();
    }
  }, [isOpen]);

  // Listen to external trigger to open the simulator with a specific booking pre-selected
  useEffect(() => {
    const handleExternalTrigger = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const bookingId = customEvent.detail?.bookingId;
      setIsOpen(true);
      
      if (bookingId) {
        addLog(`Simulator dipicu secara otomatis untuk Booking ID: ${bookingId}`);
        try {
          const res = await bookingService.list();
          if (res.success && res.data) {
            const found = res.data.find(b => b.id === bookingId);
            if (found) {
              setSelectedBooking(found);
            } else {
              addLog(`Peringatan: Booking ID ${bookingId} tidak ditemukan.`);
            }
          }
        } catch (err: any) {
          addLog(`Gagal memuat detail booking pemicu: ${err.message}`);
        }
      }
    };

    window.addEventListener('menara:trigger-scan-simulator', handleExternalTrigger);
    return () => window.removeEventListener('menara:trigger-scan-simulator', handleExternalTrigger);
  }, []);

  // Fetch actual qr_token when booking is selected
  useEffect(() => {
    if (selectedBooking) {
      roomService.get(selectedBooking.room_id).then((res) => {
        if (res.success && res.data) {
          const token = res.data.qr_token || "";
          setActualToken(token);
          setQrTokenInput(token); // Auto-fill with the correct token for convenience
          addLog(`Memilih booking "${selectedBooking.agenda}".`);
          addLog(`Token QR Statis asli ruangan ini adalah: "${token}".`);
        }
      }).catch((err) => {
        addLog(`Gagal mengambil detail ruangan: ${err.message}`);
      });
    } else {
      setQrTokenInput("");
      setActualToken("");
    }
  }, [selectedBooking]);

  const handleCheckIn = async () => {
    if (!selectedBooking) {
      toast.error("Pilih salah satu booking terlebih dahulu!");
      return;
    }
    if (!qrTokenInput.trim()) {
      toast.error("Input token QR statis tidak boleh kosong!");
      return;
    }

    setSubmitting(true);
    addLog(`Mengirim request check-in untuk ruang ${selectedBooking.room_name || selectedBooking.room_id}...`);
    addLog(`Payload: { room_id: "${selectedBooking.room_id}", scanned_qr_token: "${qrTokenInput}" }`);

    try {
      const res = await bookingService.checkIn(selectedBooking.room_id, qrTokenInput);
      if (res.success) {
        toast.success("Check-In Berhasil!");
        addLog(`✅ SERVER SUCCESS: ${res.message || "Check-in berhasil dilakukan"}`);
        addLog(`   Data Booking ID: ${res.data?.booking_id}`);
        addLog(`   Status Booking berubah menjadi: ${res.data?.status}`);
        
        // Refresh bookings and trigger success callback
        loadBookings();
        setSelectedBooking(null);
        if (onCheckInSuccess) onCheckInSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan check-in.");
      addLog(`❌ SERVER ERROR (HTTP ${err.status || 400}): ${err.message || "Check-in gagal"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!actualToken) return;
    navigator.clipboard.writeText(actualToken);
    setCopied(true);
    toast.success("Token QR berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group"
        title="Simulasikan Scan QR Code Pintu"
      >
        <QrCode size={22} className="group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-xs font-bold uppercase tracking-wider">
          Simulasi QR Check-In
        </span>
      </button>

      {/* Simulator Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0A1428]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Modal Container */}
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Pintu QR Code Check-In Simulator</h3>
                  <p className="text-[10px] text-slate-400">Diagnosis & simulasi kedisiplinan kehadiran fisik secara real-time</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Active Bookings Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  1. Pilih Jadwal Booking Terkonfirmasi / Sedang Berjalan
                </label>
                {loading ? (
                  <div className="h-28 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <AlertTriangle className="mx-auto mb-2 text-slate-400" size={20} />
                    Tidak ada booking aktif berstatus <span className="font-bold">confirmed</span> untuk Anda hari ini.
                    <p className="text-[10px] text-slate-400 mt-1">Silakan lakukan pemesanan meeting room di menu kalender terlebih dahulu.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bookings.map((b) => {
                      const isSelected = selectedBooking?.id === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-500 shadow-sm"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{b.start_time} - {b.end_time}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              b.status === "ongoing" ? "bg-amber-100 text-amber-800" : (isSelected ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-blue-700")
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 truncate">{b.agenda}</h4>
                          <p className="text-[10px] text-slate-500 truncate mt-1">
                            📍 {b.room_name || b.room_id}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* QR Token Input */}
              {selectedBooking && (
                <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase">
                      2. Input Scanned QR Code Token
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Simulasikan pembacaan QR Code. Anda dapat memasukkan kode secara manual untuk menguji validasi, atau menyalin token asli pintu ruangan di bawah ini.
                    </p>
                  </div>

                  {/* Token Info & Copy Helper */}
                  <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-500">Token Ruangan Asli:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-indigo-700 font-bold select-all">
                        {actualToken || "Mengambil..."}
                      </code>
                      <button
                        onClick={copyToClipboard}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        title="Salin Token Pintu"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan Token UUIDv4 (Contoh: e2a265aa-...)"
                      value={qrTokenInput}
                      onChange={(e) => setQrTokenInput(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 bg-white font-mono"
                    />
                    <button
                      onClick={handleCheckIn}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Play size={14} />
                      {submitting ? "Checking In..." : "Simulasi Tap"}
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-[10px] text-amber-800">
                    <HelpCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={14} />
                    <div className="leading-normal">
                      <strong>Ketentuan Sistem (Dual-Mechanism):</strong><br/>
                      1. Pemindai <strong>PERTAMA</strong> akan mengklaim ruangan (status menjadi Ongoing).<br/>
                      2. Pemindai <strong>BERIKUTNYA</strong> akan dicatat sebagai Presensi Kehadiran dalam tabel data.<br/>
                      <em>*Early check-in diizinkan 10 menit sebelum jam mulai. Batas keterlambatan 15 menit.</em>
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic Log Panel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Console Log Diagnostic
                  </label>
                  <button
                    onClick={() => setLogs([])}
                    className="text-[10px] text-slate-400 hover:text-emerald-600 hover:underline"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 h-40 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1.5 border border-slate-800 shadow-inner">
                  {logs.length === 0 ? (
                    <span className="text-slate-500 italic">Menunggu simulasi dimulai...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="leading-normal whitespace-pre-wrap">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
              <span>Menara OIKN Space Management Diagnostic Panel</span>
              <span>Waktu Lokal: {new Date().toLocaleTimeString("id-ID")}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
