import { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, Shield, User, Cpu, Check, Edit2, AlertTriangle, X, Building2, UserCog, RefreshCw } from "lucide-react";
import { userService, buildingService } from "../../services/index";
import { roomService } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";

type Role = "user" | "admin" | "superadmin" | "api" | "ADMIN_RAPAT" | "ADMIN_KERJA" | "SUPERADMIN" | "USER";
type Status = "active" | "inactive";

const roleConfig: Record<string, { icon: any; label: string; color: string; desc: string }> = {
  user:       { icon: <User size={14} />,    label: "Pengguna Biasa",  color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",   desc: "Dapat melihat & booking ruangan" },
  USER:       { icon: <User size={14} />,    label: "Pengguna Biasa",  color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",   desc: "Dapat melihat & booking ruangan" },
  admin:      { icon: <Shield size={14} />,  label: "Admin Ruangan",   color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", desc: "Mengelola ruangan & menyetujui booking" },
  ADMIN_RAPAT:{ icon: <Shield size={14} />,  label: "Admin Ruangan Rapat", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", desc: "Hanya mengelola ruangan rapat (Meeting Room)" },
  ADMIN_KERJA:{ icon: <Shield size={14} />,  label: "Admin Ruangan Kerja", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300", desc: "Hanya mengelola ruangan kerja (Workspace)" },
  superadmin: { icon: <UserCog size={14} />, label: "Super Admin",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",    desc: "Akses penuh ke seluruh sistem" },
  SUPERADMIN: { icon: <UserCog size={14} />, label: "Super Admin",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",    desc: "Akses penuh ke seluruh sistem" },
  api:        { icon: <Cpu size={14} />,     label: "Akun API",        color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300", desc: "Integrasi layanan eksternal" },
};

const filterBuildingsForRole = (buildingsList: any[], role: string) => {
  if (!role) return buildingsList;
  const rUpper = role.toUpperCase();
  if (rUpper === "SUPERADMIN" || rUpper === "USER" || rUpper === "admin") {
    return buildingsList;
  }
  return buildingsList.map(b => {
    const filteredFloors = (b.floors || []).map((f: any) => {
      const filteredRooms = (f.rooms || []).filter((r: any) => {
        if (rUpper === "ADMIN_RAPAT") return r.jenis_manajemen_ruang === "MEETING_ROOM";
        if (rUpper === "ADMIN_KERJA") return r.jenis_manajemen_ruang === "WORKSPACE";
        return true;
      });
      return { ...f, rooms: filteredRooms };
    }).filter((f: any) => f.rooms.length > 0);
    return { ...b, floors: filteredFloors };
  }).filter(b => b.floors.length > 0);
};

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [editModal, setEditModal] = useState<any>(null);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "matrix">("users");
  const [selectedMatrixRoom, setSelectedMatrixRoom] = useState<any>(null);
  const [savingMatrixUserId, setSavingMatrixUserId] = useState<string | null>(null);

  const currentUser = UserStore.get();
  const isHyperAdmin = currentUser?.id === "u-super" || currentUser?.email === "superadmin@oikn.go.id";

  const load = async () => {
    setLoading(true);
    try {
      const res = await userService.list({ role: filterRole !== "all" ? filterRole : undefined, status: filterStatus !== "all" ? filterStatus : undefined, search: search || undefined });
      setUsers(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadBuildings = async () => {
    try {
      const res = await buildingService.list();
      const bList = res.data || [];
      const roomsRes = await roomService.list();
      const allRooms = roomsRes.data || [];
      const withFloors = await Promise.all(bList.map(async (b: any) => {
        const fRes = await buildingService.listFloors(b.id);
        const floors = (fRes.data || []).map((f: any) => {
          const floorRooms = allRooms.filter((r: any) => r.floor_id === f.id);
          return { ...f, rooms: floorRooms };
        });
        return { ...b, floors };
      }));
      setBuildings(withFloors);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    loadBuildings();
  }, [filterRole, filterStatus]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const openAssign = async (user: any) => {
    setAssignModal(user);
    if (buildings.length === 0) {
      await loadBuildings();
    }
  };

  const handleSaveRole = async (userId: string, role: Role, status: Status, selectedRooms?: string[]) => {
    try {
      const isAdminRole = role === "admin" || role === "ADMIN_RAPAT" || role === "ADMIN_KERJA";
      if (isAdminRole && (!selectedRooms || selectedRooms.length === 0)) {
        alert("Wilayah tugas wajib diisi untuk Admin Ruangan!");
        return;
      }
      await userService.updateRole(userId, role);
      await userService.updateStatus(userId, status);
      if (isAdminRole && selectedRooms) {
        await userService.updateRoomAssignment(userId, selectedRooms);
      }
      await load();
    } catch (e: any) { alert(e.message || "Gagal memperbarui"); }
    setEditModal(null);
  };

  const handleSaveAssignment = async (userId: string, roomIds: string[]) => {
    try {
      await userService.updateRoomAssignment(userId, roomIds);
      await load();
    } catch (e: any) { alert(e.message || "Gagal menyimpan wilayah tugas"); }
    setAssignModal(null);
  };

  const filteredUsers = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    const isUserAdmin = u.role === "admin" || u.rawRole === "ADMIN_RAPAT" || u.rawRole === "ADMIN_KERJA";
    const isActiveAdminFilter = filterRole === "admin" || filterRole === "ADMIN_RAPAT" || filterRole === "ADMIN_KERJA";
    if (isActiveAdminFilter && filterRoom !== "all") {
      const hasRoom = u.assignedRooms?.some((r: any) => r.room_id === filterRoom);
      if (!hasRoom) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-gray-800 transition-colors duration-300 dark:text-slate-100" style={{ fontWeight: 700 }}>Manajemen Pengguna</h2>
        <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Kelola akun, peran, dan delegasi wilayah tugas admin</p>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 transition-colors duration-300 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === "users"
              ? "border-[#1E3A5F] text-[#1E3A5F] dark:text-blue-400"
              : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
          }`}
        >
          <User size={16} />
          Daftar Pengguna
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === "matrix"
              ? "border-[#1E3A5F] text-[#1E3A5F] dark:text-blue-400"
              : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
          }`}
        >
          <Building2 size={16} />
          Matriks Penugasan Ruangan (Room Assignment Matrix)
        </button>
      </div>

      {activeTab === "users" && (
        <>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300 dark:text-slate-500" />
              <input type="text" placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white backdrop-blur-md transition-all duration-300 dark:bg-slate-900/90 dark:border-slate-700/50" />
            </div>
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setFilterRoom("all"); }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white backdrop-blur-md transition-all duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
              <option value="all">Semua Peran</option>
              <option value="user">Pengguna Biasa</option>
              <option value="admin">Semua Admin Ruangan</option>
              <option value="ADMIN_RAPAT">Admin Ruangan Rapat</option>
              <option value="ADMIN_KERJA">Admin Ruangan Kerja</option>
              <option value="superadmin">Super Admin</option>
            </select>
            {(filterRole === "admin" || filterRole === "ADMIN_RAPAT" || filterRole === "ADMIN_KERJA") && (
              <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white backdrop-blur-md transition-all duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
                <option value="all">Semua Wilayah Tugas</option>
                {buildings.flatMap((b: any) =>
                  (b.floors || []).flatMap((f: any) =>
                    (f.rooms || []).map((r: any) => (
                      <option key={r.id} value={r.id}>{b.name} - {r.name}</option>
                    ))
                  )
                )}
              </select>
            )}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white backdrop-blur-md transition-all duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            <button type="submit" className="px-4 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] flex items-center gap-2 transition-all duration-300">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Cari
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white backdrop-blur-md border border-gray-200 rounded-2xl overflow-hidden transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 transition-colors duration-300 dark:bg-slate-800/80 dark:border-slate-800/50">
                      {["Pengguna", "Peran", "Wilayah Tugas", "Status", "Kedisiplinan", "Bergabung", "Aksi"].map(h => (
                        <th key={h} className={`${h === "Aksi" ? "text-right" : "text-left"} px-5 py-3.5 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider`} style={{ fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 transition-colors duration-300">
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400 transition-colors duration-300 dark:text-slate-500">Tidak ada pengguna ditemukan</td></tr>
                    ) : filteredUsers.map(user => {
                      const roleCfg = roleConfig[(user.rawRole || user.role) as string] || roleConfig.user;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
                                {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "??"}
                              </div>
                              <div>
                                <span className="text-sm text-gray-800 transition-colors duration-300 dark:text-slate-100" style={{ fontWeight: 500 }}>{user.name}</span>
                                <div className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${roleCfg.color}`} style={{ fontWeight: 500 }}>
                              {roleCfg.icon}{roleCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {user.role === "admin" ? (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {user.assignedRooms && user.assignedRooms.length > 0 ? (
                                  user.assignedRooms.map((r: any) => (
                                    <span key={r.room_id} className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition-colors duration-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30">
                                      {r.room_name}
                                      <span className={`text-[8px] px-1 py-0 rounded ${r.jenis_manajemen_ruang === 'WORKSPACE' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}`}>
                                        {r.jenis_manajemen_ruang === 'WORKSPACE' ? 'Kerja' : 'Rapat'}
                                      </span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-red-500 font-medium">Belum ada wilayah tugas</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${user.status === "active" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"}`} style={{ fontWeight: 500 }}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-green-50 dark:bg-green-900/200" : "bg-gray-400"}`} />
                              {user.status === "active" ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-700 font-medium transition-colors duration-300 dark:text-slate-200">
                                {user.total_bookings || 0} Pesanan
                              </span>
                              {user.total_noshows > 0 ? (
                                <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                                  (user.total_noshows / (user.total_bookings || 1)) >= 0.3
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 animate-pulse"
                                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30"
                                }`}>
                                  <AlertTriangle size={10} />
                                  {user.total_noshows} Hangus ({Math.round((user.total_noshows / (user.total_bookings || 1)) * 100)}%)
                                </span>
                              ) : (
                                <span className="text-[10px] w-fit bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 transition-colors duration-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30">
                                  <Check size={10} />
                                  0 No-Show
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">{user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID") : "–"}</td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2 justify-end">
                              {user.role === "admin" && (
                                <button onClick={() => openAssign(user)} className="px-3 py-1.5 text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-1 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50">
                                  <Building2 size={11} /> Wilayah Tugas
                                </button>
                              )}
                              {!(user.role === "superadmin" && !isHyperAdmin) ? (
                                <button onClick={() => setEditModal(user)} className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 flex items-center gap-1 transition-colors dark:text-slate-300 dark:border-slate-700/50">
                                  <Edit2 size={11} /> Edit Peran
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 italic px-3 py-1.5 transition-colors duration-300 dark:text-slate-500">Super Admin Utama</span>
                              )}
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
        </>
      )}

      {activeTab === "matrix" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white backdrop-blur-md border border-gray-200 rounded-2xl overflow-hidden p-6 animate-fadeIn transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
          {/* Left panel: Room Tree-View */}
          <div className="border-r border-gray-100 pr-6 space-y-4 transition-colors duration-300 dark:border-slate-800/50">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 transition-colors duration-300 dark:text-slate-200">Pilih Aset Ruangan</h3>
              <p className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">Pilih ruangan rapat atau kerja untuk mengelola delegasi admin</p>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {buildings.length === 0 && <p className="text-xs text-gray-400 italic transition-colors duration-300 dark:text-slate-500">Memuat data gedung & ruangan...</p>}
              {buildings.map((building: any) => (
                <div key={building.id} className="border border-gray-150 rounded-xl overflow-hidden bg-gray-50/50 transition-colors duration-300 dark:bg-slate-800/50 dark:border-slate-700/50">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100/50 font-bold text-xs text-gray-600 transition-colors duration-300 dark:bg-slate-700/50 dark:text-slate-300">
                    <span>{building.name}</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {(building.floors || []).map((floor: any) => (
                      <div key={floor.id} className="space-y-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase transition-colors duration-300 dark:text-slate-400">{floor.name}</div>
                        <div className="pl-2 space-y-1">
                          {(floor.rooms || []).map((room: any) => {
                            const isSelected = selectedMatrixRoom?.id === room.id;
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => setSelectedMatrixRoom(room)}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                                  isSelected
                                    ? "bg-[#1E3A5F] text-white font-medium font-bold"
                                    : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:text-white"
                                }`}
                              >
                                <span className="truncate">{room.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                  room.jenis_manajemen_ruang === "WORKSPACE"
                                    ? isSelected ? "bg-indigo-500 text-white" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-semibold"
                                    : isSelected ? "bg-purple-500 text-white" : "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-semibold"
                                }`}>
                                  {room.jenis_manajemen_ruang === "WORKSPACE" ? "Kerja" : "Rapat"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Admin Assignment Matrix */}
          <div className="md:col-span-2 space-y-6">
            {selectedMatrixRoom ? (
              <>
                <div className="p-4 rounded-2xl border border-gray-150 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300 dark:bg-slate-800/50 dark:border-slate-700/50">
                  <div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE"
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    }`}>
                      {selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE" ? "Workspace (Ruang Kerja)" : "Meeting Room (Ruang Rapat)"}
                    </span>
                    <h4 className="text-base font-bold text-gray-800 mt-2 transition-colors duration-300 dark:text-slate-100">{selectedMatrixRoom.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 transition-colors duration-300 dark:text-slate-400">
                      Maks. Kapasitas: {selectedMatrixRoom.total_meja_kerja ? `${selectedMatrixRoom.total_meja_kerja} Meja Kerja` : "Berbasis Durasi Pertemuan"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">UUID Pintu</p>
                    <code className="text-xs text-[#1E3A5F] font-mono font-bold bg-white backdrop-blur-md px-2 py-1 rounded border border-gray-200 block mt-1 transition-colors duration-300 dark:bg-slate-900/90 dark:text-blue-400 dark:border-slate-700/50">
                      {selectedMatrixRoom.qr_token || "N/A"}
                    </code>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 transition-colors duration-300 dark:text-slate-200">Daftar Akun Admin Terdelegasi</h4>
                    <p className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">
                      {selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE"
                        ? "Menampilkan Admin Ruangan Kerja (ADMIN_KERJA). Centang admin untuk mendelegasikan ruangan kerja ini."
                        : "Menampilkan Admin Ruangan Rapat (ADMIN_RAPAT). Centang admin untuk mendelegasikan ruangan rapat ini."}
                    </p>
                  </div>

                  <div className="border border-gray-150 rounded-2xl divide-y divide-gray-100 dark:divide-slate-800/50 bg-white backdrop-blur-md overflow-hidden max-h-[350px] overflow-y-auto transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
                    {users.filter(u => {
                      const r = u.rawRole || u.role;
                      if (selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE") {
                        return r === "ADMIN_KERJA";
                      } else {
                        return r === "ADMIN_RAPAT";
                      }
                    }).length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">
                        Tidak ada akun admin bertipe{" "}
                        <strong>
                          {selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE"
                            ? "ADMIN_KERJA"
                            : "ADMIN_RAPAT"}
                        </strong>{" "}
                        tersedia. Ubah peran akun pegawai terlebih dahulu menjadi admin di tab Daftar Pengguna.
                      </div>
                    ) : (
                      users
                        .filter(u => {
                          const r = u.rawRole || u.role;
                          if (selectedMatrixRoom.jenis_manajemen_ruang === "WORKSPACE") {
                            return r === "ADMIN_KERJA";
                          } else {
                            return r === "ADMIN_RAPAT";
                          }
                        })
                        .map(adminUser => {
                          const isAssigned = adminUser.assignedRooms?.some((r: any) => r.room_id === selectedMatrixRoom.id);
                          const isSaving = savingMatrixUserId === adminUser.id;

                          const handleCheckboxChange = async () => {
                            setSavingMatrixUserId(adminUser.id);
                            try {
                              const currentRooms = adminUser.assignedRooms?.map((r: any) => r.room_id) || [];
                              const newRooms = isAssigned
                                ? currentRooms.filter((id: string) => id !== selectedMatrixRoom.id)
                                : [...currentRooms, selectedMatrixRoom.id];
                              
                              await userService.updateRoomAssignment(adminUser.id, newRooms);
                              await load();
                            } catch (e: any) {
                              alert(e.message || "Gagal memperbarui matriks");
                            } finally {
                              setSavingMatrixUserId(null);
                            }
                          };

                          return (
                            <div key={adminUser.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-semibold">
                                  {adminUser.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "??"}
                                </div>
                                <div>
                                  <span className="text-xs text-gray-800 font-semibold block transition-colors duration-300 dark:text-slate-100">{adminUser.name}</span>
                                  <span className="text-[10px] text-gray-400 transition-colors duration-300 dark:text-slate-500">{adminUser.email}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {isSaving ? (
                                  <div className="w-4 h-4 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleCheckboxChange}
                                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                      isAssigned
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-gray-300 dark:border-slate-600 hover:border-blue-400 bg-white dark:bg-slate-900/90 backdrop-blur-md"
                                    }`}
                                  >
                                    {isAssigned && <Check size={12} className="text-white" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[400px] border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 transition-colors duration-300 dark:bg-slate-800/50 dark:border-slate-700/50">
                <Building2 size={36} className="text-gray-300 mb-3" />
                <h4 className="text-sm font-semibold text-gray-700 transition-colors duration-300 dark:text-slate-200">Pilih Ruangan Terlebih Dahulu</h4>
                <p className="text-xs text-gray-400 max-w-sm mt-1 transition-colors duration-300 dark:text-slate-500">
                  Gunakan panel kiri untuk menyeleksi ruangan rapat atau kerja. Matriks delegasi multi-admin akan ditampilkan secara interaktif di panel ini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {editModal && (
        <RoleEditModal user={editModal} currentRole={editModal.role as Role} currentStatus={editModal.status as Status} buildings={buildings}
          onSave={async (role, status, selectedRooms) => { await handleSaveRole(editModal.id, role, status, selectedRooms); }}
          onClose={() => setEditModal(null)} />
      )}

      {assignModal && (
        <AssignModal user={assignModal} buildings={buildings} onClose={() => setAssignModal(null)}
          onSave={(roomIds) => handleSaveAssignment(assignModal.id, roomIds)} />
      )}
    </div>
  );
}

function AssignModal({ user, buildings, onClose, onSave }: any) {
  const userRole = user.rawRole || user.role;
  const filteredBuildings = filterBuildingsForRole(buildings, userRole);
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>(filteredBuildings[0] ? [filteredBuildings[0].id] : []);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    user.assignedRooms ? user.assignedRooms.map((r: any) => r.room_id) : []
  );

  const toggleBuilding = (id: string) => setExpandedBuildings(p => p.includes(id) ? p.filter(b => b !== id) : [...p, id]);
  const toggleRoom = (id: string) => setSelectedRooms(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white backdrop-blur-md rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col transition-colors duration-300 dark:bg-slate-900/90">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between transition-colors duration-300 dark:border-slate-800/50">
          <div>
            <h3 className="text-gray-800 font-bold transition-colors duration-300 dark:text-slate-100">Atur Wilayah Tugas</h3>
            <p className="text-sm text-gray-500 mt-1 transition-colors duration-300 dark:text-slate-400">Admin: <span className="font-semibold">{user.name}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all duration-300 dark:text-slate-500"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {filteredBuildings.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8 transition-colors duration-300 dark:text-slate-500">
              Tidak ada aset ruangan yang sesuai dengan sub-peran admin ini.
            </p>
          )}
          {filteredBuildings.map((building: any) => (
            <div key={building.id} className="border border-gray-200 rounded-2xl overflow-hidden transition-colors duration-300 dark:border-slate-700/50">
              <button onClick={() => toggleBuilding(building.id)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800/80">
                <span className="text-sm text-gray-700 font-bold transition-colors duration-300 dark:text-slate-200">{building.name}</span>
                {expandedBuildings.includes(building.id) ? <ChevronDown size={16} className="text-gray-400 transition-colors duration-300 dark:text-slate-500" /> : <ChevronRight size={16} className="text-gray-400 transition-colors duration-300 dark:text-slate-500" />}
              </button>
              {expandedBuildings.includes(building.id) && (
                <div className="px-4 py-3">
                  {(building.floors || []).map((floor: any) => (
                    <div key={floor.id} className="mb-3">
                      <div className="text-xs text-gray-400 mb-2 font-bold transition-colors duration-300 dark:text-slate-500">{floor.name}</div>
                      <div className="space-y-2">
                        {(floor.rooms || []).map((room: any) => (
                          <label key={room.id} className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => toggleRoom(room.id)}
                              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${selectedRooms.includes(room.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-slate-600 hover:border-blue-400"}`}>
                              {selectedRooms.includes(room.id) && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-sm text-gray-600 transition-colors duration-300 dark:text-slate-300">{room.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${room.jenis_manajemen_ruang === 'WORKSPACE' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}`}>
                              {room.jenis_manajemen_ruang === 'WORKSPACE' ? 'Workspace' : 'Meeting Room'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 transition-colors duration-300 dark:border-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all duration-300 dark:text-slate-300 dark:border-slate-700/50">Batal</button>
          <button onClick={() => onSave(selectedRooms)} className="px-4 py-2 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] transition-all duration-300">Simpan Matriks</button>
        </div>
      </div>
    </div>
  );
}

function RoleEditModal({ user, currentRole, currentStatus, buildings, onSave, onClose }: {
  user: any; currentRole: Role; currentStatus: Status; buildings: any[]; onSave: (role: Role, status: Status, selectedRooms?: string[]) => void; onClose: () => void;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [status, setStatus] = useState<Status>(currentStatus);
  const [confirmSuperadmin, setConfirmSuperadmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentUser = UserStore.get();
  const isHyperAdmin = currentUser?.id === "u-super" || currentUser?.email === "superadmin@oikn.go.id";

  const filteredBuildings = filterBuildingsForRole(buildings, role);
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>(filteredBuildings[0] ? [filteredBuildings[0].id] : []);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    user.assignedRooms ? user.assignedRooms.map((r: any) => r.room_id) : []
  );

  const toggleBuilding = (id: string) => setExpandedBuildings(p => p.includes(id) ? p.filter(b => b !== id) : [...p, id]);
  const toggleRoom = (id: string) => setSelectedRooms(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  const roleOptions = [
    { value: "USER" as Role, label: "Pengguna Biasa", desc: "Dapat melihat kalender dan melakukan booking ruangan/meja", color: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-400", icon: <User size={18} className="text-blue-600 transition-colors duration-300 dark:text-blue-400" /> },
    { value: "ADMIN_RAPAT" as Role, label: "Admin Ruangan Rapat", desc: "Hanya mengelola ruangan rapat (Meeting Room) & menyetujui booking", color: "bg-purple-50 dark:bg-purple-900/20", borderColor: "border-purple-400", icon: <Shield size={18} className="text-purple-600 transition-colors duration-300 dark:text-purple-400" /> },
    { value: "ADMIN_KERJA" as Role, label: "Admin Ruangan Kerja", desc: "Hanya mengelola ruangan kerja (Workspace) & penugasan meja", color: "bg-indigo-50 dark:bg-indigo-900/20", borderColor: "border-indigo-400", icon: <Shield size={18} className="text-indigo-600 transition-colors duration-300 dark:text-indigo-400" /> },
    ...(isHyperAdmin ? [
      { value: "SUPERADMIN" as Role, label: "Super Admin", desc: "Akses penuh: kelola pengguna, kebijakan global, audit trail", color: "bg-red-50 dark:bg-red-900/20", borderColor: "border-red-400", icon: <UserCog size={18} className="text-red-600 transition-colors duration-300 dark:text-red-400" />, warn: true }
    ] : [])
  ];

  const isAdminRole = role === "admin" || role === "ADMIN_RAPAT" || role === "ADMIN_KERJA";

  const handleSave = () => {
    if (isAdminRole && selectedRooms.length === 0) {
      alert("Admin Ruangan wajib memiliki minimal 1 Wilayah Tugas!");
      return;
    }
    if (role === "SUPERADMIN" && !confirmSuperadmin) { setConfirmSuperadmin(true); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSaved(true); setTimeout(() => onSave(role, status, selectedRooms), 800); }, 500);
  };

  const hasChanges = role !== currentRole || status !== currentStatus || (isAdminRole && JSON.stringify(selectedRooms.sort()) !== JSON.stringify((user.assignedRooms?.map((r: any) => r.room_id) || []).sort()));

  if (saved) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white backdrop-blur-md rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl transition-colors duration-300 dark:bg-slate-900/90">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 dark:bg-green-900/40"><Check size={26} className="text-green-500" /></div>
        <h3 className="text-gray-800 mb-1 font-bold transition-colors duration-300 dark:text-slate-100">Peran Diperbarui!</h3>
        <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400"><span className="font-semibold">{user.name}</span> sekarang menjadi <span className="font-bold">{roleConfig[role]?.label || role}</span></p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white backdrop-blur-md rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-300 dark:bg-slate-900/90">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between transition-colors duration-300 dark:border-slate-800/50">
          <div>
            <h3 className="text-gray-800 font-bold transition-colors duration-300 dark:text-slate-100">Edit Peran & Status</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold">{user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
              <span className="text-sm text-gray-700 font-semibold transition-colors duration-300 dark:text-slate-200">{user.name}</span>
              <span className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">{user.email}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all duration-300 dark:text-slate-500"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-700 mb-3 font-semibold transition-colors duration-300 dark:text-slate-200">Pilih Peran</label>
            <div className="space-y-2">
              {roleOptions.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === opt.value ? `${opt.borderColor} ${opt.color}` : "border-gray-100 dark:border-slate-800/50 hover:border-gray-200 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/80"}`}>
                  <input type="radio" name="role" value={opt.value} checked={role === opt.value} onChange={() => { setRole(opt.value); setConfirmSuperadmin(false); }} className="sr-only" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${role === opt.value ? opt.borderColor : "border-gray-300 dark:border-slate-600"}`}>
                    {role === opt.value && <div className={`w-2.5 h-2.5 rounded-full ${opt.value === "USER" ? "bg-blue-50 dark:bg-blue-900/200" : opt.value === "ADMIN_RAPAT" ? "bg-purple-50 dark:bg-purple-900/200" : opt.value === "ADMIN_KERJA" ? "bg-indigo-50 dark:bg-indigo-900/200" : "bg-red-50 dark:bg-red-900/200"}`} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">{opt.icon}<span className="text-sm text-gray-800 font-bold transition-colors duration-300 dark:text-slate-100">{opt.label}</span>{(opt as any).warn && <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 transition-colors duration-300 dark:bg-red-900/40 dark:text-red-400">Hati-hati</span>}</div>
                    <p className="text-xs text-gray-500 mt-0.5 transition-colors duration-300 dark:text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {isAdminRole && (
            <div className="border border-purple-100 rounded-2xl p-4 bg-purple-50/50 space-y-3 transition-colors duration-300 dark:border-purple-800/30">
              <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm transition-colors duration-300 dark:text-purple-300">
                <Building2 size={16} />
                <span>Wilayah Tugas (Wajib) <span className="text-red-500">*</span></span>
              </div>
              <p className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">Tentukan gedung dan ruangan mana saja yang wajib dikelola oleh Admin Ruangan ini.</p>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {filteredBuildings.length === 0 && <p className="text-xs text-gray-400 italic transition-colors duration-300 dark:text-slate-500">Tidak ada aset yang sesuai untuk sub-peran ini.</p>}
                {filteredBuildings.map((building: any) => (
                  <div key={building.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white backdrop-blur-md transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
                    <button type="button" onClick={() => toggleBuilding(building.id)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800/80">
                      <span className="text-xs text-gray-700 font-bold transition-colors duration-300 dark:text-slate-200">{building.name}</span>
                      {expandedBuildings.includes(building.id) ? <ChevronDown size={14} className="text-gray-400 transition-colors duration-300 dark:text-slate-500" /> : <ChevronRight size={14} className="text-gray-400 transition-colors duration-300 dark:text-slate-500" />}
                    </button>
                    {expandedBuildings.includes(building.id) && (
                      <div className="px-3 py-2 space-y-3">
                        {(building.floors || []).map((floor: any) => (
                          <div key={floor.id}>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 transition-colors duration-300 dark:text-slate-400">{floor.name}</div>
                            <div className="space-y-1.5">
                              {(floor.rooms || []).map((room: any) => (
                                <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedRooms.includes(room.id)}
                                    onChange={() => toggleRoom(room.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-all duration-300 dark:text-blue-400 dark:border-slate-600"
                                  />
                                  <span className="text-xs text-gray-600 transition-colors duration-300 dark:text-slate-300">{room.name}</span>
                                  <span className={`text-[8px] px-1 py-0.5 rounded-full ${room.jenis_manajemen_ruang === 'WORKSPACE' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-semibold'}`}>
                                    {room.jenis_manajemen_ruang === 'WORKSPACE' ? 'Workspace' : 'Meeting'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-3 font-semibold transition-colors duration-300 dark:text-slate-200">Status Akun</label>
            <div className="grid grid-cols-2 gap-2">
              {([{ value: "active" as Status, label: "Aktif", dot: "bg-green-50 dark:bg-green-900/200", border: "border-green-400", bg: "bg-green-50 dark:bg-green-900/20" }, { value: "inactive" as Status, label: "Nonaktif", dot: "bg-gray-400", border: "border-gray-300 dark:border-slate-600", bg: "bg-gray-50 dark:bg-slate-800/80" }]).map(opt => (
                <label key={opt.value} className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${status === opt.value ? `${opt.border} ${opt.bg}` : "border-gray-100 dark:border-slate-800/50 hover:border-gray-200 dark:border-slate-700/50"}`}>
                  <input type="radio" name="status" value={opt.value} checked={status === opt.value} onChange={() => setStatus(opt.value)} className="sr-only" />
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${status === opt.value ? opt.border : "border-gray-300 dark:border-slate-600"}`}>{status === opt.value && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}</span>
                  <span className="text-sm text-gray-700 font-semibold transition-colors duration-300 dark:text-slate-200">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {confirmSuperadmin && role === "SUPERADMIN" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 transition-colors duration-300 dark:bg-red-900/20 dark:border-red-800/50">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-bold transition-colors duration-300 dark:text-red-300">Konfirmasi Promosi Super Admin</p>
                <p className="text-xs text-red-600 mt-1 transition-colors duration-300 dark:text-red-400">Anda akan memberikan akses penuh kepada <strong>{user.name}</strong>. Klik "Simpan" sekali lagi untuk mengkonfirmasi.</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all duration-300 dark:text-slate-300 dark:border-slate-700/50">Batal</button>
          <button onClick={handleSave} disabled={!hasChanges || loading}
            className={`px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 ${hasChanges && !loading ? confirmSuperadmin ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#1E3A5F] text-white hover:bg-[#0F2144]" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed"}`}>
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : confirmSuperadmin ? "Ya, Konfirmasi" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
