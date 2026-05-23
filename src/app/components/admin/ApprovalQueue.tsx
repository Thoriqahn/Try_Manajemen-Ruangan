import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, Video, FileText } from "lucide-react";
import { bookingService } from "../../services/bookingService";

import { userService } from "../../services/index";

interface ApprovalQueueProps {
  onNavigate: (page: string, data?: any) => void;
  isSuperAdmin?: boolean;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export function ApprovalQueue({ onNavigate, isSuperAdmin = false }: ApprovalQueueProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("pending");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedApprovalBooking, setSelectedApprovalBooking] = useState<any>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Fetch ALL bookings so counts remain accurate across all tabs
      const res = await bookingService.list({ 
        admin_id: selectedAdminFilter || undefined,
        managed_only: "true"
      });
      if (res.success) setBookings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      userService.list({ role: "admin" })
        .then(res => setAdminList(res.data || []))
        .catch(err => console.error("Failed to load admin list:", err));
    }
  }, [isSuperAdmin]);

  // Only refetch when selectedAdminFilter changes. filter change is handled locally.
  useEffect(() => { fetchBookings(); }, [selectedAdminFilter]);

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

  const meetingTypeBadge = (type?: string) => {
    if (!type || type === 'offline') return null;
    if (type === 'online') return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full flex items-center gap-1" style={{ fontWeight: 500 }}>💻 Online</span>;
    return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full flex items-center gap-1" style={{ fontWeight: 500 }}>🔄 Hybrid</span>;
  };

  const displayedBookings = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

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

      {/* Status & Admin Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-shrink-0">
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

        {/* SuperAdmin Admin Filter dropdown */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Filter Admin:</span>
            <select
              value={selectedAdminFilter}
              onChange={(e) => setSelectedAdminFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 outline-none focus:border-blue-400 min-w-[200px]"
            >
              <option value="">Semua Admin Ruangan</option>
              {adminList.map((admin) => (
                <option key={admin.id} value={admin.id}>{admin.name}</option>
              ))}
            </select>
          </div>
        )}
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
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Tipe</th>
                {isSuperAdmin && <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Admin Ruangan</th>}
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Status</th>
                <th className="text-right px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isSuperAdmin ? 7 : 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Shimmer className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : displayedBookings.map((booking) => (
                <tr key={booking.id} onClick={() => setSelectedApprovalBooking(booking)} className="hover:bg-gray-50 transition-colors cursor-pointer">
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
                    <div className="text-sm text-gray-600 max-w-[200px]">
                      <div className="truncate">{booking.agenda}</div>
                      {booking.surat_terkait && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] text-gray-400 bg-gray-50 rounded px-1.5 py-1 border border-gray-100">
                          <FileText size={10} className="text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{booking.surat_terkait}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {meetingTypeBadge(booking.meeting_type)}
                    {(!booking.meeting_type || booking.meeting_type === 'offline') && (
                      <span className="text-xs text-gray-400">🏢 Offline</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-5 py-4">
                      <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{booking.admin_names || "Tidak ada admin"}</div>
                    </td>
                  )}
                  <td className="px-5 py-4">{statusBadge(booking.status)}</td>
                  <td className="px-5 py-4">
                    {booking.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(booking.id); }}
                          disabled={actionLoading === booking.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === booking.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                          Setujui
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRejectModal(booking.id); }}
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

          {!loading && displayedBookings.length === 0 && (
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

      {/* Modal Detail Approval */}
      {selectedApprovalBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedApprovalBooking(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-800">Detail Pengajuan Peminjaman</h3>
              <button onClick={() => setSelectedApprovalBooking(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedApprovalBooking.agenda}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {statusBadge(selectedApprovalBooking.status)}
                  <span className="text-sm text-gray-500">• {selectedApprovalBooking.user_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informasi Waktu & Tempat</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-700 bg-blue-100 px-1.5 rounded">{selectedApprovalBooking.room_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Tanggal: <span className="font-medium">{selectedApprovalBooking.date}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400 flex-shrink-0" />
                      <span>{selectedApprovalBooking.start_time} - {selectedApprovalBooking.end_time}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kebutuhan Rapat</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>Peserta: <span className="font-medium">{selectedApprovalBooking.participants || 0} Orang</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Tipe Meeting: {meetingTypeBadge(selectedApprovalBooking.meeting_type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Layout: <span className="font-medium">{selectedApprovalBooking.layout_type || "Standard"}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedApprovalBooking.surat_terkait && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 border-b pb-2">Dokumen Surat Terkait</h4>
                  <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-t-lg">
                    <FileText size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">{selectedApprovalBooking.surat_terkait}</span>
                  </div>
                  <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden h-[400px]">
                    <iframe 
                      src={selectedApprovalBooking.surat_terkait.endsWith('.pdf') ? selectedApprovalBooking.surat_terkait : '/dummy-surat.pdf'} 
                      className="w-full h-full"
                      title="PDF Reader"
                    />
                  </div>
                </div>
              )}

              {selectedApprovalBooking.facilities && Object.keys(selectedApprovalBooking.facilities).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Permintaan Fasilitas Tambahan</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedApprovalBooking.facilities).map(([k, v]) => {
                      const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <span key={k} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium">
                          {formatted} <span className="text-gray-500">({v as number})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedApprovalBooking.snacks && selectedApprovalBooking.snacks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Pesanan Konsumsi</h4>
                  <div className="flex flex-col gap-2">
                    {selectedApprovalBooking.snacks.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 border border-orange-100 rounded-lg">
                        <span className="text-sm text-orange-900 font-medium">{s.type === 'snack' ? 'Snack Box' : s.type === 'meal' ? 'Makan Siang' : 'Kopi/Teh'}</span>
                        <span className="text-xs px-2 py-1 bg-white rounded text-orange-700 font-bold">{s.quantity} porsi</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApprovalBooking.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 border-b pb-2">Catatan Pemohon</h4>
                  <p className="text-sm text-gray-600 bg-yellow-50/50 p-4 rounded-lg italic border border-yellow-100">
                    "{selectedApprovalBooking.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedApprovalBooking(null)} 
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Tutup
              </button>
              {selectedApprovalBooking.status === "pending" && (
                <>
                  <button 
                    onClick={() => {
                      setRejectModal(selectedApprovalBooking.id);
                      setSelectedApprovalBooking(null);
                    }}
                    className="px-4 py-2 border border-red-200 text-red-600 bg-white rounded-lg text-sm hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <X size={16} /> Tolak
                  </button>
                  <button 
                    onClick={() => {
                      handleApprove(selectedApprovalBooking.id);
                      setSelectedApprovalBooking(null);
                    }}
                    disabled={actionLoading === selectedApprovalBooking.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading === selectedApprovalBooking.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                    Setujui
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
