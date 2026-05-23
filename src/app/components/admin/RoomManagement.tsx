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
        managed_only: "true"
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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${room.qr_token || room.id}`;
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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>{isSuperAdmin ? "Manajemen Ruangan Global" : "Kelola Ruangan"}</h2>
          <p className="text-sm text-gray-500">{isSuperAdmin ? "Semua ruangan di seluruh organisasi" : "Ruangan yang menjadi tanggung jawab Anda"}</p>
        </div>
        <button onClick={() => { setEditRoom(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] transition-all shadow-md">
          <Plus size={16} /> Tambah Ruangan
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari ruangan..." value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white" />
        </div>
        
        {isSuperAdmin && (
          <select
            value={selectedAdminFilter}
            onChange={e => {
              const val = e.target.value;
              setSelectedAdminFilter(val);
              load(val);
            }}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white text-gray-700 min-w-[200px]"
          >
            <option value="">Semua Admin Ruangan</option>
            {adminList.map(admin => (
              <option key={admin.id} value={admin.id}>{admin.name}</option>
            ))}
          </select>
        )}

        <button onClick={() => load()} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Ruangan", "Lokasi", "Kapasitas", "Fasilitas", "Booking", "Status", ...(isSuperAdmin ? ["Admin"] : []), "Aksi"].map(h => (
                    <th key={h} className={`${h === "Aksi" ? "text-right" : "text-left"} px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider`} style={{ fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-12 text-center text-sm text-gray-400">Belum ada ruangan. Tambah ruangan baru.</td></tr>
                ) : filtered.map(room => {
                  const layouts = room.layouts || [];
                  const maxCap = layouts.length > 0 ? Math.max(...layouts.map(l => l.capacity || 0)) : 0;
                  const jmr = room.jenis_manajemen_ruang || "MEETING_ROOM";
                  return (
                    <tr key={room.id} onClick={() => setSelectedRoomView(room)} className={`hover:bg-gray-50 transition-colors cursor-pointer ${room.status === "inactive" ? "opacity-60" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {room.image_url ? (
                              <img src={getImageUrl(room.image_url)} alt={room.name} className="w-full h-full object-cover" />
                            ) : room.room_type === 'digital' ? (
                              <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600 font-semibold text-sm">Zoom</div>
                            ) : room.room_type === 'hybrid' ? (
                              <div className="w-full h-full bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-sm">H</div>
                            ) : (
                              <MapPin size={18} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm text-gray-800 flex items-center gap-2" style={{ fontWeight: 600 }}>
                              {room.name}
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${jmr === "WORKSPACE" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-purple-50 text-purple-600 border border-purple-100"}`}>
                                {jmr === "WORKSPACE" ? "Workspace" : "Rapat"}
                              </span>
                            </div>
                            {room.room_type !== 'digital' && (
                              <div className="text-xs text-gray-400">
                                {jmr === 'WORKSPACE'
                                  ? `${room.total_meja_kerja || 0} Meja Kerja`
                                  : layouts.map(l => l.layout_type || l.name).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {room.room_type === 'digital' ? (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                            Digital (Zoom)
                          </span>
                        ) : room.room_type === 'hybrid' ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                              Hybrid (Fisik + Zoom)
                            </span>
                            <div className="flex items-center gap-1 text-sm text-gray-600"><MapPin size={13} className="text-gray-400" /><span>{room.floor_name}</span></div>
                            <div className="text-xs text-gray-400 mt-0.5">{room.building_name}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-sm text-gray-600"><MapPin size={13} className="text-gray-400" /><span>{room.floor_name}</span></div>
                            <div className="text-xs text-gray-400 mt-0.5">{room.building_name}</div>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users size={13} className="text-gray-400" />
                          <span>
                            {jmr === 'WORKSPACE'
                              ? `${room.total_meja_kerja || 0} Meja`
                              : room.room_type === 'digital'
                                ? "100 (Zoom)"
                                : `s.d. ${maxCap || "–"} orang`}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-gray-500 max-w-[150px] truncate" title={room.facilities ? Object.entries(room.facilities).map(([k,v]) => {
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
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${room.approval_type === "instant" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`} style={{ fontWeight: 500 }}>
                          {room.approval_type === "instant" ? "Instan" : "Manual Approval"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${room.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${room.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                          {room.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      {isSuperAdmin && <td className="px-5 py-4 text-sm text-gray-600">{room.admin_name || "–"}</td>}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          {room.room_type !== 'digital' && (
                            <button onClick={(e) => { e.stopPropagation(); downloadQRCode(room); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Unduh QR Code Pintu">
                              <QrCode size={15} />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditRoom(room); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDisableModal(room.id); }} disabled={toggling === room.id}
                            className={`p-1.5 rounded-lg transition-all ${room.status === "inactive" ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} title={room.status === "inactive" ? "Aktifkan" : "Nonaktifkan"}>
                            <Power size={15} />
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle size={20} className="text-red-500" /></div>
                <h3 className="text-gray-800" style={{ fontWeight: 700 }}>{room.status === "active" ? "Nonaktifkan" : "Aktifkan"} Ruangan?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">{room.status === "active" ? "Menonaktifkan ruangan akan menyembunyikannya dari daftar booking pengguna." : "Mengaktifkan ruangan akan membuatnya tersedia untuk booking."}</p>
              <div className="flex gap-3">
                <button onClick={() => setDisableModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={() => handleToggleStatus(room)} className={`flex-1 py-2.5 rounded-lg text-sm text-white ${room.status === "active" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}>
                  Ya, {room.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {showForm && <RoomFormModal room={editRoom} isSuperAdmin={isSuperAdmin} onClose={() => { setShowForm(false); setEditRoom(null); load(); }} />}
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [layouts, setLayouts] = useState<{type: string, capacity: number}[]>(
    room?.layouts?.length ? room.layouts.map((l: any) => ({ type: l.layout_type || l.type || l.name, capacity: l.capacity })) : [{ type: "Boardroom", capacity: 10 }]
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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
      
      let roomId = room?.id;
      if (roomId) { 
        await roomService.update(roomId, payload); 
      } else { 
        const res = await roomService.create(payload);
        roomId = res.data?.id || res.id || res.data?.data?.id; // fallback logic just in case
      }

      // Convert facilities object -> array expected by backend
      if (payload.facilities && typeof payload.facilities === 'object' && !Array.isArray(payload.facilities)) {
        payload.facilities = Object.entries(payload.facilities).map(([key, val]) => ({ type: key, quantity: Number(val) }));
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-green-500" /></div>
        <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>Berhasil Disimpan!</h3>
        <p className="text-sm text-gray-500">Data ruangan telah {room ? "diperbarui" : "ditambahkan"}.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 700 }}>{room ? "Edit Ruangan" : "Tambah Ruangan Baru"}</h3>
            <p className="text-sm text-gray-400 mt-0.5">Lengkapi informasi ruangan</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">{error}</div>}
          <div className="space-y-3">
            <h4 className="text-sm text-gray-700 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>1. Informasi Dasar</h4>
            
            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Jenis Manajemen Ruang <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "MEETING_ROOM", label: "Ruangan Rapat", desc: "Berbasis kalender grid mingguan/jam", activeColor: "border-purple-400 bg-purple-50" },
                  { value: "WORKSPACE", label: "Ruangan Kerja (Workspace)", desc: "Berbasis alokasi meja individual permanen", activeColor: "border-indigo-400 bg-indigo-50" },
                ].map(opt => (
                  <label key={opt.value} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.jenis_manajemen_ruang === opt.value ? opt.activeColor : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                    <input type="radio" name="jenis_manajemen_ruang" value={opt.value} checked={form.jenis_manajemen_ruang === opt.value} onChange={e => {
                      setForm({ ...form, jenis_manajemen_ruang: e.target.value, room_type: e.target.value === 'WORKSPACE' ? 'physical' : form.room_type === 'digital' && e.target.value === 'WORKSPACE' ? 'physical' : form.room_type });
                    }} className="sr-only" />
                    <div className="text-sm text-gray-800 font-semibold">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {form.jenis_manajemen_ruang === 'MEETING_ROOM' && (
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Tipe Ruangan <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "physical", label: "Ruangan Fisik", desc: "Ruangan rapat di kantor/gedung", activeColor: "border-blue-400 bg-blue-50" },
                    { value: "hybrid", label: "Ruangan Hybrid", desc: "Ruangan fisik + fasilitas Zoom", activeColor: "border-teal-400 bg-teal-50" },
                    { value: "digital", label: "Ruangan Digital", desc: "Ruangan virtual berbasis Zoom", activeColor: "border-purple-400 bg-purple-50" },
                  ].map(opt => (
                    <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${form.room_type === opt.value ? opt.activeColor : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" value={opt.value} checked={form.room_type === opt.value} onChange={e => setForm({ ...form, room_type: e.target.value })} className="sr-only" />
                      <div className="text-sm text-gray-700 font-semibold">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.jenis_manajemen_ruang === 'WORKSPACE' && form.room_type !== 'digital' && (
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Total Meja Kerja (Kapasitas) <span className="text-red-500">*</span></label>
                <input type="number" min={1} required={form.jenis_manajemen_ruang === 'WORKSPACE'} value={form.total_meja_kerja} onChange={e => setForm({ ...form, total_meja_kerja: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
                <p className="text-xs text-gray-400 mt-1">Jumlah meja kerja yang akan digenerate otomatis (e.g. Desk-01 s.d Desk-NN)</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Nama Ruangan <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
            </div>

            {form.room_type !== 'digital' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Gedung <span className="text-red-500">*</span></label>
                    <select value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value, floor_id: "" })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                      <option value="">Pilih gedung</option>
                      {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Lantai <span className="text-red-500">*</span></label>
                    <select value={form.floor_id} onChange={e => setForm({ ...form, floor_id: e.target.value })} required disabled={!form.building_id} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 disabled:opacity-50">
                      <option value="">Pilih lantai</option>
                      {floors.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
                {form.room_type === 'hybrid' && (
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 flex items-start gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-lg font-bold text-xs uppercase flex-shrink-0">Hybrid</div>
                    <div>
                      <h5 className="text-sm font-semibold text-teal-950">Ruangan Fisik + Zoom Otomatis</h5>
                      <p className="text-xs text-teal-700 mt-0.5">
                        Ruangan fisik yang dilengkapi fasilitas virtual Zoom. Saat pengguna memesan ruangan ini, link Zoom Premium akan dibuat otomatis sekaligus mengamankan ruangan fisiknya.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg font-bold text-xs uppercase flex-shrink-0">Zoom</div>
                <div>
                  <h5 className="text-sm font-semibold text-purple-950">Integrasi Virtual Otomatis</h5>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Pemesanan untuk ruangan digital ini otomatis dibuatkan link rapat Zoom Premium yang unik dengan kapasitas hingga 100 partisipan dan tanpa batas durasi.
                  </p>
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Admin Ruangan</label>
                <select value={form.admin_id} onChange={e => setForm({ ...form, admin_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                  <option value="">Tidak di-assign (Dikelola Super Admin)</option>
                  {admins.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Jika dipilih, admin ini akan bertanggung jawab mengelola dan menyetujui ruangan ini</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Deskripsi</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 resize-none" />
            </div>
          </div>

          {form.room_type !== 'digital' && form.jenis_manajemen_ruang !== 'WORKSPACE' && (
            <div className="space-y-3">
              <h4 className="text-sm text-gray-700 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>2. Tata Letak & Kapasitas</h4>
              {layouts.map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <select value={l.type} onChange={e => {
                      const newL = [...layouts]; newL[i].type = e.target.value; setLayouts(newL);
                    }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                      <option value="Boardroom">Boardroom</option>
                      <option value="U-Shape">U-Shape</option>
                      <option value="Classroom">Classroom</option>
                      <option value="Theater">Theater</option>
                      <option value="Banquet">Banquet</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <input type="number" min={1} value={l.capacity} onChange={e => {
                      const newL = [...layouts]; newL[i].capacity = parseInt(e.target.value) || 0; setLayouts(newL);
                    }} placeholder="Kapasitas" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
                  </div>
                  <button type="button" onClick={() => setLayouts(layouts.filter((_, idx) => idx !== i))} disabled={layouts.length === 1} className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setLayouts([...layouts, { type: "U-Shape", capacity: 10 }])} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1 mt-2">
                <Plus size={14} /> Tambah Layout
              </button>
            </div>
          )}

          {form.room_type !== 'digital' && (
            <div className="space-y-3">
              <h4 className="text-sm text-gray-700 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>{form.jenis_manajemen_ruang === 'WORKSPACE' ? '2' : '3'}. Fasilitas Ruangan</h4>
              <div className="grid grid-cols-2 gap-3">
                {["Proyektor", "Papan Tulis", "TV / Smart Screen", "AC", "Sound System", "Kursi Tambahan", "CCTV", "WiFi Kecepatan Tinggi"].map(fac => {
                  const isChecked = !!form.facilities[fac];
                  const count = form.facilities[fac] || 0;
                  return (
                    <div key={fac} className={`flex items-center justify-between p-2.5 border rounded-lg transition-colors ${isChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          checked={isChecked} 
                          onChange={e => {
                            const newFac = { ...form.facilities };
                            if (e.target.checked) newFac[fac] = 1;
                            else delete newFac[fac];
                            setForm({ ...form, facilities: newFac });
                          }} 
                        />
                        <span className={`text-sm ${isChecked ? 'text-blue-900 font-medium' : 'text-gray-600'}`}>{fac}</span>
                      </label>
                      {isChecked && (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                          <input 
                            type="number" 
                            min={1} 
                            max={999}
                            value={count} 
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              const newFac = { ...form.facilities };
                              if (val > 0) newFac[fac] = val;
                              else newFac[fac] = 1;
                              setForm({ ...form, facilities: newFac });
                            }}
                            className="w-14 px-1.5 py-1 text-sm border border-blue-200 rounded text-center outline-none focus:border-blue-400 bg-white" 
                          />
                          <span className="text-xs text-blue-600 font-medium mr-1">unit</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {form.jenis_manajemen_ruang !== 'WORKSPACE' && (
            <div className="space-y-3">
              <h4 className="text-sm text-gray-700 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>4. Kebijakan & Jam Operasional</h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>Batasi Jam Operasional</div>
                  <div className="text-xs text-gray-400 mt-0.5">Jika OFF, ruangan tersedia 24 jam</div>
                </div>
                <button type="button" onClick={() => setForm({ ...form, operational_enabled: !form.operational_enabled })}
                  className={`w-11 h-6 rounded-full relative transition-all ${form.operational_enabled ? "bg-blue-500" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.operational_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {form.operational_enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jam Mulai</label><input type="time" value={form.operational_start} onChange={e => setForm({ ...form, operational_start: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" /></div>
                  <div><label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jam Selesai</label><input type="time" value={form.operational_end} onChange={e => setForm({ ...form, operational_end: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" /></div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Mekanisme Persetujuan <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "instant", label: "Instant Booking", desc: "Langsung terkonfirmasi" }, { value: "manual", label: "Butuh Approval", desc: "Perlu validasi Admin" }].map(opt => (
                    <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${form.approval_type === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" value={opt.value} checked={form.approval_type === opt.value} onChange={e => setForm({ ...form, approval_type: e.target.value })} className="sr-only" />
                      <div className="text-sm text-gray-700 font-semibold">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Status Awal</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "active", label: "Aktif", desc: "Langsung tayang di kalender" }, { value: "inactive", label: "Draft", desc: "Disembunyikan dari booking" }].map(opt => (
                    <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${form.status === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" value={opt.value} checked={form.status === opt.value} onChange={e => setForm({ ...form, status: e.target.value })} className="sr-only" />
                      <div className="text-sm text-gray-700 font-semibold">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {form.room_type !== 'digital' && (
            <div className="space-y-3">
              <h4 className="text-sm text-gray-700 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>
                {form.jenis_manajemen_ruang === 'WORKSPACE' ? '3' : '5'}. Foto Ruangan
              </h4>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Upload Foto {form.room_type !== 'digital' ? "(Min. 3, Maks. 10)" : "(Opsional, Maks. 10)"} {!room && form.room_type !== 'digital' && <span className="text-red-500">*</span>}
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                  <input type="file" multiple accept="image/*" onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (photos.length + files.length > 10) {
                      alert("Maksimal 10 foto diperbolehkan");
                      return;
                    }
                    setPhotos([...photos, ...files]);
                  }} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                    <ImagePlus size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-blue-600 font-medium">Klik untuk unggah foto</span>
                    <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {photos.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                        <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!room && form.room_type !== 'digital' && photos.length > 0 && photos.length < 3 && <p className="text-xs text-red-500 mt-2">Pilih minimal {3 - photos.length} foto lagi</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={!form.name || (form.room_type !== 'digital' && (!form.building_id || !form.floor_id)) || loading}
              className="px-6 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144] disabled:opacity-50 flex items-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "Simpan Ruangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
