import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, UserCheck, AlertTriangle, ShieldCheck, HelpCircle, Eye } from "lucide-react";
import { workspaceService, SeatingRequest } from "../../services/workspaceService";
import { userService } from "../../services/index";
import { toast } from "sonner";

interface WorkspaceApprovalProps {
  onNavigate: (page: string, data?: any) => void;
  isSuperAdmin?: boolean;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />
);

export function WorkspaceApproval({ onNavigate, isSuperAdmin = false }: WorkspaceApprovalProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [requests, setRequests] = useState<SeatingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await workspaceService.listRequests();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat antrean persetujuan meja.");
      console.error(err);
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
    fetchRequests();
  }, [isSuperAdmin]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await workspaceService.approveRequest(id);
      if (res.success) {
        toast.success("Pengajuan penempatan meja berhasil disetujui!");
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r));
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui pengajuan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (rejectReason.trim().length < 10) {
      toast.error("Alasan penolakan wajib diisi, minimal 10 karakter.");
      return;
    }
    setActionLoading(rejectModal);
    try {
      const res = await workspaceService.rejectRequest(rejectModal, rejectReason);
      if (res.success) {
        toast.success("Pengajuan penempatan meja berhasil ditolak.");
        setRequests(prev => prev.map(r => r.id === rejectModal ? { ...r, status: "REJECTED" } : r));
        setRejectModal(null);
        setRejectReason("");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak pengajuan");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter requests locally based on state filter
  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    return r.status.toLowerCase() === filter;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length,
  };

  const statusBadge = (status: string) => {
    if (status === "PENDING") return <span className="whitespace-nowrap px-3 py-1.5 bg-amber-100/90 text-amber-700 border border-amber-200 text-[10px] rounded-lg font-bold uppercase tracking-widest backdrop-blur-sm transition-colors dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/30">⏳ Menunggu</span>;
    if (status === "APPROVED") return <span className="whitespace-nowrap px-3 py-1.5 bg-emerald-100/90 text-emerald-700 border border-emerald-200 text-[10px] rounded-lg font-bold uppercase tracking-widest backdrop-blur-sm transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30">✓ Disetujui</span>;
    if (status === "REJECTED") return <span className="whitespace-nowrap px-3 py-1.5 bg-rose-100/90 text-rose-700 border border-rose-200 text-[10px] rounded-lg font-bold uppercase tracking-widest backdrop-blur-sm transition-colors dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30">✗ Ditolak</span>;
    return <span className="whitespace-nowrap px-3 py-1.5 bg-slate-100/90 text-slate-500 border border-slate-200 text-[10px] rounded-lg font-bold uppercase tracking-widest backdrop-blur-sm transition-colors dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700">{status}</span>;
  };

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Antrean Persetujuan Meja</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">Kelola permohonan penempatan meja permanen oleh pegawai</p>
        </div>
        <button onClick={fetchRequests} className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 bg-white/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-95 border border-slate-200/50 dark:bg-slate-900 dark:text-indigo-400 dark:border-slate-700/50" title="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-fit flex-shrink-0 backdrop-blur-md border border-slate-200/50 transition-colors overflow-x-auto custom-scrollbar max-w-full dark:bg-slate-900/50 dark:border-slate-800">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${filter === tab ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm font-bold border border-slate-200 dark:border-slate-700" : "text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"}`}
            >
              {tab === "all" ? "Semua" : tab === "pending" ? "Menunggu" : tab === "approved" ? "Disetujui" : "Ditolak"}
              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold shadow-inner ${
                tab === "pending" ? "bg-amber-100 dark:bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400" :
                tab === "approved" ? "bg-emerald-100 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400" :
                tab === "rejected" ? "bg-rose-100 dark:bg-rose-500/20 dark:bg-rose-500/30 text-rose-700 dark:text-rose-400" :
                "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table container */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm transition-colors dark:bg-slate-900/90 dark:border-slate-800">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 transition-colors dark:bg-slate-800/50 dark:border-slate-800">
                <th className="text-left px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Pegawai</th>
                <th className="text-left px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Aset & Ruang Kerja</th>
                <th className="text-left px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Kode Meja</th>
                <th className="text-left px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Tanggal Pengajuan</th>
                <th className="text-left px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Status</th>
                <th className="text-right px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest transition-colors duration-300 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 transition-colors duration-300">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5"><Shimmer className="h-5 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors dark:bg-slate-800"><ShieldCheck size={24} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /></div>
                    <p className="text-slate-800 font-bold text-lg mb-1 transition-colors dark:text-slate-100">Tidak ada permohonan</p>
                    <p className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">Belum ada permohonan penempatan meja kerja yang masuk.</p>
                  </td>
                </tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold flex-shrink-0 shadow-inner transition-colors dark:bg-indigo-500/30 dark:text-indigo-400">
                        {(req.user_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{req.user_name}</div>
                        <div className="text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">{req.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{req.room_name}</div>
                    <div className="text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">{req.floor_name} • {req.building_name}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition-colors dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20">
                      {req.desk_id}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">
                    {new Date(req.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </td>
                  <td className="px-6 py-5">
                    {statusBadge(req.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-3 justify-end transition-opacity">
                      {req.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading !== null}
                            className="px-4 py-2 text-xs bg-emerald-50 hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                          >
                            <Check size={14} /> Setujui
                          </button>
                          <button
                            onClick={() => setRejectModal(req.id)}
                            disabled={actionLoading !== null}
                            className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                          >
                            <X size={14} /> Tolak
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 italic px-4 py-2 transition-colors dark:text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal dialog */}
      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 transition-colors dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shadow-inner transition-colors dark:bg-rose-500/30">
                  <AlertTriangle size={24} className="text-rose-500 transition-colors duration-300 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Tolak Pengajuan?</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 transition-colors dark:text-slate-500">Penempatan Meja Kerja</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm font-medium text-slate-600 leading-relaxed transition-colors dark:text-slate-400">
                Silakan masukkan alasan penolakan untuk pegawai bersangkutan secara jelas dan transparan.
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Alasan Penolakan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Meja ini sementara diprioritaskan untuk tim logistik (minimal 10 karakter)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/10 bg-slate-50 text-slate-800 resize-none transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700"
                />
                <div className="text-xs mt-2 font-bold text-right transition-colors text-slate-400 dark:text-slate-500">
                  Karakter: <span className={rejectReason.trim().length >= 10 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>{rejectReason.trim().length}</span> / 10 min
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 transition-colors dark:bg-slate-800/30 dark:border-slate-800">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={rejectReason.trim().length < 10 || actionLoading !== null}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 ${
                  rejectReason.trim().length >= 10 && actionLoading === null
                    ? "bg-rose-500 dark:bg-rose-600 hover:bg-rose-600 text-white hover:shadow-rose-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                }`}
              >
                {actionLoading === rejectModal ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memproses...</> : "Tolak Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
