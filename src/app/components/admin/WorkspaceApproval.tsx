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
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
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
    if (status === "PENDING") return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold uppercase tracking-wider">⏳ Menunggu</span>;
    if (status === "APPROVED") return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold uppercase tracking-wider">✓ Disetujui</span>;
    if (status === "REJECTED") return <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold uppercase tracking-wider">✗ Ditolak</span>;
    return <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-bold uppercase tracking-wider">{status}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Antrean Persetujuan Meja Kerja</h2>
          <p className="text-sm text-gray-500">Kelola permohonan penempatan meja permanen oleh pegawai</p>
        </div>
        <button onClick={fetchRequests} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-shrink-0">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${filter === tab ? "bg-white text-gray-800 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab === "all" ? "Semua" : tab === "pending" ? "Menunggu" : tab === "approved" ? "Disetujui" : "Ditolak"}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === "pending" ? "bg-yellow-100 text-yellow-700" :
                tab === "approved" ? "bg-green-100 text-green-700" :
                tab === "rejected" ? "bg-red-100 text-red-600" :
                "bg-gray-200 text-gray-600"
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Pegawai</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aset & Ruang Kerja</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Kode Meja</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Tanggal Pengajuan</th>
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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                    Tidak ada permohonan penempatan meja kerja yang ditemukan.
                  </td>
                </tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs flex-shrink-0 font-semibold">
                        {(req.user_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-gray-700 font-semibold">{req.user_name}</div>
                        <div className="text-xs text-gray-400">{req.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-gray-700 font-semibold">{req.room_name}</div>
                    <div className="text-xs text-gray-400">{req.floor_name} · {req.building_name}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded">
                      {req.desk_id}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {new Date(req.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </td>
                  <td className="px-5 py-4">
                    {statusBadge(req.status)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 justify-end">
                      {req.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                          >
                            <Check size={12} /> Setujui
                          </button>
                          <button
                            onClick={() => setRejectModal(req.id)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                          >
                            <X size={12} /> Tolak
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-gray-800 font-bold">Tolak Pengajuan Tempat Duduk?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Silakan masukkan alasan penolakan untuk pegawai bersangkutan secara jelas dan transparan.
            </p>
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase">Alasan Penolakan <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Meja ini sementara diprioritaskan untuk tim logistik (minimal 10 karakter)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white"
              />
              <div className="text-[10px] text-right font-medium text-gray-400">
                Karakter: <span className={rejectReason.trim().length >= 10 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{rejectReason.trim().length}</span> / 10 min
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={rejectReason.trim().length < 10 || actionLoading !== null}
                className={`flex-1 py-2.5 rounded-lg text-sm text-white font-bold ${
                  rejectReason.trim().length >= 10 && actionLoading === null
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                }`}
              >
                Tolak Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
