import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Users, Monitor, Wifi, ChevronRight, X } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { roomService } from "../../services/roomService";
import { buildingService } from "../../services/index";

const getImageUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? url : '/' + url;
};

interface RoomListProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

export function RoomList({ onNavigate }: RoomListProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBuildingId, setFilterBuildingId] = useState("all");
  const [filterCapacity, setFilterCapacity] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [showMapModal, setShowMapModal] = useState<any>(null); // holds building data

  // Fix Leaflet default icon issue
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

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


  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Daftar Ruangan</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5 transition-colors dark:text-slate-400">{loading ? "Memuat..." : `${filtered.length} ruangan tersedia`}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-emerald-400 transition-colors dark:text-indigo-400" />
          <input
            type="text"
            placeholder="Cari nama ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-white/50 backdrop-blur-sm text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-300 font-medium shadow-sm dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-700"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all shadow-sm active:scale-95 ${
            showFilter 
              ? "bg-indigo-600 dark:bg-emerald-600 text-white border-indigo-700 dark:border-emerald-700 hover:shadow-md hover:shadow-indigo-500/20 dark:hover:shadow-emerald-500/20" 
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600"
          }`}
        >
          <Filter size={16} className={showFilter ? "text-indigo-200 dark:text-emerald-200" : "text-slate-400 dark:text-slate-500"} />
          Filter
        </button>
      </div>

      {showFilter && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-5 shadow-inner transition-colors animate-in slide-in-from-top-2 duration-200 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 transition-colors dark:text-slate-400">Gedung</label>
            <div className="flex items-center gap-2">
              <select value={filterBuildingId} onChange={(e) => setFilterBuildingId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 dark:focus:border-emerald-500 bg-white text-slate-800 font-medium transition-colors shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <option value="all">Semua Gedung</option>
                {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {filterBuildingId !== "all" && buildings.find(b => b.id === filterBuildingId)?.lat && (
                <button 
                  onClick={() => setShowMapModal(buildings.find(b => b.id === filterBuildingId))} 
                  className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-100 shrink-0 transition-all shadow-sm group dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20" 
                  title="Lihat Lokasi Peta Gedung"
                >
                  <MapPin size={18} className="group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 transition-colors dark:text-slate-400">Kapasitas</label>
            <select value={filterCapacity} onChange={(e) => setFilterCapacity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 dark:focus:border-emerald-500 bg-white text-slate-800 font-medium transition-colors shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
              <option value="all">Semua Kapasitas</option>
              <option value="small">Kecil (≤15 orang)</option>
              <option value="medium">Sedang (16–50 orang)</option>
              <option value="large">Besar (&gt;50 orang)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterBuildingId("all"); setFilterCapacity("all"); setSearch(""); }} className="h-[42px] px-5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl border border-rose-200 transition-all dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30">
              Reset Filter
            </button>
          </div>
        </div>
      )}

      {/* Room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900 dark:border-slate-800">
              <Shimmer className="h-48 w-full rounded-none" />
              <div className="p-5 space-y-3">
                <Shimmer className="h-5 w-3/4" />
                <Shimmer className="h-4 w-1/2" />
                <div className="pt-2 flex gap-2"><Shimmer className="h-6 w-16" /><Shimmer className="h-6 w-16" /></div>
              </div>
            </div>
          ))
        ) : (
          filtered.map((room) => (
            <button
              key={room.id}
              onClick={() => onNavigate("room-detail", { roomId: room.id })}
              className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl overflow-hidden text-left shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-emerald-500/50 transition-all duration-300 group flex flex-col dark:bg-slate-900/90 dark:border-indigo-500/40"
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden transition-colors dark:bg-slate-800">
                {room.image_url ? (
                  <img src={getImageUrl(room.image_url)} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : room.room_type === 'digital' ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform duration-500">
                    <span className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg shadow-black/10">
                      <Monitor size={24} />
                    </span>
                    <div className="text-white/90 text-[10px] font-bold tracking-[0.2em] uppercase">Digital Room</div>
                  </div>
                ) : room.room_type === 'hybrid' ? (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform duration-500">
                    <span className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg shadow-black/10">
                      <Wifi size={24} />
                    </span>
                    <div className="text-white/90 text-[10px] font-bold tracking-[0.2em] uppercase">Hybrid Room</div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform duration-500 transition-colors">
                    <span className="w-14 h-14 rounded-2xl bg-white/50 backdrop-blur-md flex items-center justify-center text-slate-500 border border-white/40 shadow-lg shadow-black/5 transition-colors dark:bg-black/20 dark:text-slate-300 dark:border-white/10">
                      <Users size={24} />
                    </span>
                    <div className="text-slate-500/80 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors dark:text-slate-400/80">Physical Room</div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300" />
                <div className="absolute top-4 right-4 z-10">
                  {room.approval_type === "manual" ? (
                    <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm border border-amber-500/30 transition-colors dark:bg-amber-500/30 dark:text-amber-400">Perlu Approval</span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm border border-emerald-400/50">Instan</span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-slate-800 font-bold text-lg truncate mb-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-emerald-400 dark:text-indigo-400">{room.name}</h3>
                
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-4 font-medium transition-colors dark:text-slate-400">
                  {room.room_type === 'digital' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold tracking-wider uppercase transition-colors dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-500/20">
                      Virtual Meeting
                    </span>
                  ) : room.room_type === 'hybrid' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold tracking-wider uppercase transition-colors dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-500/20">
                        Hybrid
                      </span>
                      <span className="mx-0.5 opacity-50">•</span>
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{room.floor_name} · {room.building_name}</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold tracking-wider uppercase transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        Fisik
                      </span>
                      <span className="mx-0.5 opacity-50">•</span>
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{room.floor_name} · {room.building_name}</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mb-5 flex-1 transition-colors dark:text-slate-300">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                    <Users size={14} className="text-indigo-500 shrink-0 transition-colors dark:text-emerald-400" />
                    <span className="font-medium truncate">s.d. {room.room_type === 'digital' ? '100' : getMaxCapacity(room)} org</span>
                  </div>
                  
                  {room.room_type === 'digital' ? (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                      <Monitor size={14} className="text-indigo-500 shrink-0 transition-colors dark:text-emerald-400" />
                      <span className="font-medium truncate">Sesi Virtual</span>
                    </div>
                  ) : room.room_type === 'hybrid' ? (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                      <Wifi size={14} className="text-indigo-500 shrink-0 transition-colors dark:text-emerald-400" />
                      <span className="font-medium truncate">+ Zoom</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                      <Monitor size={14} className="text-indigo-500 shrink-0 transition-colors dark:text-emerald-400" />
                      <span className="font-medium truncate">{room.layouts?.length || 0} Layout</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {room.room_type === 'digital' ? (
                    <>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200 transition-colors dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20">Zoom Premium</span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20">Auto Link</span>
                    </>
                  ) : room.room_type === 'hybrid' ? (
                    <>
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-md border border-teal-200 transition-colors dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-500/20">Zoom Premium</span>
                      {room.layouts?.slice(0, 2).map((l: any) => (
                        <span key={l.id} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">{l.layout_type}</span>
                      ))}
                    </>
                  ) : (
                    room.layouts?.slice(0, 3).map((l: any) => (
                      <span key={l.id} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">{l.layout_type}</span>
                    ))
                  )}
                  {hasVc(room) && room.room_type !== 'digital' && room.room_type !== 'hybrid' && (
                     <span className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-sky-200 transition-colors dark:bg-sky-500/30 dark:text-sky-400 dark:border-sky-500/20">VC Ready</span>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between transition-colors dark:bg-slate-900/50 dark:border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase transition-colors dark:text-slate-400">
                  {room.restrict_hours ? `${room.hours_start} – ${room.hours_end}` : "Akses 24 Jam"}
                </span>
                <span className="flex items-center gap-1 text-indigo-600 text-xs font-bold group-hover:translate-x-1 transition-transform transition-colors dark:text-emerald-400">
                  Detail <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 px-4 bg-white/50 backdrop-blur-sm border border-dashed border-slate-300 rounded-3xl transition-colors dark:bg-slate-900/50 dark:border-slate-700">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner transition-colors dark:bg-slate-800">
            <Search size={32} className="text-slate-400 transition-colors dark:text-slate-500" />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-2 transition-colors dark:text-slate-100">Ruangan tidak ditemukan</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed transition-colors dark:text-slate-400">Coba ubah kombinasi filter atau kata kunci pencarian Anda untuk melihat lebih banyak opsi ruangan yang tersedia.</p>
        </div>
      )}

      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors dark:bg-emerald-500/30 dark:text-emerald-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg transition-colors dark:text-slate-100">Lokasi {showMapModal.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 transition-colors dark:text-slate-400">{showMapModal.address || "Kawasan Inti Pusat Pemerintahan (KIPP) IKN"}</p>
                </div>
              </div>
              <button onClick={() => setShowMapModal(null)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors dark:text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="h-[60vh] w-full bg-slate-100 relative z-0 transition-colors dark:bg-slate-800">
              <MapContainer 
                center={[parseFloat(showMapModal.lat), parseFloat(showMapModal.lng)]} 
                zoom={15} 
                style={{ height: "100%", width: "100%", zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[parseFloat(showMapModal.lat), parseFloat(showMapModal.lng)]}></Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
