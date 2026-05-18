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
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export function AdminDashboard({ onNavigate, isSuperAdmin = false }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await statsService.admin();
      if (res.success) setStats(res.data);
    } catch (err: any) {
      setError("Gagal memuat statistik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = stats ? [
    { icon: <Calendar size={20} className="text-blue-500" />, label: "Booking Minggu Ini", value: stats.weeklyBookings, bg: "bg-blue-50" },
    { icon: <AlertTriangle size={20} className="text-yellow-500" />, label: "Menunggu Persetujuan", value: stats.pendingApprovals, bg: "bg-yellow-50" },
    { icon: <Users size={20} className="text-red-500" />, label: "Ghost Booking (Bulan ini)", value: stats.ghostBookings, bg: "bg-red-50" },
    { icon: <Clock size={20} className="text-green-500" />, label: "Total Ruangan Aktif", value: stats.totalRooms, bg: "bg-green-50" },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Dashboard Operasional</h2>
          <p className="text-sm text-gray-500">Data real-time · Ruangan yang Anda kelola</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {isSuperAdmin && (
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white text-gray-600">
              <option>Semua Admin Ruangan</option>
            </select>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <Shimmer className="w-10 h-10 mb-3" />
              <Shimmer className="w-24 h-3 mb-2" />
              <Shimmer className="w-12 h-7 mb-1" />
              <Shimmer className="w-20 h-3" />
            </div>
          ))
        ) : statCards.map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>{s.icon}</div>
            <div className="text-gray-400 text-xs mb-1" style={{ fontWeight: 500 }}>{s.label}</div>
            <div className="text-2xl text-gray-800" style={{ fontWeight: 700 }}>{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Tren Booking 7 Hari Terakhir</h3>
          </div>
          {loading ? (
            <Shimmer className="h-32 w-full" />
          ) : (
            <div className="flex items-end gap-1 h-32">
              {(stats?.trend || []).map((d: any, i: number) => {
                const max = Math.max(...(stats.trend.map((t: any) => t.bookings) || [1]));
                const pct = max > 0 ? (d.bookings / max) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                      style={{ height: `${Math.max(pct, 5)}%`, minHeight: "4px" }}
                      title={`${d.date}: ${d.bookings} booking`}
                    />
                    <span className="text-gray-400" style={{ fontSize: "9px" }}>{d.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Busy hours */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-purple-500" />
            <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Distribusi Jam Sibuk</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {busyHours.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-purple-500 rounded-t-sm transition-all hover:bg-purple-600"
                  style={{ height: `${h.pct}%`, minHeight: "4px" }}
                  title={`${h.hour}: ${h.pct}%`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>07:00</span><span>12:00</span><span>18:00</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jam tersibuk: <span className="text-gray-700" style={{ fontWeight: 500 }}>10:00 – 11:00</span> (rata-rata 90% terisi)</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-gray-700 mb-4" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Aksi Cepat</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => onNavigate("admin-approval")} className="px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg hover:bg-yellow-100 transition-colors flex items-center gap-2">
            <AlertTriangle size={15} />
            Lihat Booking Pending {stats?.pendingApprovals > 0 && <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.pendingApprovals}</span>}
          </button>
          <button onClick={() => onNavigate("admin-schedule")} className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
            <Calendar size={15} />
            Jadwal Aktif
          </button>
          <button onClick={() => onNavigate("admin-rooms")} className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2">
            <BarChart2 size={15} />
            Kelola Ruangan
          </button>
        </div>
      </div>
    </div>
  );
}
