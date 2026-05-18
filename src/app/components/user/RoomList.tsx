import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Users, Monitor, Wifi, ChevronRight } from "lucide-react";
import { roomService } from "../../services/roomService";
import { buildingService } from "../../services/index";

interface RoomListProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export function RoomList({ onNavigate }: RoomListProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBuildingId, setFilterBuildingId] = useState("all");
  const [filterCapacity, setFilterCapacity] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [roomsRes, buildingsRes] = await Promise.all([
          roomService.list({ status: "active" }),
          buildingService.list(),
        ]);
        if (roomsRes.success) setRooms(roomsRes.data || []);
        if (buildingsRes.success) setBuildings(buildingsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = rooms.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBuildingId !== "all" && r.building_id !== filterBuildingId) return false;
    const maxCap = r.layouts?.length ? Math.max(...r.layouts.map((l: any) => l.capacity)) : 0;
    if (filterCapacity === "small" && maxCap > 15) return false;
    if (filterCapacity === "medium" && (maxCap <= 15 || maxCap > 50)) return false;
    if (filterCapacity === "large" && maxCap <= 50) return false;
    return true;
  });

  const getMaxCapacity = (room: any) =>
    room.layouts?.length ? Math.max(...room.layouts.map((l: any) => l.capacity)) : 0;

  const hasVc = (room: any) =>
    room.facilities?.some((f: any) => f.facility_type === "video_conference" && f.quantity > 0);

  const statusBadge = (status: string) => {
    if (status === "active") return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full" style={{ fontWeight: 500 }}>Aktif</span>;
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full" style={{ fontWeight: 500 }}>Nonaktif</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Daftar Ruangan</h2>
          <p className="text-sm text-gray-500">{loading ? "Memuat..." : `${filtered.length} ruangan tersedia`}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all ${showFilter ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
        >
          <Filter size={15} />
          Filter
        </button>
      </div>

      {showFilter && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Gedung</label>
            <select value={filterBuildingId} onChange={(e) => setFilterBuildingId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50">
              <option value="all">Semua Gedung</option>
              {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Kapasitas</label>
            <select value={filterCapacity} onChange={(e) => setFilterCapacity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50">
              <option value="all">Semua Kapasitas</option>
              <option value="small">Kecil (≤15 orang)</option>
              <option value="medium">Sedang (16–50 orang)</option>
              <option value="large">Besar (&gt;50 orang)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterBuildingId("all"); setFilterCapacity("all"); setSearch(""); }} className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200">Reset</button>
          </div>
        </div>
      )}

      {/* Room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <Shimmer className="h-44 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
                <Shimmer className="h-3 w-2/3" />
              </div>
            </div>
          ))
        ) : (
          filtered.map((room) => (
            <button
              key={room.id}
              onClick={() => onNavigate("room-detail", { roomId: room.id })}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                {room.image_url ? (
                  <img src={room.image_url} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Monitor size={40} className="text-blue-300" />
                  </div>
                )}
                <div className="absolute top-3 left-3">{statusBadge(room.status)}</div>
                <div className="absolute top-3 right-3">
                  {room.approval_type === "manual" ? (
                    <span className="px-2 py-0.5 bg-amber-100/90 text-amber-700 text-xs rounded-full backdrop-blur-sm" style={{ fontWeight: 500 }}>Perlu Approval</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100/90 text-green-700 text-xs rounded-full backdrop-blur-sm" style={{ fontWeight: 500 }}>Instan</span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-gray-800 truncate mb-1" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{room.name}</h3>
                <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                  <MapPin size={12} />
                  <span className="truncate">{room.floor_name} · {room.building_name}</span>
                </div>

                <div className="flex gap-3 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-blue-400" />
                    <span>s.d. {getMaxCapacity(room)} org</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor size={12} className="text-purple-400" />
                    <span>{room.layouts?.length || 0} layout</span>
                  </div>
                  {hasVc(room) && (
                    <div className="flex items-center gap-1">
                      <Wifi size={12} className="text-green-400" />
                      <span>VC Ready</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {room.layouts?.slice(0, 3).map((l: any) => (
                    <span key={l.id} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{l.layout_type}</span>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {room.restrict_hours ? `${room.hours_start} – ${room.hours_end}` : "24 Jam"}
                </span>
                <span className="flex items-center gap-1 text-blue-600 text-xs" style={{ fontWeight: 500 }}>
                  Lihat Detail <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500" style={{ fontWeight: 500 }}>Tidak ada ruangan ditemukan</p>
          <p className="text-sm text-gray-400 mt-1">Coba ubah kata kunci atau filter pencarian</p>
        </div>
      )}
    </div>
  );
}
