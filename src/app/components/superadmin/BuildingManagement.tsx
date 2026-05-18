import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, MapPin, Building2, Check, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { buildingService } from "../../services/index";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// IKN Center coordinates
const IKN_CENTER: [number, number] = [-0.973019, 116.703227];

export function BuildingManagement({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBuilding, setEditBuilding] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await buildingService.list();
      setBuildings(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus gedung ${name}? Semua ruangan di dalamnya mungkin akan terdampak.`)) {
      try {
        await buildingService.delete(id);
        load();
      } catch (e: any) {
        alert(e.message || "Gagal menghapus gedung");
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl text-gray-800" style={{ fontWeight: 700 }}>Manajemen Gedung & Kantor</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola daftar gedung, lokasi Peta (Lat/Long), dan alamat</p>
        </div>
        <button onClick={() => { setEditBuilding(null); setShowForm(true); }} className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2.5 rounded-lg text-sm hover:bg-[#0F2144] transition-colors" style={{ fontWeight: 500 }}>
          <Plus size={18} /> Tambah Gedung
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Gedung</th>
                <th className="px-4 py-3 font-semibold">Alamat</th>
                <th className="px-4 py-3 font-semibold">Total Lantai</th>
                <th className="px-4 py-3 font-semibold">Lokasi Peta</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : buildings.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Belum ada data gedung</td></tr>
              ) : buildings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} />
                      </div>
                      <span className="font-medium text-gray-800">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.address || "-"}</td>
                  <td className="px-4 py-3 text-gray-600 text-center">{b.total_floors || 1} Lantai</td>
                  <td className="px-4 py-3">
                    {b.lat && b.lng ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 w-max px-2 py-1 rounded">
                        <MapPin size={12} /> {b.lat}, {b.lng}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Belum diset</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditBuilding(b); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(b.id, b.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <BuildingFormModal
          building={editBuilding}
          onClose={() => { setShowForm(false); setEditBuilding(null); load(); }}
        />
      )}
    </div>
  );
}

function LocationMarker({ position, setPosition }: { position: [number, number] | null; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function BuildingFormModal({ building, onClose }: { building: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: building?.name || "",
    address: building?.address || "",
    lat: building?.lat || "",
    lng: building?.lng || "",
    image_url: building?.image_url || "",
    total_floors: building?.total_floors || 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [mapCenter] = useState<[number, number]>(
    building?.lat && building?.lng ? [parseFloat(building.lat), parseFloat(building.lng)] : IKN_CENTER
  );
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    building?.lat && building?.lng ? [parseFloat(building.lat), parseFloat(building.lng)] : null
  );

  useEffect(() => {
    if (markerPos) {
      setForm(prev => ({ ...prev, lat: markerPos[0].toString(), lng: markerPos[1].toString() }));
    }
  }, [markerPos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lat || !form.lng) {
      setError("Anda wajib meletakkan pinpoint pada peta!");
      return;
    }
    setLoading(true); setError("");
    try {
      if (building?.id) {
        await buildingService.update(building.id, form);
      } else {
        await buildingService.create(form);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan gedung");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-800">{building ? "Edit Gedung" : "Tambah Gedung Baru"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gedung <span className="text-red-500">*</span></label>
              <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="Contoh: Kemenko 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Lantai <span className="text-red-500">*</span></label>
              <input required type="number" min={1} value={form.total_floors} onChange={e => setForm({...form, total_floors: parseInt(e.target.value) || 1})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="Total lantai..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
            <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 resize-none" placeholder="Alamat detail..." />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Titik Koordinat Peta <span className="text-red-500">*</span></label>
              <p className="text-[11px] text-gray-500 mb-2">Klik pada peta di bawah untuk menandai lokasi gedung (Bawaan: IKN).</p>
            </div>
            
            <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 shadow-inner z-0 relative">
              <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={markerPos} setPosition={setMarkerPos} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input readOnly type="text" value={form.lat} className="w-full p-2 border border-gray-200 rounded-md text-sm bg-gray-100" placeholder="Pilih di peta" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input readOnly type="text" value={form.lng} className="w-full p-2 border border-gray-200 rounded-md text-sm bg-gray-100" placeholder="Pilih di peta" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar Gedung (Opsional)</label>
            <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="https://..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm">Batal</button>
            <button type="submit" disabled={!form.name || loading} className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144] disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan Gedung"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
