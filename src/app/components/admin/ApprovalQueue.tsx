import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, Video, FileText } from "lucide-react";
import { bookingService } from "../../services/bookingService";

import { userService } from "../../services/index";

interface ApprovalQueueProps {
  onNavigate: (page: string, data?: any) => void;
  isSuperAdmin?: boolean;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

export function ApprovalQueue({ onNavigate, isSuperAdmin = false }: ApprovalQueueProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "ongoing" | "rejected">("pending");
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
    ongoing: bookings.filter(b => b.status === "ongoing").length,
    rejected: bookings.filter(b => b.status === "rejected").length,
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <span className="px-2.5 py-1 bg-amber-100/90 text-amber-700 border border-amber-200 text-[10px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/30">⏳ Menunggu</span>;
    if (status === "confirmed") return <span className="px-2.5 py-1 bg-emerald-100/90 text-emerald-700 border border-emerald-200 text-[10px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30">✓ Disetujui</span>;
    if (status === "ongoing") return <span className="px-2.5 py-1 bg-indigo-100/90 text-indigo-700 border border-indigo-200 text-[10px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/30">▶ Berlangsung</span>;
    return <span className="px-2.5 py-1 bg-rose-100/90 text-rose-700 border border-rose-200 text-[10px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30">✗ Ditolak</span>;
  };

  const meetingTypeBadge = (type?: string) => {
    if (!type || type === 'offline') return null;
    if (type === 'online') return <span className="px-2.5 py-1 bg-indigo-100/90 text-indigo-700 border border-indigo-200 text-[10px] rounded-md flex items-center gap-1.5 font-bold tracking-wider uppercase backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/30">💻 Online</span>;
    return <span className="px-2.5 py-1 bg-purple-100/90 text-purple-700 border border-purple-200 text-[10px] rounded-md flex items-center gap-1.5 font-bold tracking-wider uppercase backdrop-blur-sm transition-colors whitespace-nowrap w-max dark:bg-purple-500/30 dark:text-purple-400 dark:border-purple-500/30">🔄 Hybrid</span>;
  };

  const displayedBookings = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Antrean Persetujuan</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 transition-colors dark:text-slate-400">Kelola permohonan booking yang memerlukan validasi</p>
        </div>
        <button onClick={fetchBookings} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 bg-white hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-slate-700" title="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Status & Admin Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-fit max-w-full flex-shrink-0 backdrop-blur-md shadow-inner transition-colors overflow-x-auto custom-scrollbar dark:bg-slate-800/80">
          <button onClick={() => setFilter("all")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === "all" ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
            Semua<span className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider transition-colors bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-500">{counts.all}</span>
          </button>
          <button onClick={() => setFilter("pending")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === "pending" ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
            Menunggu<span className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider transition-colors bg-amber-100 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">{counts.pending}</span>
          </button>
          <button onClick={() => setFilter("confirmed")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === "confirmed" ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
            Disetujui<span className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider transition-colors bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">{counts.confirmed}</span>
          </button>
          <button onClick={() => setFilter("ongoing")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === "ongoing" ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
            Berlangsung<span className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider transition-colors bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">{counts.ongoing}</span>
          </button>
          <button onClick={() => setFilter("rejected")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === "rejected" ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
            Ditolak<span className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider transition-colors bg-rose-100 dark:bg-rose-500/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">{counts.rejected}</span>
          </button>
        </div>

        {/* SuperAdmin Admin Filter dropdown */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-slate-200 transition-colors dark:bg-slate-800/50 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2 transition-colors dark:text-slate-400">Filter Admin:</span>
            <select
              value={selectedAdminFilter}
              onChange={(e) => setSelectedAdminFilter(e.target.value)}
              className="px-4 py-2 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none focus:ring-0 min-w-[200px] transition-colors dark:text-slate-200"
            >
              <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Semua Admin Ruangan</option>
              {adminList.map((admin) => (
                <option key={admin.id} value={admin.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{admin.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900/90 dark:border-slate-800">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 transition-colors dark:bg-slate-800/80 dark:border-slate-800">
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Pemohon</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Ruangan</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Waktu</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Agenda</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Tipe</th>
                {isSuperAdmin && <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Admin Ruangan</th>}
                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Status</th>
                <th className="text-right px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 transition-colors duration-300">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isSuperAdmin ? 7 : 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5"><Shimmer className="h-5 w-full rounded-md" /></td>
                    ))}
                  </tr>
                ))
              ) : displayedBookings.map((booking) => (
                <tr key={booking.id} onClick={() => setSelectedApprovalBooking(booking)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-emerald-500 dark:to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-indigo-500/20 dark:shadow-emerald-500/20 flex-shrink-0 transition-colors group-hover:scale-105 duration-300">
                        {(booking.user_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 transition-colors group-hover:text-indigo-600 dark:group-hover:text-emerald-400 dark:text-indigo-400">{booking.user_name}</div>
                        <div className="text-[11px] font-medium text-slate-500 transition-colors mt-0.5 dark:text-slate-400">{booking.participants} peserta</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{booking.room_name}</div>
                    <div className="text-[11px] font-medium text-slate-500 transition-colors mt-0.5 dark:text-slate-400">
                      {(booking.building_name || booking.floor_name) ? `Gedung: ${booking.building_name || '-'} | Lantai: ${booking.floor_name || '-'}` : 'Lokasi tidak tersedia'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-700 transition-colors dark:text-slate-200">{booking.date}</div>
                    <div className="text-[11px] font-medium text-slate-500 transition-colors mt-0.5 dark:text-slate-400">{booking.start_time} – {booking.end_time}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-slate-600 max-w-[200px] transition-colors dark:text-slate-300">
                      <div className="truncate">{booking.agenda}</div>
                      {booking.surat_terkait && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 rounded-md px-2 py-1 border border-slate-200 transition-colors dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50">
                          <FileText size={12} className="text-indigo-500 flex-shrink-0 transition-colors duration-300 dark:text-emerald-400" />
                          <span className="truncate max-w-[120px] font-bold">{booking.surat_terkait}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {meetingTypeBadge(booking.meeting_type)}
                    {(!booking.meeting_type || booking.meeting_type === 'offline') && (
                      <span className="px-2.5 py-1 bg-slate-100/90 text-slate-600 border border-slate-200 text-[10px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors flex items-center gap-1.5 w-fit dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">🏢 Fisik</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-5">
                      <div className="text-sm font-medium text-slate-700 transition-colors dark:text-slate-300">{booking.admin_names || "Tidak ada admin"}</div>
                    </td>
                  )}
                  <td className="px-6 py-5">{statusBadge(booking.status)}</td>
                  <td className="px-6 py-5">
                    {booking.status === "pending" && (
                      <div className="flex gap-3 justify-end opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(booking.id); }}
                          disabled={actionLoading === booking.id}
                          className="px-4 py-2 text-xs bg-emerald-50 hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                          Setuju
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRejectModal(booking.id); }}
                          className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 disabled:opacity-50"
                        >
                          <X size={14} />
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
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner transition-colors dark:bg-slate-800">
                <Clock size={32} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" />
              </div>
              <h3 className="text-slate-800 font-bold text-lg mb-2 transition-colors dark:text-slate-100">Tidak ada permohonan</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed transition-colors dark:text-slate-400">Antrean kosong untuk kategori ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 transition-colors dark:bg-slate-900/50 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shadow-inner transition-colors dark:bg-rose-500/30">
                  <X size={24} className="text-rose-500 transition-colors duration-300 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Tolak Permohonan</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">Berikan alasan penolakan yang jelas.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-[11px] uppercase tracking-wider text-slate-600 font-bold mb-2 transition-colors dark:text-slate-300">Alasan Penolakan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan (minimal 10 karakter)..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/10 bg-slate-50 text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 resize-none transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700"
              />
              <p className={`text-[10px] font-bold mt-2 text-right transition-colors ${rejectReason.length >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                {rejectReason.length}/10 karakter minimum
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 transition-colors dark:bg-slate-900/50 dark:border-slate-800">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Batal</button>
              <button
                onClick={handleReject}
                disabled={rejectReason.trim().length < 10 || actionLoading === rejectModal}
                className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-rose-500/20 active:scale-95 dark:bg-rose-600"
              >
                {actionLoading === rejectModal ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Approval */}
      {selectedApprovalBooking && (() => {
        const getNormalizedFacilities = (facs: any) => {
          if (!facs) return {};
          if (typeof facs === 'string') { try { facs = JSON.parse(facs); } catch(e) { return {}; } }
          if (Array.isArray(facs)) {
            const obj: Record<string, number> = {};
            for (const f of facs) { obj[f.facility_type || f.type || f.name] = f.quantity || f.qty || 0; }
            return obj;
          }
          return facs;
        };
        const getNormalizedSnacks = (snacks: any) => {
          if (!snacks) return [];
          if (typeof snacks === 'string') { try { return JSON.parse(snacks); } catch(e) { return []; } }
          if (Array.isArray(snacks)) return snacks;
          return [];
        };
        const normalizedFacilities = getNormalizedFacilities(selectedApprovalBooking.facilities);
        const normalizedSnacks = getNormalizedSnacks(selectedApprovalBooking.snacks);

        return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[50] p-4 animate-in fade-in duration-200" onClick={() => setSelectedApprovalBooking(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md transition-colors dark:bg-slate-900/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors duration-300 dark:bg-emerald-500/30 dark:text-emerald-400">
                  <FileText size={20} />
                </div>
                <h3 className="font-extrabold text-lg text-slate-800 tracking-tight transition-colors dark:text-slate-100">Detail Pengajuan Peminjaman</h3>
              </div>
              <button onClick={() => setSelectedApprovalBooking(null)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors dark:text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8 custom-scrollbar">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{selectedApprovalBooking.agenda}</h2>
                <div className="flex items-center gap-3 mt-3">
                  {statusBadge(selectedApprovalBooking.status)}
                  <span className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">• Oleh <span className="text-slate-700 font-bold transition-colors duration-300 dark:text-slate-300">{selectedApprovalBooking.user_name}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-4 shadow-sm transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors duration-300 dark:text-slate-500">Informasi Waktu & Tempat</h4>
                  <div className="space-y-3 text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-300">
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex px-2.5 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold tracking-wider uppercase rounded-md backdrop-blur-sm transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30 w-fit">{selectedApprovalBooking.room_name}</span>
                      {(selectedApprovalBooking.building_name || selectedApprovalBooking.floor_name) && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Gedung: {selectedApprovalBooking.building_name || '-'} | Lantai: {selectedApprovalBooking.floor_name || '-'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 transition-colors duration-300 dark:text-slate-400">Tanggal:</span> <span className="font-bold text-slate-800 transition-colors duration-300 dark:text-slate-100">{selectedApprovalBooking.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-indigo-400 flex-shrink-0 transition-colors duration-300 dark:text-emerald-400" />
                      <span className="font-bold text-slate-800 transition-colors duration-300 dark:text-slate-100">{selectedApprovalBooking.start_time} - {selectedApprovalBooking.end_time}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-4 shadow-sm transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors duration-300 dark:text-slate-500">Kebutuhan Rapat</h4>
                  <div className="space-y-3 text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 transition-colors duration-300 dark:text-slate-400">Peserta:</span> <span className="font-bold text-slate-800 transition-colors duration-300 dark:text-slate-100">{selectedApprovalBooking.participants || 0} Orang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 transition-colors duration-300 dark:text-slate-400">Tipe Meeting:</span> {meetingTypeBadge(selectedApprovalBooking.meeting_type)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 transition-colors duration-300 dark:text-slate-400">Layout:</span> <span className="font-bold text-slate-800 transition-colors duration-300 dark:text-slate-100">{selectedApprovalBooking.layout_type || "Standard"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedApprovalBooking.surat_terkait && (
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 transition-colors dark:bg-slate-800/30 dark:border-slate-700">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 transition-colors duration-300 dark:text-slate-400">Dokumen Surat Terkait</h4>
                  <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-colors dark:bg-slate-800 dark:border-slate-700">
                    <div className="p-2 bg-indigo-50 rounded-lg transition-colors duration-300 dark:bg-emerald-500/30">
                      <FileText size={20} className="text-indigo-500 flex-shrink-0 transition-colors duration-300 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-700 font-bold mt-1.5 truncate max-w-full transition-colors duration-300 dark:text-slate-200">{selectedApprovalBooking.surat_terkait}</span>
                  </div>
                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden h-[400px] shadow-inner transition-colors duration-300 dark:border-slate-700">
                    <iframe 
                      src={selectedApprovalBooking.surat_terkait.endsWith('.pdf') ? selectedApprovalBooking.surat_terkait : '/dummy-surat.pdf'} 
                      className="w-full h-full bg-slate-100 transition-colors duration-300 dark:bg-slate-900"
                      title="PDF Reader"
                    />
                  </div>
                </div>
              )}

              {normalizedFacilities && Object.keys(normalizedFacilities).length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 transition-colors dark:text-slate-400 dark:border-slate-800">Permintaan Fasilitas Tambahan</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(normalizedFacilities).map(([k, v]) => {
                      const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <span key={k} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-bold shadow-sm transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                          {formatted} <span className="text-slate-400 font-medium ml-1 transition-colors duration-300 dark:text-slate-500">({v as number})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FEATURE: Pesanan Konsumsi (Snacks) */}
              {normalizedSnacks && normalizedSnacks.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 transition-colors dark:text-slate-400 dark:border-slate-800">Pesanan Konsumsi</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {normalizedSnacks.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-orange-50/80 border border-orange-200 rounded-xl shadow-sm transition-colors dark:bg-orange-500/30 dark:border-orange-500/20">
                        <span className="text-sm text-orange-900 font-bold transition-colors duration-300 dark:text-orange-400">{s.type === 'snack' ? 'Snack Box' : s.type === 'meal' ? 'Makan Siang' : 'Kopi/Teh'}</span>
                        <span className="text-[10px] px-2.5 py-1 bg-white/80 rounded-md text-orange-700 font-bold uppercase tracking-wider shadow-sm transition-colors duration-300 dark:bg-orange-500/30 dark:text-orange-300">{s.quantity} porsi</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApprovalBooking.notes && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 transition-colors dark:text-slate-400 dark:border-slate-800">Catatan Pemohon</h4>
                  <p className="text-sm font-medium text-slate-600 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/50 italic leading-relaxed shadow-sm transition-colors dark:bg-amber-500/30 dark:text-slate-300 dark:border-amber-500/20">
                    "{selectedApprovalBooking.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3 transition-colors dark:bg-slate-900/50 dark:border-slate-800">
              <button 
                onClick={() => setSelectedApprovalBooking(null)} 
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
                    className="px-5 py-2.5 text-sm bg-rose-50 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                  >
                    <X size={16} /> Tolak
                  </button>
                  <button 
                    onClick={() => {
                      handleApprove(selectedApprovalBooking.id);
                      setSelectedApprovalBooking(null);
                    }}
                    disabled={actionLoading === selectedApprovalBooking.id}
                    className="px-5 py-2.5 text-sm bg-emerald-50 hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 disabled:opacity-50"
                  >
                    {actionLoading === selectedApprovalBooking.id ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                    Setujui
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}
