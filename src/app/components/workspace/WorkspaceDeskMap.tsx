import { useState, useEffect } from "react";
import { User, MapPin, Building, ShieldAlert, CheckCircle, HelpCircle, ArrowRight, UserCheck, AlertTriangle } from "lucide-react";
import { workspaceService, DeskNode } from "../../services/workspaceService";
import { buildingService, userService } from "../../services/index";
import { roomService, Room } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";
import { toast } from "sonner";

export function WorkspaceDeskMap({ initialRoomId }: { initialRoomId?: string }) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  
  const [layout, setLayout] = useState<DeskNode[]>([]);
  const [roomName, setRoomName] = useState("");
  const [loadingLayout, setLoadingLayout] = useState(false);
  
  // Selection / Relocation States
  const [selectedDesk, setSelectedDesk] = useState<DeskNode | null>(null);
  const [relocateSource, setRelocateSource] = useState<DeskNode | null>(null);
  const [relocateTarget, setRelocateTarget] = useState<DeskNode | null>(null);
  const [relocateRationale, setRelocateRationale] = useState("");
  const [isRelocatingMode, setIsRelocatingMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const currentUser = UserStore.get();
  const rawRole = currentUser?.rawRole || currentUser?.role || "USER";
  const isAdmin = rawRole === "ADMIN_KERJA" || rawRole === "SUPERADMIN";

  // Load buildings and workspaces
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const buildRes = await buildingService.list();
        setBuildings(buildRes.data || []);
        
        const roomRes = await roomService.list();
        const workspacesOnly = (roomRes.data || []).filter(r => r.jenis_manajemen_ruang === "WORKSPACE");
        setRooms(workspacesOnly);
        
        // Check for initialRoomId pre-selection
        if (initialRoomId) {
          const targetRoom = workspacesOnly.find(r => r.id === initialRoomId);
          if (targetRoom) {
            // Load floors for this target room's building
            const floorRes = await buildingService.listFloors(targetRoom.building_id);
            setFloors(floorRes.data || []);
            
            setSelectedBuilding(targetRoom.building_id);
            setSelectedFloor(targetRoom.floor_id || "");
            setSelectedRoom(targetRoom.id);
            return;
          }
        }
        
        // Auto-select first building if available
        if (buildRes.data && buildRes.data.length > 0) {
          setSelectedBuilding(buildRes.data[0].id);
        }
      } catch (err) {
        toast.error("Gagal memuat data awal ruangan kerja.");
      }
    };
    loadInitialData();
  }, [initialRoomId]);

  // Update floors when building changes
  useEffect(() => {
    if (selectedBuilding) {
      buildingService.listFloors(selectedBuilding).then(res => {
        const newFloors = res.data || [];
        setFloors(newFloors);
        
        // Keep selectedFloor if it is valid in new floors
        const isValid = newFloors.some(f => f.id === selectedFloor);
        if (!isValid) {
          if (newFloors.length > 0) {
            setSelectedFloor(newFloors[0].id);
          } else {
            setSelectedFloor("");
          }
        }
      }).catch(() => {});
    } else {
      setFloors([]);
      setSelectedFloor("");
    }
  }, [selectedBuilding]);

  // Load layout when room is selected
  const loadLayout = async (roomId: string) => {
    if (!roomId) return;
    setLoadingLayout(true);
    try {
      const res = await workspaceService.getLayout(roomId);
      if (res.success) {
        setLayout(res.desks || []);
        setRoomName(res.room_name || "");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat denah meja.");
    } finally {
      setLoadingLayout(false);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      loadLayout(selectedRoom);
      setSelectedDesk(null);
      setRelocateSource(null);
      setRelocateTarget(null);
      setIsRelocatingMode(false);
    } else {
      setLayout([]);
      setRoomName("");
    }
  }, [selectedRoom]);

  // Filter rooms based on building & floor selection
  const filteredRooms = rooms.filter(r => 
    r.building_id === selectedBuilding && 
    r.floor_id === selectedFloor
  );

  // Auto-select room when filteredRooms changes
  useEffect(() => {
    if (filteredRooms.length > 0) {
      const isValid = filteredRooms.some(r => r.id === selectedRoom);
      if (!isValid) {
        setSelectedRoom(filteredRooms[0].id);
      }
    } else {
      setSelectedRoom("");
    }
  }, [selectedBuilding, selectedFloor, rooms]);


  const handleDeskClick = (desk: DeskNode) => {
    if (isRelocatingMode) {
      if (desk.status === "VACANT") {
        setRelocateTarget(desk);
      } else {
        toast.warning("Meja tujuan relokasi harus dalam status KOSONG (VACANT).");
      }
    } else {
      setSelectedDesk(desk);
    }
  };

  const handleRequestSeating = async () => {
    if (!selectedRoom || !selectedDesk) return;
    if (rawRole !== "USER") {
      toast.error("Hanya role USER yang diizinkan untuk mengajukan penempatan meja.");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await workspaceService.submitRequest(selectedRoom, selectedDesk.desk_id);
      toast.success("Permintaan penempatan meja berhasil dikirim ke Admin!");
      loadLayout(selectedRoom);
      setSelectedDesk(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim pengajuan.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStartRelocation = (desk: DeskNode) => {
    setRelocateSource(desk);
    setRelocateTarget(null);
    setRelocateRationale("");
    setIsRelocatingMode(true);
    setSelectedDesk(null);
    toast.info(`Mode Relokasi Aktif: Silakan pilih meja tujuan baru untuk pegawai.`);
  };

  const handleCancelRelocation = () => {
    setIsRelocatingMode(false);
    setRelocateSource(null);
    setRelocateTarget(null);
    setRelocateRationale("");
  };

  const handleExecuteRelocation = async () => {
    if (!relocateSource || !relocateTarget) {
      toast.error("Meja asal dan meja tujuan wajib dipilih.");
      return;
    }
    if (relocateRationale.trim().length < 10) {
      toast.error("Alasan pemindahan dinas wajib diisi, minimal 10 karakter.");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await workspaceService.relocate(
        relocateSource.desk_id,
        relocateTarget.desk_id,
        relocateRationale
      );
      if (res.success) {
        toast.success("Pegawai berhasil dipindahkan secara dinas administratif!");
        setIsRelocatingMode(false);
        setRelocateSource(null);
        setRelocateTarget(null);
        setRelocateRationale("");
        loadLayout(selectedRoom);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan relokasi.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Selector Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-150 p-6 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="flex flex-col min-w-[160px]">
            <label className="text-xs text-gray-400 font-bold mb-1.5 flex items-center gap-1">
              <Building size={12} /> Gedung
            </label>
            <select
              value={selectedBuilding}
              onChange={e => setSelectedBuilding(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white text-gray-700 font-medium"
            >
              <option value="" disabled>Pilih Gedung</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col min-w-[140px]">
            <label className="text-xs text-gray-400 font-bold mb-1.5 flex items-center gap-1">
              <MapPin size={12} /> Lantai
            </label>
            <select
              value={selectedFloor}
              onChange={e => setSelectedFloor(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white text-gray-700 font-medium"
              disabled={floors.length === 0}
            >
              {floors.length === 0 && <option value="">Tidak ada lantai</option>}
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs text-gray-400 font-bold mb-1.5 flex items-center gap-1">
              <UserCheck size={12} /> Ruang Kerja
            </label>
            <select
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white text-gray-700 font-medium"
              disabled={filteredRooms.length === 0}
            >
              {filteredRooms.length === 0 && <option value="">Tidak ada workspace</option>}
              {filteredRooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-gray-400 font-semibold block">Tipe Manajemen</span>
          <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full font-bold block mt-1">
            WORKSPACE SEATING
          </span>
        </div>
      </div>

      {isRelocatingMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="text-amber-600" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800">Mode Override Relokasi Dosen/Pegawai Aktif</h4>
              <p className="text-xs text-amber-700">
                Pindahkan pegawai dari <strong>{relocateSource?.desk_id}</strong> ke meja kosong tujuan.
                {relocateTarget ? (
                  <> Meja tujuan terpilih: <span className="font-bold text-blue-600 underline">{relocateTarget.desk_id}</span></>
                ) : (
                  " Silakan klik meja kosong hijau di bawah sebagai meja tujuan."
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancelRelocation}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs rounded-xl font-semibold"
            >
              Batal Relokasi
            </button>
          </div>
        </div>
      )}

      {/* Main Floor Plan Grid & Action Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Floor Plan Display Panel */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-800">{roomName || "Visual Floor Plan"}</h3>
              <p className="text-xs text-gray-400">Denah geometris posisi tempat duduk secara spatial real-time</p>
            </div>
            {/* Floor Map Legend */}
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-green-500 rounded-full border border-white shadow" />
                <span className="text-gray-500 font-medium">Kosong</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border border-white shadow" />
                <span className="text-gray-500 font-medium">Terisi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gray-300 rounded-full border border-white shadow" />
                <span className="text-gray-500 font-medium">Nonaktif/Rusak</span>
              </div>
            </div>
          </div>

          {loadingLayout ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-semibold">Memuat denah meja...</span>
            </div>
          ) : layout.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
              <Building size={36} className="mb-2 text-gray-300" />
              <span className="text-sm font-semibold">Tidak Ada Ruangan Terpilih</span>
              <p className="text-xs text-gray-400 max-w-xs mt-1">Silakan pilih gedung dan ruangan kerja melalui filter di atas.</p>
            </div>
          ) : (
            /* Spatial Seating Layout Plan */
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="grid grid-cols-5 md:grid-cols-8 gap-4 w-full max-w-2xl bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                {layout.map(desk => {
                  const isSelected = selectedDesk?.desk_id === desk.desk_id;
                  const isSource = relocateSource?.desk_id === desk.desk_id;
                  const isTarget = relocateTarget?.desk_id === desk.desk_id;
                  
                  let bgColor = "bg-green-50 hover:bg-green-100 text-green-700 border-green-300";
                  if (desk.status === "OCCUPIED") {
                    bgColor = "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300";
                  } else if (desk.status === "DISABLED") {
                    bgColor = "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed";
                  }
                  
                  if (isSelected) {
                    bgColor = "bg-green-500 text-white border-green-600 shadow-md transform scale-105 ring-2 ring-green-300";
                  }
                  if (isSource) {
                    bgColor = "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300 scale-95";
                  }
                  if (isTarget) {
                    bgColor = "bg-blue-600 text-white border-blue-700 shadow-md transform scale-105 ring-2 ring-blue-300 animate-pulse";
                  }

                  return (
                    <div
                      key={desk.desk_id}
                      onClick={() => desk.status !== "DISABLED" && handleDeskClick(desk)}
                      className={`relative group h-14 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${bgColor}`}
                    >
                      <span className="text-[10px] font-bold tracking-tight">{desk.desk_id}</span>
                      
                      {desk.status === "OCCUPIED" && !isSource && !isTarget && (
                        <div className="w-5 h-5 bg-blue-200 border border-blue-400 rounded-full flex items-center justify-center mt-1 overflow-hidden">
                          {desk.avatar_url ? (
                            <img src={desk.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={10} className="text-blue-700" />
                          )}
                        </div>
                      )}
                      
                      {/* Premium Hover Card for OCCUPIED seats */}
                      {desk.status === "OCCUPIED" && !isRelocatingMode && (
                        <div className="absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl shadow-xl border border-gray-150 p-3 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 translate-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center overflow-hidden">
                              {desk.avatar_url ? (
                                <img src={desk.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User size={14} className="text-blue-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-800 block truncate">{desk.name || "Pegawai OIKN"}</span>
                              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">{desk.desk_id} (Terisi)</span>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRelocation(desk);
                              }}
                              className="w-full mt-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[10px] rounded-lg font-bold transition-all block text-center"
                            >
                              Pindahkan Pegawai
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel Column */}
        <div className="space-y-6">
          {/* Relocation Wizard Panel */}
          {isRelocatingMode ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">Relokasi Dinas</span>
                <h3 className="text-sm font-bold text-gray-800 mt-2">Formulir Pemindahan Pegawai</h3>
                <p className="text-xs text-gray-400">Pindahkan pegawai terpilih ke koordinat meja yang baru</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-gray-50/50">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block">Pegawai Asal</span>
                    <span className="text-xs font-bold text-gray-800">{relocateSource?.name || "Pegawai Terpilih"}</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded">
                    {relocateSource?.desk_id}
                  </span>
                </div>

                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="text-gray-400" size={18} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-300 bg-blue-50/20">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block">Meja Tujuan Baru</span>
                    <span className="text-xs font-bold text-gray-800">
                      {relocateTarget ? `Meja ${relocateTarget.desk_id}` : "Pilih di denah meja sebelah kiri"}
                    </span>
                  </div>
                  {relocateTarget ? (
                    <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded">
                      {relocateTarget.desk_id}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-bold italic animate-pulse">Menunggu Pilihan...</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-gray-400 font-bold uppercase">Alasan Pemindahan Dinas <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Pemindahan divisi kerja untuk optimalisasi kinerja operasional tim (min. 10 karakter)"
                    value={relocateRationale}
                    onChange={e => setRelocateRationale(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white"
                  />
                  <div className="text-[10px] text-right font-medium text-gray-400">
                    Karakter: <span className={relocateRationale.trim().length >= 10 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{relocateRationale.trim().length}</span> / 10 min
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!relocateSource || !relocateTarget || relocateRationale.trim().length < 10 || submitLoading}
                  onClick={handleExecuteRelocation}
                  className={`w-full py-2.5 rounded-xl text-xs text-white font-bold transition-all flex items-center justify-center gap-1.5 ${
                    relocateSource && relocateTarget && relocateRationale.trim().length >= 10 && !submitLoading
                      ? "bg-amber-600 hover:bg-amber-700 shadow-md"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  }`}
                >
                  {submitLoading ? "Memindahkan..." : "Eksekusi Relokasi"}
                </button>
              </div>
            </div>
          ) : (
            /* Regular Seating Request / Detail Panel */
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Detail Tempat Duduk</h3>
                <p className="text-xs text-gray-400">Pilih salah satu meja kerja untuk melihat status penempatan</p>
              </div>

              {selectedDesk ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-150 bg-gray-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedDesk.status === "VACANT" ? "bg-green-500" : "bg-blue-500"}`}>
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 font-semibold block">ID Node Meja</span>
                        <span className="text-sm font-bold text-gray-800">{selectedDesk.desk_id}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      selectedDesk.status === "VACANT"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                    }`}>
                      {selectedDesk.status === "VACANT" ? "Kosong" : "Terisi"}
                    </span>
                  </div>

                  {selectedDesk.status === "VACANT" ? (
                    <div className="space-y-3">
                      <div className="bg-green-50/50 border border-green-100 rounded-xl p-3.5 flex items-start gap-2.5">
                        <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                        <div className="text-xs text-green-800 leading-normal">
                          Meja ini saat ini kosong. Pegawai dapat mengajukan pemesanan penugasan tempat duduk ini sebagai lokasi kerja permanen Anda.
                        </div>
                      </div>
                      {rawRole === "USER" ? (
                        <button
                          type="button"
                          disabled={submitLoading}
                          onClick={handleRequestSeating}
                          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          {submitLoading ? "Mengajukan..." : "Ajukan Penempatan"}
                        </button>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                          Hanya role USER (Pegawai) yang dapat mengajukan penempatan meja kosong ini.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {selectedDesk.avatar_url ? (
                            <img src={selectedDesk.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="text-blue-700" size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs text-gray-400 font-semibold block">Nama Pegawai</span>
                          <span className="text-xs font-bold text-gray-800 block truncate">{selectedDesk.name || "Pegawai Terdaftar"}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleStartRelocation(selectedDesk)}
                          className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          Pindahkan Pegawai secara Dinas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 border border-dashed border-gray-150 rounded-xl bg-gray-50/30">
                  <HelpCircle size={24} className="mx-auto mb-2 text-gray-300" />
                  <span className="text-xs font-semibold">Belum Ada Meja Terpilih</span>
                  <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto mt-0.5">Silakan pilih salah satu node meja di samping untuk melihat opsi tindakan.</p>
                </div>
              )}
            </div>
          )}

          {/* Info Card Seating Rule */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-slate-600" /> Aturan Penggunaan Workspace
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-600 pl-4 list-disc leading-normal">
              <li>
                <strong>Alokasi Permanen:</strong> Berbeda dari ruang rapat, alokasi meja bersifat ongoing (tidak berbatas waktu) hingga pegawai dipindahkan secara dinas oleh Admin atau mengajukan pindah.
              </li>
              <li>
                <strong>Satu Pegawai Satu Meja:</strong> Sistem secara otomatis melepaskan meja kerja lama Anda ketika permohonan meja baru Anda disetujui oleh Admin.
              </li>
              <li>
                <strong>Persetujuan Manual:</strong> Setiap pengajuan meja kerja baru membutuhkan persetujuan dari Admin Ruangan Kerja area kelola bersangkutan.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
