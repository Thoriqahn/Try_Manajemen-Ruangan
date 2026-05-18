import { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, Shield, Filter, Download, RefreshCw } from "lucide-react";
import { auditService } from "../../services/index";

const actionColors: Record<string, string> = {
  FORCE_CANCEL: "bg-red-100 text-red-700",
  UPDATE_POLICY: "bg-purple-100 text-purple-700",
  APPROVE_BOOKING: "bg-green-100 text-green-700",
  CREATE_ROOM: "bg-blue-100 text-blue-700",
  CREATE_BOOKING: "bg-cyan-100 text-cyan-700",
  REVOKE_TOKEN: "bg-orange-100 text-orange-700",
  UPDATE_ROOM: "bg-yellow-100 text-yellow-700",
  REJECT_BOOKING: "bg-red-100 text-red-700",
  DELETE_ROOM: "bg-red-100 text-red-700",
  GENERATE_TOKEN: "bg-green-100 text-green-700",
  REGISTER: "bg-blue-100 text-blue-700",
  LOGIN: "bg-gray-100 text-gray-600",
  UPDATE_USER_ROLE: "bg-purple-100 text-purple-700",
  CANCEL_BOOKING: "bg-orange-100 text-orange-700",
};

import React from "react";

export function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const allActions = [...new Set(logs.map(l => l.action))];

  const load = async (off = 0) => {
    setLoading(true);
    try {
      const res = await auditService.list({
        action: filterAction !== "all" ? filterAction : undefined,
        search: search || undefined,
        limit: LIMIT,
        offset: off,
      });
      setLogs(res.data || []);
      setTotal(res.pagination?.total || (res.data || []).length);
      setOffset(off);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(0); }, [filterAction]);

  const toggleLog = (id: string) => setExpandedLogs(p => p.includes(id) ? p.filter(l => l !== id) : [...p, id]);

  const handleExport = () => {
    const csv = ["Timestamp,Aktor,Tindakan,Resource,IP",
      ...logs.map(l => `"${l.timestamp}","${l.actor_name || l.actor_id}","${l.action}","${l.resource}","${l.ip || ""}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Riwayat Aktivitas (Audit Trail)</h2>
          <p className="text-sm text-gray-500">Jejak aktivitas administratif yang immutable dan read-only</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2">
        <Shield size={16} className="text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500">Log ini bersifat <span style={{ fontWeight: 600 }}>Read-Only dan Immutable</span>. Tidak ada entitas yang dapat mengubah atau menghapus catatan di sini.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari aktor atau resource..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(0)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white" />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white">
          <option value="all">Semua Tindakan</option>
          {allActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => load(0)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Timestamp</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aktor</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Tindakan</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Resource</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center"><Shield size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">Tidak ada log ditemukan</p></td></tr>
              ) : logs.map(log => {
                const isExpanded = expandedLogs.includes(log.id);
                return (
                  <React.Fragment key={log.id}>
                    <tr onClick={() => toggleLog(log.id)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-center">{isExpanded ? <ChevronDown size={14} className="text-gray-400 mx-auto" /> : <ChevronRight size={14} className="text-gray-400 mx-auto" />}</td>
                      <td className="px-4 py-3"><span className="text-xs text-gray-500 font-mono whitespace-nowrap">{log.timestamp || log.created_at}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-700">{log.actor_name || log.actor_id}</span></td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`} style={{ fontWeight: 500 }}>{log.action}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-600 truncate max-w-[200px] block">{log.resource}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-gray-400 font-mono">{log.ip}</span></td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td />
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Detail Aktivitas:</div>
                            {log.detail && <div className="bg-white border border-gray-200 rounded-lg p-3"><p className="text-sm text-gray-700">{log.detail}</p></div>}
                            {(log.before || log.after) && (
                              <div className="grid grid-cols-2 gap-3">
                                {log.before && <div className="bg-red-50 border border-red-100 rounded-lg p-3"><div className="text-xs text-red-500 mb-1" style={{ fontWeight: 600 }}>SEBELUM</div><pre className="text-xs text-gray-600 font-mono overflow-auto">{typeof log.before === "string" ? log.before : JSON.stringify(log.before, null, 2)}</pre></div>}
                                {log.after && <div className="bg-green-50 border border-green-100 rounded-lg p-3"><div className="text-xs text-green-600 mb-1" style={{ fontWeight: 600 }}>SESUDAH</div><pre className="text-xs text-gray-600 font-mono overflow-auto">{typeof log.after === "string" ? log.after : JSON.stringify(log.after, null, 2)}</pre></div>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Menampilkan {logs.length} dari {total} log</p>
        <div className="flex gap-2">
          <button disabled={offset === 0} onClick={() => load(offset - LIMIT)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Sebelumnya</button>
          <button disabled={offset + LIMIT >= total} onClick={() => load(offset + LIMIT)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Selanjutnya →</button>
        </div>
      </div>
    </div>
  );
}
