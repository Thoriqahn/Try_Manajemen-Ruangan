import { useState, useRef } from "react";
import { Plus, Edit2, Power, Search, MapPin, Users, Monitor, AlertTriangle, Check, X, ImagePlus, Star, Trash2, MoveRight } from "lucide-react";
import { mockRooms } from "../shared/mockData";

interface RoomManagementProps {
  isSuperAdmin?: boolean;
  onNavigate?: (page: string, data?: any) => void;
}

export function RoomManagement({ isSuperAdmin = false, onNavigate }: RoomManagementProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [disableModal, setDisableModal] = useState<string | null>(null);
  const [disabledIds, setDisabledIds] = useState<string[]>([]);

  const filtered = mockRooms.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDisable = (id: string) => {
    setDisabledIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    setDisableModal(null);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>{isSuperAdmin ? "Manajemen Ruangan Global" : "Kelola Ruangan"}</h2>
          <p className="text-sm text-gray-500">{isSuperAdmin ? "Semua ruangan di seluruh organisasi" : "Ruangan yang menjadi tanggung jawab Anda"}</p>
        </div>
        <button
          onClick={() => { setEditRoom(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] transition-all shadow-md"
        >
          <Plus size={16} />
          Tambah Ruangan
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari ruangan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Ruangan</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Lokasi</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Kapasitas</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Booking</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Status</th>
                {isSuperAdmin && <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Admin</th>}
                <th className="text-right px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((room) => {
                const isDisabled = disabledIds.includes(room.id);
                const effectiveStatus = isDisabled ? "inactive" : room.status;
                const maxCap = Math.max(...Object.values(room.capacity));

                return (
                  <tr key={room.id} className={`hover:bg-gray-50 transition-colors ${isDisabled ? "opacity-60" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{room.name}</div>
                          <div className="text-xs text-gray-400">{room.layouts.join(", ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                        <span>{room.floor}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{room.building}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users size={13} className="text-gray-400" />
                        <span>s.d. {maxCap} orang</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${room.approvalType === "instant" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`} style={{ fontWeight: 500 }}>
                        {room.approvalType === "instant" ? "Instan" : "Manual Approval"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${effectiveStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${effectiveStatus === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                        {effectiveStatus === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-600">{room.adminName}</div>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditRoom(room); setShowForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDisableModal(room.id)}
                          className={`p-1.5 rounded-lg transition-all ${isDisabled ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                          title={isDisabled ? "Aktifkan" : "Nonaktifkan"}
                        >
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

      {/* Disable confirmation */}
      {disableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-gray-800" style={{ fontWeight: 700 }}>Nonaktifkan Ruangan?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Menonaktifkan ruangan akan menyembunyikannya dari daftar booking pengguna.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-6">
              <p className="text-xs text-amber-700">
                ⚠️ Ruangan ini memiliki booking aktif. Menonaktifkan ruangan akan membatalkan seluruh booking berjalan. Lanjutkan?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDisableModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={() => handleDisable(disableModal)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Ya, Nonaktifkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Form Modal */}
      {showForm && <RoomFormModal room={editRoom} isSuperAdmin={isSuperAdmin} onClose={() => { setShowForm(false); setEditRoom(null); }} />}
    </div>
  );
}

interface ImageItem {
  id: string;
  url: string;
  name: string;
  isPrimary: boolean;
}

function RoomFormModal({ room, isSuperAdmin, onClose }: { room: any; isSuperAdmin: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: room?.name || "",
    building: room?.building || "",
    floor: room?.floor || "",
    description: room?.description || "",
    approvalType: room?.approvalType || "instant",
    status: room?.status || "active",
    operationalEnabled: !!room?.operationalHours,
    startTime: room?.operationalHours?.start || "08:00",
    endTime: room?.operationalHours?.end || "17:00",
    adminName: room?.adminName || "",
    layouts: room?.layouts || [] as string[],
  });
  const [images, setImages] = useState<ImageItem[]>(
    room?.image ? [{ id: "existing-0", url: room.image, name: "Foto utama", isPrimary: true }] : []
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const MAX_IMAGES = 10;
  const MIN_IMAGES = 3;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const toAdd = Array.from(files).slice(0, remaining);
    const newImages: ImageItem[] = toAdd.map((file, i) => ({
      id: `img-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isPrimary: images.length === 0 && i === 0,
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const setPrimary = (id: string) => {
    setImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === id })));
  };

  const moveImage = (id: string, dir: -1 | 1) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const allLayouts = ["Boardroom", "U-Shape", "Classroom", "Theater / Auditorium", "Standing Setup"];
  const buildings = ["Gedung IKN Tower", "Gedung Serba Guna", "Gedung Teknologi"];
  const floors = ["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4", "Lantai 5", "Lantai 6", "Lantai 7", "Lantai 8"];
  const admins = ["Ahmad Fauzi", "Sari Dewi", "Bima Pradana", "Rina Kusuma"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSaved(true); setTimeout(onClose, 1200); }, 1000);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-500" />
          </div>
          <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>Berhasil Disimpan!</h3>
          <p className="text-sm text-gray-500">Data ruangan telah {room ? "diperbarui" : "ditambahkan"}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 700 }}>{room ? "Edit Ruangan" : "Tambah Ruangan Baru"}</h3>
            <p className="text-sm text-gray-400 mt-0.5">Lengkapi semua informasi yang diperlukan</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Info Dasar */}
          <div>
            <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>1. Informasi Dasar & Lokasi</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Nama Ruangan <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} maxLength={100} placeholder="Maks. 100 karakter" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Gedung <span className="text-red-500">*</span></label>
                  <select value={form.building} onChange={e => setForm({...form, building: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" required>
                    <option value="">Pilih gedung</option>
                    {buildings.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Lantai / Zona <span className="text-red-500">*</span></label>
                  <select value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" required>
                    <option value="">Pilih lantai</option>
                    {floors.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Penanggung Jawab (Admin Ruangan)</label>
                  <select value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                    <option value="">Pilih admin (opsional)</option>
                    {admins.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Deskripsi Ruangan</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} maxLength={500} rows={3} placeholder="Maks. 500 karakter (opsional)" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 resize-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Layout */}
          <div>
            <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>2. Kapasitas, Layout & Fasilitas</h4>
            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Setup Layout Ruangan <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {allLayouts.map(layout => (
                  <label key={layout} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.layouts.includes(layout)}
                      onChange={e => setForm({...form, layouts: e.target.checked ? [...form.layouts, layout] : form.layouts.filter(l => l !== layout)})}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">{layout}</span>
                    {form.layouts.includes(layout) && (
                      <div className="ml-auto flex items-center gap-2">
                        <label className="text-xs text-gray-400">Kapasitas:</label>
                        <input type="number" min={1} placeholder="0" className="w-20 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-blue-400" />
                        <span className="text-xs text-gray-400">orang</span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Policy */}
          <div>
            <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>3. Kebijakan & Jam Operasional</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>Batasi Jam Operasional</div>
                  <div className="text-xs text-gray-400 mt-0.5">Jika OFF, ruangan tersedia 24 jam penuh</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({...form, operationalEnabled: !form.operationalEnabled})}
                  className={`w-11 h-6 rounded-full relative transition-all ${form.operationalEnabled ? "bg-blue-500" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.operationalEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {form.operationalEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jam Mulai</label>
                    <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jam Selesai</label>
                    <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Mekanisme Persetujuan <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "instant", label: "Instant Booking", desc: "Booking langsung terkonfirmasi" },
                    { value: "manual", label: "Butuh Approval", desc: "Perlu validasi Admin Ruangan" },
                  ].map(opt => (
                    <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${form.approvalType === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" value={opt.value} checked={form.approvalType === opt.value} onChange={e => setForm({...form, approvalType: e.target.value})} className="sr-only" />
                      <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Status Awal <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "active", label: "Aktif", desc: "Langsung tayang di kalender" },
                    { value: "inactive", label: "Nonaktif (Draft)", desc: "Disembunyikan dari booking" },
                  ].map(opt => (
                    <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${form.status === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" value={opt.value} checked={form.status === opt.value} onChange={e => setForm({...form, status: e.target.value})} className="sr-only" />
                      <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Media */}
          <div>
            <h4 className="text-sm text-gray-700 mb-1 pb-2 border-b border-gray-100" style={{ fontWeight: 600 }}>4. Media & Visual</h4>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {images.length}/{MAX_IMAGES} foto ·{" "}
                <span className={images.length < MIN_IMAGES ? "text-amber-500" : "text-green-600"} style={{ fontWeight: 500 }}>
                  {images.length < MIN_IMAGES ? `Minimal ${MIN_IMAGES} foto diperlukan` : "Sudah memenuhi syarat minimal"}
                </span>
              </p>
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  <ImagePlus size={13} />
                  Tambah Foto
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              multiple
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                      img.isPrimary ? "border-blue-400 shadow-md shadow-blue-100" : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ aspectRatio: "4/3" }}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />

                    {/* Primary badge */}
                    {img.isPrimary && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm" style={{ fontWeight: 600 }}>
                        <Star size={9} fill="white" />
                        Utama
                      </div>
                    )}

                    {/* Index badge */}
                    {!img.isPrimary && (
                      <div className="absolute top-2 left-2 bg-black/40 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ fontWeight: 600 }}>
                        {idx + 1}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1.5">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimary(img.id)}
                          className="bg-white/90 text-blue-700 rounded-lg p-1.5 hover:bg-white shadow-sm"
                          title="Jadikan foto utama"
                        >
                          <Star size={13} />
                        </button>
                      )}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, -1)}
                          className="bg-white/90 text-gray-700 rounded-lg p-1.5 hover:bg-white shadow-sm rotate-180"
                          title="Geser ke kiri"
                        >
                          <MoveRight size={13} />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, 1)}
                          className="bg-white/90 text-gray-700 rounded-lg p-1.5 hover:bg-white shadow-sm"
                          title="Geser ke kanan"
                        >
                          <MoveRight size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="bg-white/90 text-red-500 rounded-lg p-1.5 hover:bg-white shadow-sm"
                        title="Hapus foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add more slot */}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                    style={{ aspectRatio: "4/3" }}
                  >
                    <ImagePlus size={20} />
                    <span className="text-xs">Tambah foto</span>
                  </button>
                )}
              </div>
            )}

            {/* Drop zone (when no images yet) */}
            {images.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ImagePlus size={22} className={dragOver ? "text-blue-500" : "text-gray-400"} />
                </div>
                <p className="text-sm text-gray-500" style={{ fontWeight: 500 }}>
                  {dragOver ? "Lepaskan untuk mengunggah" : "Drag & drop foto ruangan di sini"}
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, JPEG, PNG, WEBP · Maks. 5MB/foto</p>
                <p className="text-xs text-amber-600 mt-2" style={{ fontWeight: 500 }}>Minimal 3 foto, maksimal 10 foto</p>
                <button type="button" className="mt-3 px-4 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
                  Pilih File
                </button>
              </div>
            )}

            {/* Drag zone hint when some images exist */}
            {images.length > 0 && images.length < MAX_IMAGES && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                className={`border border-dashed rounded-lg px-4 py-3 text-center text-xs text-gray-400 transition-all ${
                  dragOver ? "border-blue-400 bg-blue-50 text-blue-500" : "border-gray-200"
                }`}
              >
                {dragOver ? "Lepaskan foto di sini" : `Atau drag & drop foto tambahan di sini (${MAX_IMAGES - images.length} slot tersisa)`}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
            <button
              type="submit"
              disabled={!form.name || !form.building || !form.floor || loading}
              className="px-6 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "Simpan Ruangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
