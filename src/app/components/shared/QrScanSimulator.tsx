import { useState, useEffect, useRef } from "react";
import { QrCode, X, AlertTriangle, Play, Copy, Check, Camera } from "lucide-react";
import { bookingService, Booking, Attendee } from "../../services/bookingService";
import { roomService } from "../../services/roomService";
import { UserStore, api } from "../../services/apiClient";
import { toast } from "sonner";
import { Scanner } from '@yudiel/react-qr-scanner';

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
  
  const [users, setUsers] = useState<{id: string, name: string, role: string}[]>([]);
  const [simulatedUserId, setSimulatedUserId] = useState<string>("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "attendees">("camera");

  const currentUser = UserStore.get();

  // Drag state for floating button
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isClickRef = useRef(true);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
    isClickRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    isClickRef.current = false; // Not a click if it moves
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const loadBookings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allRes = await bookingService.list({ own_only: "true" });
      if (allRes.success && allRes.data) {
        const validBookings = allRes.data.filter(b => b.status === "confirmed" || b.status === "ongoing");
        setBookings(validBookings);
        addLog(`Berhasil memuat ${validBookings.length} booking (CONFIRMED / ONGOING).`);
      }

      if (currentUser.role === 'superadmin' && users.length === 0) {
        try {
          const usersRes = await api.get<{data: {id: string, name: string, role: string}[]}>('/users');
          if (usersRes.success && usersRes.data) {
             setUsers(usersRes.data);
          }
        } catch (e) {
          addLog("Gagal mengambil daftar pengguna");
        }
      }
    } catch (err: any) {
      addLog(`Gagal memuat booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendees = async () => {
    if (!selectedBooking) return;
    try {
      const res = await bookingService.getAttendees(selectedBooking.id);
      if (res.success && res.data) {
        setAttendees(res.data);
      }
    } catch (err: any) {
      addLog(`Gagal memuat data presensi: ${err.message}`);
    }
  };

  useEffect(() => {
    if (selectedBooking && activeTab === "attendees") {
      loadAttendees();
    }
  }, [selectedBooking, activeTab]);

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
          const res = await bookingService.list({ own_only: "true" });
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
      const res = await bookingService.checkIn(selectedBooking.room_id, qrTokenInput, simulatedUserId || undefined);
      if (res.success) {
        toast.success(res.message || "Check-In Berhasil!");
        addLog(`✅ SERVER SUCCESS: ${res.message || "Check-in berhasil dilakukan"}`);
        addLog(`   Data Booking ID: ${res.data?.booking_id}`);
        addLog(`   Status Booking berubah menjadi: ${res.data?.status}`);
        
        loadBookings();
        loadAttendees();
        if (onCheckInSuccess) onCheckInSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan check-in.");
      addLog(`❌ SERVER ERROR (HTTP ${err.status || 400}): ${err.message || "Check-in gagal"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCameraScan = async (result: any) => {
    if (result && result.length > 0 && !submitting) {
      let token = result[0].rawValue;
      
      // Extract token from URL if the QR code contains a full URL (e.g., http://domain/qr/uuid or /public/qr/uuid)
      if (token && (token.includes('/qr/') || token.includes('/public/qr/'))) {
        const parts = token.split('/qr/');
        token = parts[parts.length - 1].split('?')[0].split('#')[0]; // Remove query params and hash
      }
      
      setSubmitting(true);
      addLog(`Membaca QR Token dari Kamera: ${token.slice(0, 8)}...`);

      try {
        const res = await bookingService.checkIn(undefined, token, simulatedUserId || undefined);
        if (res.success) {
          toast.success(res.message || "Berhasil!");
          addLog(`✅ SUCCESS: ${res.message}`);
          loadBookings();
          
          if (res.data?.booking_id) {
            // Find the booking in the list or just fetch attendees for this ID directly
            const matchedBooking = bookings.find(b => b.id === res.data.booking_id);
            if (matchedBooking) setSelectedBooking(matchedBooking);
            
            // Immediately load attendees for the newly checked-in booking
            try {
              const attRes = await bookingService.getAttendees(res.data.booking_id);
              setAttendees(attRes.data);
            } catch (err) { }
            
            // Automatically switch to attendees tab to show the meeting and attendance list
            setActiveTab("attendees");
          } else if (selectedBooking) {
            loadAttendees();
            setActiveTab("attendees");
          }

          if (onCheckInSuccess) onCheckInSuccess();
        }
      } catch (err: any) {
        toast.error(err.message || "QR Code tidak valid.");
        addLog(`❌ ERROR: ${err.message}`);
      } finally {
        setTimeout(() => setSubmitting(false), 2000); // Debounce scans
      }
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
      {/* Floating Action Button (Desktop Only) */}
      <div 
        className="hidden lg:flex fixed bottom-6 right-6 z-50"
        style={{
           transform: `translate(${position.x}px, ${position.y}px)`,
           cursor: isDragging ? 'grabbing' : 'grab',
           touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          onClick={(e) => {
            if (!isClickRef.current) {
              e.preventDefault();
              return;
            }
            setIsOpen(true);
          }}
          className={`flex px-6 py-4 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.4)] items-center gap-3 shadow-emerald-500/50 select-none ${isDragging ? '' : 'hover:-translate-y-1 active:scale-95 transition-all animate-bounce'}`}
          title="Check-In QR Code Pintu"
        >
          <QrCode size={24} className={isDragging ? '' : 'animate-pulse'} />
          <span className="text-sm font-bold uppercase tracking-wider">
            Tap QR Check-In
          </span>
        </button>
      </div>

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
                  <h3 className="font-bold text-sm tracking-wide">Pintu QR Code Check-In</h3>
                  <p className="text-[10px] text-slate-400">Panel pencatatan kehadiran fisik secara real-time</p>
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
              {/* Tabs for Scanner & Attendance */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("camera")}
                  className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeTab === "camera" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <Camera size={14} /> Pindai Kamera
                </button>
                <button
                  onClick={() => setActiveTab("manual")}
                  className={`px-4 py-2 text-xs font-bold ${activeTab === "manual" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Input Manual / Simulasi
                </button>
                <button
                  onClick={() => setActiveTab("attendees")}
                  className={`px-4 py-2 text-xs font-bold ${activeTab === "attendees" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Daftar Kehadiran ({attendees.length})
                </button>
              </div>

              {/* Active Bookings Selector (Hidden on Camera Tab) */}
              {activeTab !== "camera" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {activeTab === "manual" ? "1. Pilih Jadwal Booking Terkonfirmasi / Sedang Berjalan" : "Pilih Jadwal untuk Melihat Daftar Kehadiran"}
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
              )}

              {/* Camera Scanner View */}
              {activeTab === "camera" && (
                <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase">
                      Pindai QR Code Ruangan
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Arahkan kamera perangkat Anda ke QR Code yang ada di depan pintu ruangan. 
                      Anda tidak perlu memilih jadwal secara manual; sistem akan otomatis mendeteksi jadwal aktif Anda di ruangan tersebut.
                    </p>
                  </div>

                  {currentUser?.role === 'superadmin' && (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs mt-2">
                      <span className="text-slate-500">Check-In Atas Nama:</span>
                      <select 
                        value={simulatedUserId} 
                        onChange={(e) => setSimulatedUserId(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded outline-none text-slate-700 bg-slate-50 max-w-[200px]"
                      >
                        <option value="">( Diri Sendiri )</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} - {u.role}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 relative aspect-square max-w-sm mx-auto bg-black flex items-center justify-center">
                    {submitting ? (
                      <div className="flex flex-col items-center justify-center text-white">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <span className="text-xs font-bold">Memproses...</span>
                      </div>
                    ) : (
                      <Scanner
                        onScan={handleCameraScan}
                        onError={(err: unknown) => {
                          const errMessage = err instanceof Error ? err.message : String(err);
                          if (!errMessage.includes('No barcode or QR code detected')) {
                            console.error(errMessage);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* QR Token Input */}
              {selectedBooking && activeTab === "manual" && (
                <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase">
                      2. Input Scanned QR Code Token & Pengguna
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Lakukan pencatatan Check-In kehadiran. Anda dapat memasukkan kode secara manual untuk menguji validasi, atau menyalin token asli pintu ruangan di bawah ini.
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

                  {currentUser?.role === 'superadmin' && (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs mt-2">
                      <span className="text-slate-500">Check-In Atas Nama:</span>
                      <select 
                        value={simulatedUserId} 
                        onChange={(e) => setSimulatedUserId(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded outline-none text-slate-700 bg-slate-50 max-w-[200px]"
                      >
                        <option value="">( Diri Sendiri )</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} - {u.role}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      {submitting ? "Checking In..." : "Proses Check-In"}
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

              {/* Attendance List */}
              {selectedBooking && activeTab === "attendees" && (
                <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase">
                      Daftar Hadir ({attendees.length})
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Berikut adalah daftar pengguna yang telah berhasil melakukan check-in pada sesi rapat ini.
                    </p>
                  </div>
                  
                  {attendees.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-white text-xs text-slate-400">
                      Belum ada presensi yang masuk.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">Nama Peserta</th>
                            <th className="px-4 py-2 font-medium">Waktu Check-In</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendees.map(att => (
                            <tr key={att.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700">{att.user_name}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono">
                                {new Date(att.scanned_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
