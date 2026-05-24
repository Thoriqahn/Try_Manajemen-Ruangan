import { useState, useEffect } from "react";
import { TrendingUp, Users, Clock, AlertTriangle, BarChart2, Calendar, RefreshCw } from "lucide-react";
import { statsService } from "../../services/index";

interface AdminDashboardProps {
  onNavigate: (page: string, data?: any) => void;
  isSuperAdmin?: boolean;
}

const busyHours = [
  { hour: "07-08", pct: 10 }, { hour: "08-09", pct: 35 }, { hour: "09-10", pct: 75 },
  { hour: "10-11", pct: 90 }, { hour: "11-12", pct: 80 }, { hour: "12-13", pct: 30 },
  { hour: "13-14", pct: 70 }, { hour: "14-15", pct: 85 }, { hour: "15-16", pct: 65 },
  { hour: "16-17", pct: 40 }, { hour: "17-18", pct: 15 },
];

// Shimmer placeholder
const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

export function AdminDashboard({ onNavigate, isSuperAdmin = false }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const { statsService } = await import("../../services/index");
      const res = await statsService.admin(selectedAdminFilter || undefined);
      if (res.success) setStats(res.data);
    } catch (err: any) {
      setError("Gagal memuat statistik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      import("../../services/index").then(({ userService }) => {
        userService.list({ role: "admin" }).then(res => setAdminList(res.data || []));
      });
    }
  }, [isSuperAdmin]);

  useEffect(() => { fetchStats(); }, [selectedAdminFilter]);

  const statCards = stats ? [
    { icon: <Calendar size={24} className="text-indigo-500 transition-colors duration-300 dark:text-indigo-400" />, label: "Booking Minggu Ini", value: stats.weeklyBookings, bg: "bg-indigo-50 dark:bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30", border: "border-indigo-100 dark:border-indigo-500/20" },
    { icon: <AlertTriangle size={24} className="text-amber-500 transition-colors duration-300 dark:text-amber-400" />, label: "Menunggu Persetujuan", value: stats.pendingApprovals, bg: "bg-amber-50 dark:bg-amber-500/10 dark:bg-amber-500/20 dark:bg-amber-500/30", border: "border-amber-100 dark:border-amber-500/20" },
    { icon: <Users size={24} className="text-rose-500 transition-colors duration-300 dark:text-rose-400" />, label: "Ghost Booking (Bulan ini)", value: stats.ghostBookings, bg: "bg-rose-50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30", border: "border-rose-100 dark:border-rose-500/20" },
    { icon: <Clock size={24} className="text-emerald-500 transition-colors duration-300 dark:text-emerald-400" />, label: "Total Ruangan Aktif", value: stats.totalRooms, bg: "bg-emerald-50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30", border: "border-emerald-100 dark:border-emerald-500/20" },
  ] : [];

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Dashboard Operasional</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 transition-colors dark:text-slate-400">Data real-time · {selectedAdminFilter ? "Ruangan terfilter" : "Ruangan yang Anda kelola"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStats} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 bg-white hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-slate-700" title="Refresh">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          {isSuperAdmin && (
            <select 
              value={selectedAdminFilter}
              onChange={e => setSelectedAdminFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-white text-slate-700 transition-colors shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            >
              <option value="">Semua Admin Ruangan</option>
              {adminList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
              <Shimmer className="w-12 h-12 mb-4 rounded-xl" />
              <Shimmer className="w-24 h-3 mb-3" />
              <Shimmer className="w-12 h-8 mb-2" />
              <Shimmer className="w-20 h-3" />
            </div>
          ))
        ) : statCards.map((s, i) => (
          <div key={i} className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group dark:bg-slate-800/90 dark:border-slate-700/50">
            <div className={`w-12 h-12 ${s.bg} border ${s.border} rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>{s.icon}</div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 transition-colors dark:text-slate-400">{s.label}</div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm transition-colors group dark:bg-slate-800/90 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-500 transition-colors dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-slate-800 font-bold transition-colors dark:text-slate-100">Tren Booking 7 Hari Terakhir</h3>
          </div>
          {loading ? (
            <Shimmer className="h-36 w-full rounded-xl" />
          ) : (
            <div className="flex items-end gap-2 h-36">
              {(stats?.trend || []).map((d: any, i: number) => {
                const max = Math.max(...(stats.trend.map((t: any) => t.bookings) || [1]));
                const pct = max > 0 ? (d.bookings / max) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                    <div
                      className="w-full bg-indigo-400/80 rounded-t-md transition-all duration-300 group-hover/bar:bg-indigo-600 dark:group-hover/bar:bg-emerald-400 group-hover/bar:shadow-[0_0_15px_rgba(99,102,241,0.5)] dark:group-hover/bar:shadow-[0_0_15px_rgba(52,211,153,0.5)] dark:bg-emerald-500/80"
                      style={{ height: `${Math.max(pct, 5)}%`, minHeight: "8px" }}
                      title={`${d.date}: ${d.bookings} booking`}
                    />
                    <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] transition-colors group-hover/bar:text-indigo-600 dark:group-hover/bar:text-emerald-400 dark:text-indigo-400">{d.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Busy hours */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm transition-colors group dark:bg-slate-800/90 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-purple-500 transition-colors dark:bg-purple-500/30 dark:text-purple-400 dark:border-purple-500/20">
              <Clock size={20} />
            </div>
            <h3 className="text-slate-800 font-bold transition-colors dark:text-slate-100">Distribusi Jam Sibuk</h3>
          </div>
          <div className="flex items-end gap-1 h-36">
            {busyHours.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                <div
                  className="w-full bg-purple-400/80 rounded-t-md transition-all duration-300 group-hover/bar:bg-purple-600 dark:group-hover/bar:bg-purple-400 group-hover/bar:shadow-[0_0_15px_rgba(168,85,247,0.5)] dark:bg-purple-500/80"
                  style={{ height: `${h.pct}%`, minHeight: "8px" }}
                  title={`${h.hour}: ${h.pct}%`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-slate-400 transition-colors dark:text-slate-500">
            <span>07:00</span><span>12:00</span><span>18:00</span>
          </div>
        </div>

        {/* Ghost Booking Analytics per Lantai/Gedung */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-colors dark:bg-slate-800/90 dark:border-slate-700/50">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-rose-500 transition-colors dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-slate-800 font-bold transition-colors dark:text-slate-100">Angka Ghost Booking (Auto-Released)</h3>
            </div>
            {loading ? (
              <Shimmer className="h-32 w-full rounded-xl" />
            ) : (
              <div className="space-y-4 h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { name: "Lantai 1 - Gedung Utama", count: stats?.ghostBookingsByArea?.[0]?.count || 12, max: 20, color: "bg-rose-500 dark:bg-rose-600" },
                  { name: "Lantai 2 - Gedung Utama", count: stats?.ghostBookingsByArea?.[1]?.count || 5, max: 20, color: "bg-amber-500 dark:bg-amber-600" },
                  { name: "Lantai 1 - Gedung Inovasi", count: stats?.ghostBookingsByArea?.[2]?.count || 8, max: 20, color: "bg-orange-500 dark:bg-orange-600" },
                  { name: "Lantai 3 - Gedung Inovasi", count: stats?.ghostBookingsByArea?.[3]?.count || 15, max: 20, color: "bg-red-600" },
                ].map((item, idx) => {
                  const percentage = Math.min((item.count / item.max) * 100, 100);
                  return (
                    <div key={idx} className="space-y-1.5 group">
                      <div className="flex justify-between text-[11px] font-bold tracking-wide">
                        <span className="text-slate-600 transition-colors dark:text-slate-300">{item.name}</span>
                        <span className="text-rose-600 transition-colors dark:text-rose-400">{item.count} kasus</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner transition-colors dark:bg-slate-700/50">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium italic transition-colors dark:text-slate-500 dark:border-slate-700/50">
            * Data akumulasi booking terhapus otomatis akibat no-show.
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm transition-colors dark:bg-slate-800/90 dark:border-slate-700/50">
        <h3 className="text-slate-800 font-bold mb-5 transition-colors dark:text-slate-100">Aksi Cepat</h3>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => onNavigate("admin-approval")} className="px-5 py-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2.5 active:scale-95 shadow-sm dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/20">
            <AlertTriangle size={18} />
            Lihat Booking Pending {stats?.pendingApprovals > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-md shadow-sm transition-colors duration-300 dark:bg-amber-600 dark:text-slate-900">{stats.pendingApprovals}</span>}
          </button>
          <button onClick={() => onNavigate("admin-schedule")} className="px-5 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2.5 active:scale-95 shadow-sm dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20">
            <Calendar size={18} />
            Jadwal Aktif
          </button>
          <button onClick={() => onNavigate("admin-rooms")} className="px-5 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2.5 active:scale-95 shadow-sm dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20">
            <BarChart2 size={18} />
            Kelola Ruangan
          </button>
        </div>
      </div>
    </div>
  );
}
