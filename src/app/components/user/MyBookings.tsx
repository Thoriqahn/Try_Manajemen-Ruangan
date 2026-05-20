import { useState, useEffect } from "react";
import { Search, Calendar, MapPin, Clock, AlertTriangle, Video, ExternalLink } from "lucide-react";
import { bookingService, Booking } from "../../services/bookingService";

interface MyBookingsProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: "bg-blue-100", text: "text-blue-700", label: "Dikonfirmasi" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Menunggu Approval" },
  ongoing: { bg: "bg-green-100", text: "text-green-700", label: "Berlangsung" },
  completed: { bg: "bg-gray-100", text: "text-gray-600", label: "Selesai" },
  cancelled: { bg: "bg-red-100", text: "text-red-600", label: "Dibatalkan" },
  rejected: { bg: "bg-red-100", text: "text-red-600", label: "Ditolak" },
};

const meetingTypeBadge: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  offline: { bg: "bg-gray-100", text: "text-gray-600", label: "Offline", icon: "🏢" },
  online: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Online", icon: "💻" },
  hybrid: { bg: "bg-purple-100", text: "text-purple-700", label: "Hybrid", icon: "🔄" },
};

function isZoomButtonEnabled(booking: any): boolean {
  if (!booking.zoom_join_url) return false;
  const now = new Date();
  const bookingDate = booking.date;
  const [startH, startM] = booking.start_time.split(":").map(Number);
  const [endH, endM] = booking.end_time.split(":").map(Number);

  const start = new Date(`${bookingDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
  const end = new Date(`${bookingDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

  // Enable 15 minutes before start until end
  const enableAt = new Date(start.getTime() - 15 * 60 * 1000);
  return now >= enableAt && now <= end;
}

function getZoomButtonStatus(booking: any): { enabled: boolean; label: string } {
  if (!booking.zoom_join_url) return { enabled: false, label: "Link belum tersedia" };

  const now = new Date();
  const bookingDate = booking.date;
  const [startH, startM] = booking.start_time.split(":").map(Number);
  const [endH, endM] = booking.end_time.split(":").map(Number);

  const start = new Date(`${bookingDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
  const end = new Date(`${bookingDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
  const enableAt = new Date(start.getTime() - 15 * 60 * 1000);

  if (now < enableAt) {
    const diff = enableAt.getTime() - now.getTime();
    const mins = Math.ceil(diff / 60000);
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return { enabled: false, label: `Aktif dalam ${hours}j ${mins % 60}m` };
    }
    return { enabled: false, label: `Aktif dalam ${mins} menit` };
  }
  if (now > end) return { enabled: false, label: "Rapat sudah selesai" };
  return { enabled: true, label: "Masuk Rapat Zoom" };
}

export function MyBookings({ onNavigate }: MyBookingsProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "ongoing" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.list();
      if (res.success) setBookings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Refresh every minute for zoom button timing
  useEffect(() => {
    const interval = setInterval(() => {
      setBookings(prev => [...prev]); // trigger re-render
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const tabBookings = bookings.filter(b => {
    const isUpcoming = ["confirmed", "pending"].includes(b.status);
    const isOngoing = b.status === "ongoing";
    const isPast = ["completed", "cancelled", "rejected"].includes(b.status);

    if (activeTab === "upcoming" && !isUpcoming) return false;
    if (activeTab === "ongoing" && !isOngoing) return false;
    if (activeTab === "past" && !isPast) return false;

    if (search) {
      return (b.room_name || "").toLowerCase().includes(search.toLowerCase()) ||
        b.agenda.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const tabCount = (tab: "upcoming" | "ongoing" | "past") =>
    bookings.filter(b => {
      if (tab === "upcoming") return ["confirmed", "pending"].includes(b.status);
      if (tab === "ongoing") return b.status === "ongoing";
      return ["completed", "cancelled", "rejected"].includes(b.status);
    }).length;

  const handleCancel = async (id: string) => {
    setCancelLoading(true);
    try {
      const res = await bookingService.cancel(id, "Dibatalkan oleh pengguna");
      if (res.success) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
        setCancelModal(null);
      }
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan booking");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Booking Saya</h2>
        <p className="text-sm text-gray-500">Kelola semua reservasi ruangan Anda</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama ruangan atau agenda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(["upcoming", "ongoing", "past"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm flex items-center justify-center gap-2 transition-all ${activeTab === tab ? "bg-[#1E3A5F] text-white" : "text-gray-500 hover:bg-gray-50"}`}
              style={{ fontWeight: activeTab === tab ? 600 : 400 }}
            >
              {tab === "upcoming" ? "Akan Datang" : tab === "ongoing" ? "Berlangsung" : "Riwayat"}
              <span className={`text-xs rounded-full px-2 py-0.5 ${activeTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {tabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5">
                <Shimmer className="h-4 w-24 mb-2" />
                <Shimmer className="h-5 w-3/4 mb-2" />
                <Shimmer className="h-3 w-1/2" />
              </div>
            ))
          ) : tabBookings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500" style={{ fontWeight: 500 }}>Tidak ada booking</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === "upcoming" ? "Anda belum memiliki reservasi mendatang" :
                 activeTab === "ongoing" ? "Tidak ada booking yang sedang berlangsung" :
                 "Belum ada riwayat booking"}
              </p>
              {activeTab === "upcoming" && (
                <button onClick={() => onNavigate("rooms")} className="mt-4 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm">
                  Cari & Booking Ruangan
                </button>
              )}
            </div>
          ) : (
            tabBookings.map((booking) => {
              const cfg = statusConfig[booking.status] || statusConfig.completed;
              const mtBadge = meetingTypeBadge[booking.meeting_type || "offline"];
              const zoomStatus = getZoomButtonStatus(booking);

              return (
                <div key={booking.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.text}`} style={{ fontWeight: 500 }}>
                          {cfg.label}
                        </span>
                        {mtBadge && booking.meeting_type && booking.meeting_type !== "offline" && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${mtBadge.bg} ${mtBadge.text} flex items-center gap-1`} style={{ fontWeight: 500 }}>
                            {mtBadge.icon} {mtBadge.label}
                          </span>
                        )}
                      </div>
                      <h4 className="text-gray-800 truncate" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{booking.agenda}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        {booking.room_name && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{booking.room_name} · {booking.building_name || ""}</span>
                          </div>
                        )}
                        {booking.meeting_type === "online" && !booking.room_name && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-500">
                            <Video size={12} className="flex-shrink-0" />
                            <span>Rapat Online (Zoom)</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock size={12} className="text-gray-400 flex-shrink-0" />
                          <span>{booking.start_time} – {booking.end_time}</span>
                        </div>
                      </div>

                      {/* Surat Terkait display */}
                      {booking.surat_terkait && (
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                          📄 <span style={{ fontWeight: 500 }}>Surat Terkait:</span> {booking.surat_terkait}
                        </div>
                      )}

                      {/* Zoom info section */}
                      {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                        <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Video size={14} className="text-indigo-500 flex-shrink-0" />
                            <span className="text-xs text-indigo-700" style={{ fontWeight: 600 }}>Info Zoom Meeting</span>
                          </div>
                          {booking.zoom_passcode && (
                            <div className="text-xs text-indigo-600">
                              Passcode: <span className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded">{booking.zoom_passcode}</span>
                            </div>
                          )}
                          {booking.zoom_host_email && (
                            <div className="text-xs text-indigo-500">Host: {booking.zoom_host_email}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      {/* Zoom Join Button */}
                      {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                        <a
                          href={zoomStatus.enabled ? booking.zoom_join_url : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { if (!zoomStatus.enabled) e.preventDefault(); }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${
                            zoomStatus.enabled
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          title={zoomStatus.label}
                        >
                          <Video size={14} />
                          <span style={{ fontWeight: 500 }}>{zoomStatus.label}</span>
                          {zoomStatus.enabled && <ExternalLink size={12} />}
                        </a>
                      )}

                      {activeTab === "upcoming" && (
                        <button
                          onClick={() => setCancelModal(booking.id)}
                          className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                  {booking.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs text-red-600"><span style={{ fontWeight: 500 }}>Alasan penolakan:</span> {booking.rejection_reason}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>Batalkan Booking?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin membatalkan booking ini? Slot waktu akan dibebaskan.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Tidak, Batal
                </button>
                <button
                  onClick={() => handleCancel(cancelModal)}
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  {cancelLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</>
                  ) : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
