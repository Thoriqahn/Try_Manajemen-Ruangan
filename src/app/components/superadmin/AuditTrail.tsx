import { useState } from "react";
import React from "react";
import { Search, ChevronDown, ChevronRight, Shield, Filter, Download } from "lucide-react";
import { mockAuditLogs } from "../shared/mockData";

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
};

export function AuditTrail() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<string[]>([]);

  const toggleLog = (id: string) => {
    setExpandedLogs(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const actions = ["all", ...Array.from(new Set(mockAuditLogs.map(l => l.action)))];

  const filtered = mockAuditLogs.filter(log => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (search && !log.actor.toLowerCase().includes(search.toLowerCase()) && !log.resource.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Riwayat Aktivitas (Audit Trail)</h2>
          <p className="text-sm text-gray-500">Jejak aktivitas administratif yang immutable dan read-only</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Read-only notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2">
        <Shield size={16} className="text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Log ini bersifat <span style={{ fontWeight: 600 }}>Read-Only dan Immutable</span>. Tidak ada satu pun entitas yang dapat mengubah atau menghapus catatan di sini, termasuk Super Admin.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari aktor atau resource..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white" />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white">
          <option value="all">Semua Tindakan</option>
          {actions.filter(a => a !== "all").map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Log table */}
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
              {filtered.map((log) => {
                const isExpanded = expandedLogs.includes(log.id);
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleLog(log.id)}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-center">
                        {isExpanded ? <ChevronDown size={14} className="text-gray-400 mx-auto" /> : <ChevronRight size={14} className="text-gray-400 mx-auto" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{log.actor}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`} style={{ fontWeight: 500 }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 truncate max-w-[200px] block">{log.resource}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">{log.ip}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td />
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Detail Aktivitas:</div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <p className="text-sm text-gray-700">{log.detail}</p>
                            </div>
                            {log.action.includes("UPDATE") && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                  <div className="text-xs text-red-500 mb-1" style={{ fontWeight: 600 }}>SEBELUM</div>
                                  <p className="text-xs text-gray-600 font-mono">{`{ "value": "lama" }`}</p>
                                </div>
                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                  <div className="text-xs text-green-600 mb-1" style={{ fontWeight: 600 }}>SESUDAH</div>
                                  <p className="text-xs text-gray-600 font-mono">{`{ "value": "baru" }`}</p>
                                </div>
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
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Shield size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada log ditemukan</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Menampilkan {filtered.length} dari {mockAuditLogs.length} log · Data tersimpan secara permanen sesuai kebijakan retensi
      </p>
    </div>
  );
}
