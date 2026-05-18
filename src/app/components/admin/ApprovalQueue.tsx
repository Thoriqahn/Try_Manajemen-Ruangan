import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw } from "lucide-react";
import { bookingService } from "../../services/bookingService";

interface ApprovalQueueProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export function ApprovalQueue({ onNavigate }: ApprovalQueueProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("pending");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Fetch pending + all for different tabs
      const res = await bookingService.list({ status: filter === "all" ? undefined : filter });
      if (res.success) setBookings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [filter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await bookingService.approve(id);
      if (res.success) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "confirmed" } : b));
      }
    } catch (err: any) {
      alert(err.message || "Gagal menyetujui booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || rejectReason.trim().length < 10) return;
    setActionLoading(rejectModal);
    try {
      const res = await bookingService.reject(rejectModal, rejectReason);
      if (res.success) {
        setBookings(prev => prev.map(b => b.id === rejectModal ? { ...b, status: "rejected" } : b));
        setRejectModal(null);
        setRejectReason("");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menolak booking");
    } finally {
      setActionLoading(null);
    }
  };

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    rejected: bookings.filter(b => b.status === "rejected").length,
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full" style={{ fontWeight: 500 }}>⏳ Menunggu</span>;
    if (status === "confirmed") return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full" style={{ fontWeight: 500 }}>✓ Disetujui</span>;
    return <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs rounded-full" style={{ fontWeight: 500 }}>✗ Ditolak</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Antrean Persetujuan</h2>
          <p className="text-sm text-gray-500">Kelola permohonan booking yang memerlukan validasi</p>
        </div>
        <button onClick={fetchBookings} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["all", "pending", "confirmed", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${filter === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={{ fontWeight: filter === tab ? 600 : 400 }}
          >
            {tab === "all" ? "Semua" : tab === "pending" ? "Menunggu" : tab === "confirmed" ? "Disetujui" : "Ditolak"}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === "pending" ? "bg-yellow-100 text-yellow-700" :
              tab === "confirmed" ? "bg-green-100 text-green-700" :
              tab === "rejected" ? "bg-red-100 text-red-600" :
              "bg-gray-200 text-gray-600"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Pemohon</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Ruangan</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Waktu</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Agenda</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Status</th>
                <th className="text-right px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Shimmer className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
                        {(booking.user_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{booking.user_name}</div>
                        <div className="text-xs text-gray-400">{booking.participants} peserta</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{booking.room_name}</div>
                    <div className="text-xs text-gray-400">{booking.floor_name} · {booking.building_name}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-gray-700">{booking.date}</div>
                    <div className="text-xs text-gray-400">{booking.start_time} – {booking.end_time}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-gray-600 max-w-[160px] truncate">{booking.agenda}</div>
                  </td>
                  <td className="px-5 py-4">{statusBadge(booking.status)}</td>
                  <td className="px-5 py-4">
                    {booking.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === booking.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                          Setujui
                        </button>
                        <button
                          onClick={() => setRejectModal(booking.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 text-xs rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X size={13} />
                          Tolak
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && bookings.length === 0 && (
            <div className="py-16 text-center">
              <Clock size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada permohonan di kategori ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                  <X size={18} className="text-red-500" />
                </div>
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Tolak Permohonan</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">Berikan alasan penolakan yang jelas kepada pemohon.</p>
            </div>
            <div className="p-6">
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Alasan Penolakan <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan (minimal 10 karakter)..."
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 resize-none"
              />
              <p className={`text-xs mt-1 text-right ${rejectReason.length >= 10 ? "text-green-600" : "text-gray-400"}`}>
                {rejectReason.length}/10 karakter minimum
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button
                onClick={handleReject}
                disabled={rejectReason.trim().length < 10 || actionLoading === rejectModal}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === rejectModal ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
