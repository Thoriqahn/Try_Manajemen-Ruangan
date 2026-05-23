import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, MapPin, Building2, X, UploadCloud, Layers, Check } from "lucide-react";
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

const IKN_CENTER: [number, number] = [-0.973019, 116.703227];

const getImageUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? url : '/' + url;
};

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1E3A5F] to-[#2A4E85] p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Galeri Gedung & Kantor</h2>
          <p className="text-blue-100 mt-1 text-sm">Kelola seluruh portofolio properti, gedung, dan pemetaan lokasinya secara interaktif.</p>
        </div>
        <button onClick={() => { setEditBuilding(null); setShowForm(true); }} className="flex items-center gap-2 bg-white text-[#1E3A5F] px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-all font-semibold shadow-md hover:shadow-lg">
          <Plus size={18} /> Tambahkan Gedung
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 h-72 animate-pulse overflow-hidden flex flex-col">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-5 space-y-3 flex-1">
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : buildings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Building2 size={32} className="text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Belum Ada Gedung</h3>
          <p className="text-gray-500 mb-6 max-w-md">Sistem belum memiliki data gedung. Silakan tambahkan gedung pertama Anda untuk memulai manajemen ruangan.</p>
          <button onClick={() => { setEditBuilding(null); setShowForm(true); }} className="flex items-center gap-2 bg-[#1E3A5F] text-white px-6 py-3 rounded-xl text-sm hover:bg-[#0F2144] transition-all font-semibold shadow-md">
            <Plus size={18} /> Tambahkan Gedung Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map(b => (
            <div key={b.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col relative">
              <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditBuilding(b); setShowForm(true); }} className="p-2 bg-white/90 backdrop-blur text-blue-600 hover:bg-white rounded-lg shadow-sm" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(b.id, b.name)} className="p-2 bg-white/90 backdrop-blur text-red-600 hover:bg-white rounded-lg shadow-sm" title="Hapus">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                {b.image_url ? (
                  <img src={getImageUrl(b.image_url)} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Building2 size={48} className="text-slate-300" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                  <h3 className="text-xl font-bold text-white truncate">{b.name}</h3>
                </div>
              </div>
              
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-start gap-2 text-gray-600 text-sm">
                  <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">{b.address || "Alamat belum disetel"}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Layers size={15} className="text-purple-500" />
                    <span>{b.total_floors || 1} Lantai</span>
                  </div>
                  {b.lat && b.lng && (
                    <button onClick={() => window.open(`https://www.google.com/maps?q=${b.lat},${b.lng}`, '_blank')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-auto flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      Lihat Peta
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
    total_floors: building?.total_floors || 1
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(getImageUrl(building?.image_url) || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1 * 1024 * 1024) {
        setError("Ukuran gambar melebihi 1MB!");
        return;
      }
      if (!/^image\/(jpeg|png|jpg|webp)$/.test(file.type)) {
        setError("Format gambar harus JPG, PNG, atau WEBP");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lat || !form.lng) {
      setError("Anda wajib meletakkan pinpoint pada peta!");
      return;
    }
    if (!building && !imageFile) {
      setError("Gambar gedung wajib diunggah untuk gedung baru!");
      return;
    }

    setLoading(true); setError("");
    
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("address", form.address);
      formData.append("lat", form.lat);
      formData.append("lng", form.lng);
      formData.append("total_floors", form.total_floors.toString());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (building?.id) {
        await buildingService.update(building.id, formData);
      } else {
        await buildingService.create(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Gagal menyimpan gedung");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{building ? "Edit Profil Gedung" : "Daftarkan Gedung Baru"}</h3>
            <p className="text-xs text-gray-500 mt-1">Lengkapi data properti dan koordinat lokasinya.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* Kolom Kiri: Visual & Peta */}
          <div className="w-full md:w-5/12 bg-gray-50 p-6 border-r border-gray-100 space-y-6 flex flex-col shrink-0">
            
            {/* Foto Gedung */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Gedung <span className="text-red-500">*</span></label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full h-48 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all ${previewUrl ? 'border-transparent shadow-md' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50'}`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium flex items-center gap-2"><Edit2 size={16}/> Ganti Foto</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Pilih atau Tarik Gambar</p>
                    <p className="text-xs text-gray-500 mt-1">Maks. 1 MB (JPG/PNG/WEBP)</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg, image/png, image/webp" className="hidden" />
              </div>
            </div>

            {/* Peta Interaktif */}
            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">Pinpoint Peta <span className="text-red-500">*</span></label>
                {(form.lat && form.lng) && (
                  <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Koordinat Disetel</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">Klik pada peta di bawah ini untuk menentukan titik koordinat gedung.</p>
              
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0 relative min-h-[200px]">
                <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={markerPos} setPosition={setMarkerPos} />
                </MapContainer>
              </div>
            </div>
            
          </div>

          {/* Kolom Kanan: Form Data */}
          <div className="w-full md:w-7/12 p-6 bg-white space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50/50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><X size={12}/></div>
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Gedung <span className="text-red-500">*</span></label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50" placeholder="Contoh: Gedung Kemenko 1" />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat Lengkap</label>
                  <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50 resize-none" placeholder="Masukkan alamat lengkap gedung..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Lantai <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Layers size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type="number" min={1} value={form.total_floors} onChange={e => setForm({...form, total_floors: parseInt(e.target.value) || 1})} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50" placeholder="1" />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Latitude</label>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono select-all">
                    {form.lat || "Belum disetel"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Longitude</label>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono select-all">
                    {form.lng || "Belum disetel"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Batal</button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm font-semibold hover:bg-[#0F2144] transition-colors disabled:opacity-70 flex items-center gap-2 shadow-md">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Menyimpan...</>
                ) : (
                  <><Check size={18}/> {building ? "Simpan Perubahan" : "Daftarkan Gedung"}</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
