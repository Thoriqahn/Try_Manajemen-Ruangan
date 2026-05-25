import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Power, Search, MapPin, Users, AlertTriangle, Check, X, ImagePlus, Star, Trash2, MoveRight, RefreshCw, QrCode } from "lucide-react";
import { roomService, Room } from "../../services/roomService";
import { buildingService, userService } from "../../services/index";

const getImageUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? url : '/' + url;
};

interface RoomManagementProps {
  isSuperAdmin?: boolean;
  onNavigate?: (page: string, data?: any) => void;
}

export function RoomManagement({ isSuperAdmin = false, onNavigate }: RoomManagementProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [disableModal, setDisableModal] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedRoomView, setSelectedRoomView] = useState<any>(null);

  const load = async (adminFilterValue?: string) => {
    setLoading(true);
    try {
      const filterAdmin = adminFilterValue !== undefined ? adminFilterValue : selectedAdminFilter;
      const res = await roomService.list({ 
        search: search || undefined,
        admin_id: filterAdmin || undefined,
        managed_only: isSuperAdmin ? undefined : "true"
      });
      const normal = (res.data || []).map((r: any) => {
        const facs = r.facilities;
        if (Array.isArray(facs)) {
          const obj: Record<string, number> = {};
          for (const f of facs) {
            obj[f.facility_type || f.type || f.name || f.facilityType] = f.quantity || f.qty || 0;
          }
          return { ...r, facilities: obj };
        }
        return { ...r, facilities: r.facilities || {} };
      });
      setRooms(normal);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isSuperAdmin) {
      userService.list({ role: "admin" })
        .then(res => {
          setAdminList(res.data || []);
        })
        .catch(e => console.error("Gagal memuat daftar admin", e));
    }
  }, [isSuperAdmin]);

  const handleToggleStatus = async (room: Room) => {
    setToggling(room.id);
    try {
      await roomService.update(room.id, { status: room.status === "active" ? "inactive" : "active" });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r));
    } catch (e: any) { alert(e.message || "Gagal mengubah status"); }
    setToggling(null);
    setDisableModal(null);
  };

  const downloadQRCode = (room: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background (premium gradient)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#1E3A5F");
    gradient.addColorStop(0.3, "#0F2144");
    gradient.addColorStop(1, "#0A1428");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = "#4B6584";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Draw Header Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OTORITA IBU KOTA NUSANTARA", canvas.width / 2, 80);

    ctx.fillStyle = "#A4B0BE";
    ctx.font = "18px sans-serif";
    ctx.fillText("SISTEM MANAJEMEN RUANGAN (SMART SPACE)", canvas.width / 2, 115);

    // Draw Accent Line
    ctx.fillStyle = "#38D39F";
    ctx.fillRect(canvas.width / 2 - 150, 140, 300, 4);

    // Draw Room Card Container
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(80, 180, canvas.width - 160, 160, 15);
    } else {
      ctx.rect(80, 180, canvas.width - 160, 160);
    }
    ctx.fill();
    ctx.stroke();

    // Draw Room Label / Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(room.name, canvas.width / 2, 245);

    ctx.fillStyle = "#38D39F";
    ctx.font = "bold 20px sans-serif";
    const jmr = room.jenis_manajemen_ruang || "MEETING_ROOM";
    ctx.fillText(jmr === "WORKSPACE" ? "WORKSPACE SEATING" : "MEETING ROOM", canvas.width / 2, 290);

    // Draw Instruction
    ctx.fillStyle = "#F1F2F6";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText("Pindai QR Code di bawah untuk validasi kehadiran (Check-In)", canvas.width / 2, 385);

    // Draw QR Code Background Box
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(175, 425, 450, 450, 20);
    } else {
      ctx.rect(175, 425, 450, 450);
    }
    ctx.fill();

    // Load QR Code from api.qrserver.com
    const qrData = encodeURIComponent(`${window.location.origin}/qr/${room.qr_token || room.id}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 200, 450, 400, 400);

      // Draw footer text below the QR Code box
      ctx.fillStyle = "#A4B0BE";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Token ID: ${room.qr_token || 'N/A'}`, canvas.width / 2, 915);

      ctx.fillStyle = "#747D8C";
      ctx.font = "12px sans-serif";
      ctx.fillText("Harap lakukan check-in maksimal 15 menit setelah waktu pemesanan dimulai.", canvas.width / 2, 945);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_CODE_${room.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = qrUrl;
  };

  const filtered = rooms.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{isSuperAdmin ? "Manajemen Ruangan Global" : "Kelola Ruangan"}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 transition-colors dark:text-slate-400">{isSuperAdmin ? "Semua ruangan di seluruh organisasi" : "Ruangan yang menjadi tanggung jawab Anda"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load()} className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 bg-white/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-95 border border-slate-200/50 backdrop-blur-md dark:bg-slate-900 dark:text-indigo-400 dark:border-slate-700/50" title="Refresh">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setEditRoom(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 dark:hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-500/20 dark:hover:shadow-emerald-500/20 active:scale-95 dark:bg-emerald-600">
            <Plus size={18} /> Tambah Ruangan
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors dark:text-slate-500" />
          <input type="text" placeholder="Cari ruangan..." value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-white/80 text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-md shadow-sm transition-all dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700" />
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-slate-200 transition-colors dark:bg-slate-800/50 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2 transition-colors dark:text-slate-400">Filter Admin:</span>
            <select
              value={selectedAdminFilter}
              onChange={e => {
                const val = e.target.value;
                setSelectedAdminFilter(val);
                load(val);
              }}
              className="px-4 py-2 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none focus:ring-0 min-w-[200px] transition-colors dark:text-slate-200"
            >
              <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Semua Admin Ruangan</option>
              {adminList.map(admin => (
                <option key={admin.id} value={admin.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{admin.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin transition-colors dark:border-t-emerald-500" /></div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900/90 dark:border-slate-800">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 transition-colors dark:bg-slate-800/80 dark:border-slate-800">
                  {["Ruangan", "Lokasi", "Kapasitas", "Fasilitas", "Booking", "Status", ...(isSuperAdmin ? ["Admin"] : []), "Aksi"].map(h => (
                    <th key={h} className={`${h === "Aksi" ? "text-right" : "text-left"} px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 transition-colors duration-300">
                {filtered.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-24 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors dark:bg-slate-800"><MapPin size={24} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /></div>
                    <p className="text-slate-800 font-bold text-lg mb-1 transition-colors dark:text-slate-100">Belum ada ruangan</p>
                    <p className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">Tambah ruangan baru untuk memulai.</p>
                  </td></tr>
                ) : filtered.map(room => {
                  const layouts = room.layouts || [];
                  const maxCap = layouts.length > 0 ? Math.max(...layouts.map(l => l.capacity || 0)) : 0;
                  const jmr = room.jenis_manajemen_ruang || "MEETING_ROOM";
                  return (
                    <tr key={room.id} onClick={() => setSelectedRoomView(room)} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${room.status === "inactive" ? "opacity-60 dark:opacity-40" : ""}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center transition-all group-hover:scale-105 duration-300 shadow-sm dark:bg-slate-800">
                            {room.image_url ? (
                              <img src={getImageUrl(room.image_url)} alt={room.name} className="w-full h-full object-cover" />
                            ) : room.room_type === 'digital' ? (
                              <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm transition-colors dark:bg-purple-500/30 dark:text-purple-400">Zoom</div>
                            ) : room.room_type === 'hybrid' ? (
                              <div className="w-full h-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm transition-colors dark:bg-teal-500/30 dark:text-teal-400">H</div>
                            ) : (
                              <MapPin size={20} className="text-slate-400 transition-colors dark:text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-emerald-400 dark:text-indigo-400">
                              {room.name}
                              <span className={`text-[9px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${jmr === "WORKSPACE" ? "bg-indigo-100/90 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30" : "bg-purple-100/90 dark:bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30"}`}>
                                {jmr === "WORKSPACE" ? "Workspace" : "Rapat"}
                              </span>
                            </div>
                            {room.room_type !== 'digital' && (
                              <div className="text-[11px] font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">
                                {jmr === 'WORKSPACE'
                                  ? `${room.total_meja_kerja || 0} Meja Kerja`
                                  : layouts.map(l => l.layout_type || l.name).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {room.room_type === 'digital' ? (
                           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100/90 text-purple-700 border border-purple-200 backdrop-blur-sm transition-colors dark:bg-purple-500/30 dark:text-purple-400 dark:border-purple-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse transition-colors duration-300 dark:bg-purple-400" />
                            Digital (Zoom)
                          </span>
                        ) : room.room_type === 'hybrid' ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-100/90 text-teal-800 border border-teal-200 backdrop-blur-sm transition-colors mb-2 dark:bg-teal-500/30 dark:text-teal-400 dark:border-teal-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse transition-colors duration-300 dark:bg-teal-400" />
                              Hybrid (Fisik+Zoom)
                            </span>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 transition-colors dark:text-slate-200"><MapPin size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{room.floor_name}</span></div>
                            <div className="text-[11px] font-medium text-slate-500 mt-0.5 ml-5 transition-colors dark:text-slate-400">{room.building_name}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 transition-colors dark:text-slate-200"><MapPin size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{room.floor_name}</span></div>
                            <div className="text-[11px] font-medium text-slate-500 mt-0.5 ml-5 transition-colors dark:text-slate-400">{room.building_name}</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 transition-colors dark:text-slate-200">
                          <Users size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" />
                          <span>
                            {jmr === 'WORKSPACE'
                              ? `${room.total_meja_kerja || 0} Meja`
                              : room.room_type === 'digital'
                                ? "100 (Zoom)"
                                : `s.d. ${maxCap || "–"} org`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-medium text-slate-500 max-w-[150px] truncate transition-colors dark:text-slate-400" title={room.facilities ? Object.entries(room.facilities).map(([k,v]) => {
                          const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return `${formatted} (${v})`;
                        }).join(", ") : ""}>
                          {room.facilities && Object.keys(room.facilities).length > 0
                            ? Object.entries(room.facilities).map(([k,v]) => {
                                const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                return `${formatted} (${v})`;
                              }).join(", ")
                            : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${room.approval_type === "instant" ? "bg-indigo-100/90 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30" : "bg-amber-100/90 dark:bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"}`}>
                          {room.approval_type === "instant" ? "Instan" : "Manual"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${room.status === "active" ? "bg-emerald-100/90 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-slate-200/90 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${room.status === "active" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-400 dark:bg-slate-500"}`} />
                          {room.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      {isSuperAdmin && <td className="px-6 py-5 text-sm font-medium text-slate-600 transition-colors dark:text-slate-300">{room.admin_name || "–"}</td>}
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end opacity-80 transition-opacity duration-300">
                          {room.room_type !== 'digital' && (
                            <button onClick={(e) => { e.stopPropagation(); downloadQRCode(room); }} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors dark:bg-emerald-500/30 dark:text-emerald-400" title="Unduh QR Code Pintu">
                              <QrCode size={16} />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditRoom(room); setShowForm(true); }} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors dark:bg-indigo-500/30 dark:text-indigo-400" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDisableModal(room.id); }} disabled={toggling === room.id}
                            className={`p-2 rounded-lg transition-colors ${room.status === "inactive" ? "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30" : "text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 dark:hover:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30"}`} title={room.status === "inactive" ? "Aktifkan" : "Nonaktifkan"}>
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {disableModal && (() => {
        const room = rooms.find(r => r.id === disableModal);
        return room ? (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner transition-colors dark:bg-amber-500/30"><AlertTriangle size={24} className="text-amber-500 transition-colors duration-300 dark:text-amber-400" /></div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{room.status === "active" ? "Nonaktifkan" : "Aktifkan"} Ruangan?</h3>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-6 transition-colors dark:text-slate-400">{room.status === "active" ? "Menonaktifkan ruangan akan menyembunyikannya dari daftar booking pengguna." : "Mengaktifkan ruangan akan membuatnya tersedia untuk booking."}</p>
              <div className="flex gap-3">
                <button onClick={() => setDisableModal(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Batal</button>
                <button onClick={() => handleToggleStatus(room)} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-sm active:scale-95 ${room.status === "active" ? "bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 hover:shadow-amber-500/20" : "bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 hover:shadow-emerald-500/20"}`}>
                  Ya, {room.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {showForm && <RoomFormModal room={editRoom} isSuperAdmin={isSuperAdmin} onClose={() => { setShowForm(false); setEditRoom(null); load(); }} />}

      {/* Room Detail View Modal */}
      {selectedRoomView && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[50] p-4 animate-in fade-in duration-200" onClick={() => setSelectedRoomView(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="relative h-48 sm:h-64 flex-shrink-0 bg-slate-100 transition-colors dark:bg-slate-800">
              {selectedRoomView.image_url ? (
                <img src={getImageUrl(selectedRoomView.image_url)} alt={selectedRoomView.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 transition-colors duration-300 dark:text-slate-500">
                  <ImagePlus size={48} className="mb-3 opacity-50" />
                  <span className="font-bold">Tidak ada foto</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button onClick={() => setSelectedRoomView(null)} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all">
                <X size={18} />
              </button>
              <div className="absolute bottom-5 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md shadow-lg border border-slate-200/50 transition-colors dark:bg-slate-900/90 dark:border-slate-700/50">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedRoomView.jenis_manajemen_ruang === "WORKSPACE" ? "text-indigo-600 dark:text-indigo-400" : "text-purple-600 dark:text-purple-400"}`}>
                  {selectedRoomView.jenis_manajemen_ruang === "WORKSPACE" ? "WORKSPACE SEATING" : "MEETING ROOM"}
                </span>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-3 transition-colors dark:text-slate-100">{selectedRoomView.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><MapPin size={16} /> {selectedRoomView.floor_name || "Lantai tidak diketahui"}, {selectedRoomView.building_name || "Gedung tidak diketahui"}</span>
                    <span className="flex items-center gap-1.5"><Users size={16} /> {selectedRoomView.jenis_manajemen_ruang === 'WORKSPACE' ? `${selectedRoomView.total_meja_kerja || 0} Meja` : `Kapasitas s.d. ${Math.max(...(selectedRoomView.layouts?.map((l: any) => l.capacity || 0) || [0]))} orang`}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => { setEditRoom(selectedRoomView); setShowForm(true); setSelectedRoomView(null); }} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all shadow-sm dark:bg-emerald-500/30 dark:text-emerald-400" title="Edit Ruangan">
                    <Edit2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 transition-colors dark:text-slate-500">Deskripsi Ruangan</h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed transition-colors dark:text-slate-300">{selectedRoomView.description || "Tidak ada deskripsi."}</p>
                  </div>
                  <div>
                    <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 transition-colors dark:text-slate-500">Admin Ruangan</h4>
                    <p className="text-sm font-bold text-slate-700 transition-colors dark:text-slate-300">{selectedRoomView.admin_name || selectedRoomView.admin_id || "Tidak ada admin."}</p>
                  </div>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-5 space-y-5 border border-slate-100 shadow-sm transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                  <div>
                    <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 transition-colors dark:text-slate-500">Jam Operasional</h4>
                    <p className="text-sm font-bold text-slate-700 transition-colors dark:text-slate-300">
                      {selectedRoomView.restrict_hours ? `${selectedRoomView.hours_start} - ${selectedRoomView.hours_end}` : "24 Jam (Tidak dibatasi)"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 transition-colors dark:text-slate-500">Mekanisme Approval</h4>
                    <span className={`inline-flex px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md font-bold transition-colors ${selectedRoomView.approval_type === "instant" ? "bg-indigo-100/90 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30" : "bg-amber-100/90 dark:bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"}`}>
                      {selectedRoomView.approval_type === "instant" ? "Instant Booking" : "Manual (Persetujuan)"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2 transition-colors dark:text-slate-500">Tipe Ruangan</h4>
                    <span className="inline-flex px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md font-bold bg-slate-200/90 text-slate-700 border border-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                      {selectedRoomView.room_type === 'digital' ? "Digital (Zoom)" : selectedRoomView.room_type === 'hybrid' ? "Hybrid" : "Fisik (Offline)"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRoomView.jenis_manajemen_ruang !== 'WORKSPACE' && selectedRoomView.layouts && selectedRoomView.layouts.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Tipe Layout & Kapasitas</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedRoomView.layouts.map((l: any, i: number) => (
                      <div key={i} className="px-4 py-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between min-w-[150px] shadow-sm transition-colors dark:bg-emerald-500/30 dark:border-emerald-500/20">
                        <span className="text-sm text-indigo-900 font-bold transition-colors duration-300 dark:text-emerald-400">{l.layout_type || l.name}</span>
                        <span className="text-[10px] text-indigo-700 bg-white/80 px-2.5 py-1 rounded-md font-bold shadow-sm transition-colors duration-300 dark:bg-emerald-500/30 dark:text-emerald-300">{l.capacity} pax</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRoomView.facilities && Object.keys(selectedRoomView.facilities).length > 0 && (
                <div>
                  <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Fasilitas Tersedia</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(selectedRoomView.facilities).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <Check size={16} className="text-emerald-500 transition-colors duration-300 dark:text-emerald-400" />
                        <span className="flex-1 capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] transition-colors duration-300 dark:bg-slate-900 dark:text-slate-400">x{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomFormModal({ room, isSuperAdmin, onClose }: { room: any; isSuperAdmin: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: room?.name || "",
    building_id: room?.building_id || "",
    floor_id: room?.floor_id || "",
    description: room?.description || "",
    approval_type: room?.approval_type || "instant",
    status: room?.status || "active",
    operational_enabled: !!(room?.hours_start),
    operational_start: room?.hours_start || "08:00",
    operational_end: room?.hours_end || "17:00",
    admin_id: room?.admin_id || "",
    room_type: room?.room_type || "physical",
    jenis_manajemen_ruang: room?.jenis_manajemen_ruang || "MEETING_ROOM",
    total_meja_kerja: room?.total_meja_kerja || 10,
    facilities: room?.facilities || {},
  });
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>(
    room?.photos || (room?.image_url ? [{ id: 'primary', url: room.image_url }] : [])
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [layouts, setLayouts] = useState<{type: string, capacity: number}[]>(
    room?.layouts?.length ? room.layouts.map((l: any) => ({ type: l.layout_type || l.type || l.name, capacity: l.capacity })) : [{ type: "Boardroom", capacity: 10 }]
  );
  const [dynamicFacilities, setDynamicFacilities] = useState<{name: string, quantity: number}[]>(
    Object.entries(room?.facilities || {}).map(([name, qty]) => ({ name, quantity: Number(qty) }))
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (room?.id) {
      roomService.get(room.id).then(res => {
        const fullRoom = res.data || res;
        if (fullRoom.photos && fullRoom.photos.length > 0) {
          setExistingPhotos(fullRoom.photos);
        } else if (fullRoom.image_url) {
          setExistingPhotos([{ id: 'primary', url: fullRoom.image_url }]);
        }
      }).catch(e => console.error("Gagal memuat detail ruangan:", e));
    }
  }, [room?.id]);

  useEffect(() => {
    buildingService.list().then((d: any) => setBuildings(d.data || [])).catch(() => {});
    if (isSuperAdmin) {
      userService.list({ role: "admin" }).then((d: any) => setAdmins(d.data || [])).catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (form.building_id) {
      buildingService.listFloors(form.building_id).then((d: any) => setFloors(d.data || [])).catch(() => {});
    }
  }, [form.building_id]);

  // Clear selected photos when switching to digital room type
  useEffect(() => {
    if (form.room_type === 'digital') {
      setPhotos([]);
    }
  }, [form.room_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room && form.room_type !== 'digital' && photos.length < 3) {
      setError("Pilih minimal 3 foto untuk ruangan baru");
      return;
    }
    setLoading(true); setError("");
    try {
      const payload: any = { ...form };
      if (!form.operational_enabled) { delete payload.operational_start; delete payload.operational_end; }
      delete payload.operational_enabled;
      
      if (form.jenis_manajemen_ruang === 'WORKSPACE') {
        payload.layouts = [];
      } else {
        payload.layouts = form.room_type === 'digital' ? [] : layouts;
        payload.total_meja_kerja = null;
      }
      
      if (form.room_type === 'digital') {
        payload.building_id = null;
        payload.floor_id = null;
      }
      
      payload.facilities = dynamicFacilities
        .filter(f => f.name.trim() !== '')
        .map(f => ({ type: f.name.trim(), quantity: Number(f.quantity) || 1 }));

      let roomId = room?.id;
      if (roomId) { 
        await roomService.update(roomId, payload); 
      } else { 
        const res = await roomService.create(payload);
        roomId = res.data?.id || res.id || res.data?.data?.id; // fallback logic just in case
      }

      if (photos.length > 0 && roomId) {
        for (const file of photos) {
          await roomService.uploadPhoto(roomId, file);
        }
      }

      setSaved(true); setTimeout(onClose, 1200);
    } catch (e: any) { setError(e.message || "Gagal menyimpan ruangan"); }
    setLoading(false);
  };

  if (saved) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-sm text-center p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner transition-colors dark:bg-emerald-500/30"><Check size={28} className="text-emerald-500 transition-colors duration-300 dark:text-emerald-400" /></div>
        <h3 className="text-xl font-extrabold text-slate-800 mb-2 tracking-tight transition-colors dark:text-slate-100">Berhasil Disimpan!</h3>
        <p className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">Data ruangan telah {room ? "diperbarui" : "ditambahkan"}.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors custom-scrollbar dark:bg-slate-900 dark:border-slate-800">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 sm:px-8 sm:pt-8 border-b border-slate-100 flex items-center justify-between z-10 transition-colors dark:bg-slate-900/90 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{room ? "Edit Ruangan" : "Tambah Ruangan Baru"}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">Lengkapi informasi ruangan</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all dark:bg-slate-800 dark:text-slate-500"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm font-medium text-rose-700 flex items-center gap-3 transition-colors dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/20">
            <AlertTriangle size={18} /> {error}
          </div>}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 transition-colors dark:text-slate-500 dark:border-slate-800">1. Informasi Dasar</h4>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Jenis Manajemen Ruang <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "MEETING_ROOM", label: "Ruangan Rapat", desc: "Berbasis kalender grid mingguan/jam", activeColor: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30 dark:border-indigo-400 ring-4 ring-indigo-500/20" },
                  { value: "WORKSPACE", label: "Ruangan Kerja (Workspace)", desc: "Berbasis alokasi meja individual permanen", activeColor: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30 dark:border-indigo-400 ring-4 ring-indigo-500/20" },
                ].map(opt => (
                  <label key={opt.value} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${form.jenis_manajemen_ruang === opt.value ? opt.activeColor : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600 bg-white dark:bg-slate-800"}`}>
                    <input type="radio" name="jenis_manajemen_ruang" value={opt.value} checked={form.jenis_manajemen_ruang === opt.value} onChange={e => {
                      setForm({ ...form, jenis_manajemen_ruang: e.target.value, room_type: e.target.value === 'WORKSPACE' ? 'physical' : form.room_type === 'digital' && e.target.value === 'WORKSPACE' ? 'physical' : form.room_type });
                    }} className="sr-only" />
                    <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{opt.label}</div>
                    <div className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {form.jenis_manajemen_ruang === 'MEETING_ROOM' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Tipe Ruangan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "physical", label: "Ruangan Fisik", desc: "Ruangan rapat di kantor/gedung", activeColor: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30 dark:border-indigo-400 ring-4 ring-indigo-500/20" },
                    { value: "hybrid", label: "Ruangan Hybrid", desc: "Ruangan fisik + fasilitas Zoom", activeColor: "border-teal-500 bg-teal-50/50 dark:bg-teal-500/10 dark:bg-teal-500/20 dark:bg-teal-500/30 dark:border-teal-400 ring-4 ring-teal-500/20" },
                    { value: "digital", label: "Ruangan Digital", desc: "Ruangan virtual berbasis Zoom", activeColor: "border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 dark:bg-purple-500/20 dark:bg-purple-500/30 dark:border-purple-400 ring-4 ring-purple-500/20" },
                  ].map(opt => (
                    <label key={opt.value} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${form.room_type === opt.value ? opt.activeColor : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600 bg-white dark:bg-slate-800"}`}>
                      <input type="radio" value={opt.value} checked={form.room_type === opt.value} onChange={e => setForm({ ...form, room_type: e.target.value })} className="sr-only" />
                      <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{opt.label}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.jenis_manajemen_ruang === 'WORKSPACE' && form.room_type !== 'digital' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Total Meja Kerja (Kapasitas) <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                <input type="number" min={1} required={form.jenis_manajemen_ruang === 'WORKSPACE'} value={form.total_meja_kerja} onChange={e => setForm({ ...form, total_meja_kerja: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
                <p className="text-xs font-medium text-slate-500 mt-1.5 transition-colors dark:text-slate-400">Jumlah meja kerja yang akan digenerate otomatis (e.g. Desk-01 s.d Desk-NN)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Nama Ruangan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
            </div>

            {form.room_type !== 'digital' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Gedung <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                    <select value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value, floor_id: "" })} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700">
                      <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Pilih gedung</option>
                      {buildings.map((b: any) => <option key={b.id} value={b.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Lantai <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                    <select value={form.floor_id} onChange={e => setForm({ ...form, floor_id: e.target.value })} required disabled={!form.building_id} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 disabled:opacity-50 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700">
                      <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Pilih lantai</option>
                      {floors.map((f: any) => <option key={f.id} value={f.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{f.name}</option>)}
                    </select>
                  </div>
                </div>
                {form.room_type === 'hybrid' && (
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 flex items-start gap-4 transition-colors dark:bg-teal-500/30 dark:border-teal-500/20">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-xl font-bold text-[10px] uppercase tracking-wider flex-shrink-0 shadow-sm transition-colors dark:bg-teal-500/30 dark:text-teal-400">Hybrid</div>
                    <div>
                      <h5 className="text-sm font-extrabold text-teal-950 tracking-tight transition-colors dark:text-teal-400">Ruangan Fisik + Zoom Otomatis</h5>
                      <p className="text-xs font-medium text-teal-700 mt-1 leading-relaxed transition-colors dark:text-teal-300/70">
                        Ruangan fisik yang dilengkapi fasilitas virtual Zoom. Saat pengguna memesan ruangan ini, link Zoom Premium akan dibuat otomatis sekaligus mengamankan ruangan fisiknya.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 flex items-start gap-4 transition-colors dark:bg-purple-500/30 dark:border-purple-500/20">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-[10px] uppercase tracking-wider flex-shrink-0 shadow-sm transition-colors dark:bg-purple-500/30 dark:text-purple-400">Zoom</div>
                <div>
                  <h5 className="text-sm font-extrabold text-purple-950 tracking-tight transition-colors dark:text-purple-400">Integrasi Virtual Otomatis</h5>
                  <p className="text-xs font-medium text-purple-700 mt-1 leading-relaxed transition-colors dark:text-purple-300/70">
                    Pemesanan untuk ruangan digital ini otomatis dibuatkan link rapat Zoom Premium yang unik dengan kapasitas hingga 100 partisipan dan tanpa batas durasi.
                  </p>
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Admin Ruangan</label>
                <select value={form.admin_id} onChange={e => setForm({ ...form, admin_id: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700">
                  <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Tidak di-assign (Dikelola Super Admin)</option>
                  {admins.map((a: any) => <option key={a.id} value={a.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{a.name} ({a.email})</option>)}
                </select>
                <p className="text-xs font-medium text-slate-500 mt-1.5 transition-colors dark:text-slate-400">Jika dipilih, admin ini akan bertanggung jawab mengelola dan menyetujui ruangan ini</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Deskripsi</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 resize-none transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
            </div>
          </div>

          {form.room_type !== 'digital' && form.jenis_manajemen_ruang !== 'WORKSPACE' && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 transition-colors dark:text-slate-500 dark:border-slate-800">2. Tata Letak & Kapasitas</h4>
              {layouts.map((l, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <select value={l.type} onChange={e => {
                      const newL = [...layouts]; newL[i].type = e.target.value; setLayouts(newL);
                    }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700">
                      <option value="Boardroom" className="bg-white transition-colors duration-300 dark:bg-slate-800">Boardroom</option>
                      <option value="U-Shape" className="bg-white transition-colors duration-300 dark:bg-slate-800">U-Shape</option>
                      <option value="Classroom" className="bg-white transition-colors duration-300 dark:bg-slate-800">Classroom</option>
                      <option value="Theater" className="bg-white transition-colors duration-300 dark:bg-slate-800">Theater</option>
                      <option value="Banquet" className="bg-white transition-colors duration-300 dark:bg-slate-800">Banquet</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <input type="number" min={1} value={l.capacity} onChange={e => {
                      const newL = [...layouts]; newL[i].capacity = parseInt(e.target.value) || 0; setLayouts(newL);
                    }} placeholder="Kapasitas" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
                  </div>
                  <button type="button" onClick={() => setLayouts(layouts.filter((_, idx) => idx !== i))} disabled={layouts.length === 1} className="w-full sm:w-auto p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center dark:bg-rose-500/30 dark:text-rose-400">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setLayouts([...layouts, { type: "U-Shape", capacity: 10 }])} className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1.5 mt-2 transition-colors dark:text-emerald-400">
                <Plus size={16} /> Tambah Layout
              </button>
            </div>
          )}

          {form.room_type !== 'digital' && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 transition-colors dark:text-slate-500 dark:border-slate-800">{form.jenis_manajemen_ruang === 'WORKSPACE' ? '2' : '3'}. Fasilitas Ruangan</h4>
              <div className="space-y-3">
                {dynamicFacilities.map((fac, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input type="text" value={fac.name} onChange={e => {
                        const newF = [...dynamicFacilities]; newF[i].name = e.target.value; setDynamicFacilities(newF);
                      }} placeholder="Nama Fasilitas (mis: Proyektor)" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
                    </div>
                    <div className="w-full sm:w-32">
                      <input type="number" min={1} value={fac.quantity} onChange={e => {
                        const newF = [...dynamicFacilities]; newF[i].quantity = parseInt(e.target.value) || 0; setDynamicFacilities(newF);
                      }} placeholder="Jumlah" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
                    </div>
                    <button type="button" onClick={() => setDynamicFacilities(dynamicFacilities.filter((_, idx) => idx !== i))} className="w-full sm:w-auto p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors flex items-center justify-center dark:bg-rose-500/30 dark:text-rose-400">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setDynamicFacilities([...dynamicFacilities, { name: "", quantity: 1 }])} className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1.5 mt-2 transition-colors dark:text-emerald-400">
                  <Plus size={16} /> Tambah Fasilitas
                </button>
              </div>
            </div>
          )}

          {form.jenis_manajemen_ruang !== 'WORKSPACE' && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 transition-colors dark:text-slate-500 dark:border-slate-800">4. Kebijakan & Jam Operasional</h4>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50">
                <div>
                  <div className="text-sm font-bold text-slate-700 transition-colors dark:text-slate-300">Batasi Jam Operasional</div>
                  <div className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">Jika OFF, ruangan tersedia 24 jam</div>
                </div>
                <button type="button" onClick={() => setForm({ ...form, operational_enabled: !form.operational_enabled })}
                  className={`w-12 h-7 rounded-full relative transition-all shadow-inner ${form.operational_enabled ? "bg-indigo-500 dark:bg-emerald-500 dark:bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow transition-transform ${form.operational_enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {form.operational_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Jam Mulai</label><input type="time" value={form.operational_start} onChange={e => setForm({ ...form, operational_start: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Jam Selesai</label><input type="time" value={form.operational_end} onChange={e => setForm({ ...form, operational_end: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50 text-slate-800 transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" /></div>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Mekanisme Persetujuan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[{ value: "instant", label: "Instant Booking", desc: "Langsung terkonfirmasi", activeColor: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30 dark:border-indigo-400 ring-4 ring-indigo-500/20" }, { value: "manual", label: "Butuh Approval", desc: "Perlu validasi Admin", activeColor: "border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 dark:bg-amber-500/20 dark:bg-amber-500/30 dark:border-amber-400 ring-4 ring-amber-500/20" }].map(opt => (
                    <label key={opt.value} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${form.approval_type === opt.value ? opt.activeColor : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600 bg-white dark:bg-slate-800"}`}>
                      <input type="radio" value={opt.value} checked={form.approval_type === opt.value} onChange={e => setForm({ ...form, approval_type: e.target.value })} className="sr-only" />
                      <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{opt.label}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Status Awal</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[{ value: "active", label: "Aktif", desc: "Langsung tayang di kalender", activeColor: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 dark:border-emerald-400 ring-4 ring-emerald-500/20" }, { value: "inactive", label: "Draft", desc: "Disembunyikan dari booking", activeColor: "border-slate-500 bg-slate-100 dark:bg-slate-700 dark:border-slate-500 ring-4 ring-slate-500/20" }].map(opt => (
                    <label key={opt.value} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${form.status === opt.value ? opt.activeColor : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600 bg-white dark:bg-slate-800"}`}>
                      <input type="radio" value={opt.value} checked={form.status === opt.value} onChange={e => setForm({ ...form, status: e.target.value })} className="sr-only" />
                      <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{opt.label}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {form.room_type !== 'digital' && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 transition-colors dark:text-slate-500 dark:border-slate-800">
                {form.jenis_manajemen_ruang === 'WORKSPACE' ? '3' : '5'}. Foto Ruangan
              </h4>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">
                  Upload Foto {form.room_type !== 'digital' ? "(Min. 3, Maks. 10)" : "(Opsional, Maks. 10)"} {!room && form.room_type !== 'digital' && <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span>}
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors dark:bg-slate-800 dark:border-slate-700">
                  <input type="file" multiple accept="image/*" onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (existingPhotos.length + photos.length + files.length > 10) {
                      alert("Maksimal 10 foto diperbolehkan");
                      return;
                    }
                    setPhotos([...photos, ...files]);
                  }} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 transition-colors dark:bg-slate-800"><ImagePlus size={32} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /></div>
                    <span className="text-sm font-bold text-indigo-600 transition-colors dark:text-emerald-400">Klik untuk unggah foto</span>
                    <span className="text-xs font-medium text-slate-400 mt-2 transition-colors dark:text-slate-500">PNG, JPG up to 5MB</span>
                  </label>
                </div>
                
                {(existingPhotos.length > 0 || photos.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                    {/* Render Existing Photos */}
                    {existingPhotos.map((p, i) => (
                      <div key={`existing-${i}`} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group shadow-sm transition-colors dark:border-slate-700">
                        <img src={getImageUrl(p.url)} alt="Foto Ruangan" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <span className="text-[10px] text-white font-bold bg-black/60 px-2.5 py-1 rounded-md">Tersimpan</span>
                        </div>
                      </div>
                    ))}
                    {/* Render New Photos */}
                    {photos.map((p, i) => (
                      <div key={`new-${i}`} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group shadow-sm transition-colors dark:border-slate-700">
                        <img src={URL.createObjectURL(p)} alt="Foto Ruangan" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center transition-all hover:bg-rose-600 hover:scale-105 shadow-md dark:bg-rose-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!room && form.room_type !== 'digital' && photos.length > 0 && photos.length < 3 && <p className="text-xs font-bold text-rose-500 mt-3 transition-colors dark:text-rose-400">Pilih minimal {3 - photos.length} foto lagi</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 transition-colors dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Batal</button>
            <button type="submit" disabled={!form.name || (form.room_type !== 'digital' && (!form.building_id || !form.floor_id)) || loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 dark:hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-500/20 dark:hover:shadow-emerald-500/20 active:scale-95 dark:bg-emerald-600">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</> : "Simpan Ruangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
