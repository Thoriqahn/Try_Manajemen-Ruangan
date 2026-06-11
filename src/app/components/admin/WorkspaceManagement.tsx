import React, { useState, useEffect } from "react";
import { Search, UserPlus, Building2, MapPin, Check, X, AlertTriangle, Edit2, Trash2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { workspaceService, WorkspaceAssignment } from "../../services/workspaceService";
import { userService } from "../../services/index";
import { buildingService } from "../../services/index";
import { roomService } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";

export function WorkspaceManagement({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [forceAssignModalOpen, setForceAssignModalOpen] = useState(false);
  const [relocateModalData, setRelocateModalData] = useState<WorkspaceAssignment | null>(null);
  const [unassignConfirmData, setUnassignConfirmData] = useState<WorkspaceAssignment | null>(null);

  const currentUser = UserStore.get();
  
  const loadAssignments = async () => {
    setLoading(true);
    try {
      const res = await workspaceService.listAllAssignments();
      setAssignments(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadDependencies = async () => {
    try {
      // Load users for the force assign dropdown
      const usersRes = await userService.list({ status: "active" });
      setUsers(usersRes.data || []);

      // Load buildings & rooms
      const res = await buildingService.list();
      const bList = res.data || [];
      const roomsRes = await roomService.list();
      const allRooms = roomsRes.data || [];
      
      const withFloors = await Promise.all(bList.map(async (b: any) => {
        const fRes = await buildingService.listFloors(b.id);
        const floors = (fRes.data || []).map((f: any) => {
          // Filter to only WORKSPACE rooms
          const floorRooms = allRooms.filter((r: any) => r.floor_id === f.id && r.jenis_manajemen_ruang === "WORKSPACE");
          return { ...f, rooms: floorRooms };
        }).filter((f: any) => f.rooms.length > 0);
        return { ...b, floors };
      }));
      setBuildings(withFloors.filter(b => b.floors.length > 0));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadDependencies();
  }, []);

  const handleUnassign = async () => {
    if (!unassignConfirmData) return;
    try {
      await workspaceService.removeAssignment(unassignConfirmData.room_id, unassignConfirmData.desk_id);
      setUnassignConfirmData(null);
      loadAssignments();
    } catch (e: any) {
      alert(e.message || "Gagal menghapus penugasan meja.");
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.user_name.toLowerCase().includes(q) ||
      a.user_email.toLowerCase().includes(q) ||
      a.desk_id.toLowerCase().includes(q) ||
      a.room_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-gray-800 text-2xl font-bold dark:text-slate-100">Kelola Workspace</h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Daftar pengguna yang saat ini menempati meja kerja.</p>
        </div>
        <button 
          onClick={() => setForceAssignModalOpen(true)}
          className="px-4 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] flex items-center gap-2 transition-all shadow-sm"
        >
          <UserPlus size={16} />
          Assign Pengguna
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari nama, email, ruangan, atau ID meja..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" 
          />
        </div>
        <button onClick={loadAssignments} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm dark:bg-slate-900/90 dark:border-slate-700/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:bg-slate-800/80 dark:border-slate-700/50 dark:text-slate-400">
                  <th className="px-5 py-4">Pengguna</th>
                  <th className="px-5 py-4">Gedung & Lantai</th>
                  <th className="px-5 py-4">Ruangan</th>
                  <th className="px-5 py-4">Nomor Meja</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">Belum ada meja yang ditempati.</td>
                  </tr>
                ) : filteredAssignments.map(a => (
                  <tr key={a.desk_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {a.user_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{a.user_name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{a.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700 font-medium dark:text-slate-200">{a.building_name || "Tidak ada gedung"}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{a.floor_name || "Lantai tidak diketahui"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30">
                        <Building2 size={12} /> {a.room_name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <MapPin size={12} /> Meja {a.desk_id}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setRelocateModalData(a)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip dark:text-indigo-400 dark:hover:bg-indigo-900/20" 
                          title="Pindahkan (Relocate)"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setUnassignConfirmData(a)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip dark:text-red-400 dark:hover:bg-red-900/20" 
                          title="Hapus Penugasan (Unassign)"
                        >
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
      )}

      {/* MODALS */}
      {unassignConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl dark:bg-slate-900">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-800 dark:text-slate-100">Hapus Penugasan?</h3>
            <p className="text-sm text-center text-gray-500 mt-2 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus <strong>{unassignConfirmData.user_name}</strong> dari <strong>Meja {unassignConfirmData.desk_id}</strong>? Status meja akan menjadi kosong (VACANT).
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setUnassignConfirmData(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors dark:bg-slate-800 dark:text-slate-300">Batal</button>
              <button onClick={handleUnassign} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">Hapus Akses</button>
            </div>
          </div>
        </div>
      )}

      {forceAssignModalOpen && (
        <ForceAssignModal 
          users={users} 
          buildings={buildings} 
          onClose={() => setForceAssignModalOpen(false)} 
          onSuccess={() => { setForceAssignModalOpen(false); loadAssignments(); }} 
        />
      )}

      {relocateModalData && (
        <RelocateModal 
          assignment={relocateModalData} 
          buildings={buildings}
          onClose={() => setRelocateModalData(null)}
          onSuccess={() => { setRelocateModalData(null); loadAssignments(); }}
        />
      )}
    </div>
  );
}

// ----------------------
// FORCE ASSIGN MODAL
// ----------------------
function ForceAssignModal({ users, buildings, onClose, onSuccess }: { users: any[], buildings: any[], onClose: () => void, onSuccess: () => void }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState("");
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [desks, setDesks] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (!selectedRoomId) { setDesks([]); return; }
    const fetchLayout = async () => {
      setLoadingLayout(true);
      try {
        const res = await workspaceService.getLayout(selectedRoomId);
        // Only vacant desks
        const vacant = (((res as any).desks) || []).filter((d: any) => d.status === 'VACANT');
        setDesks(vacant);
      } catch (e) {
        console.error("Failed to load layout", e);
      }
      setLoadingLayout(false);
    };
    fetchLayout();
  }, [selectedRoomId]);

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedRoomId || !selectedDeskId) return;
    setSubmitting(true);
    try {
      await workspaceService.forceAssign(selectedRoomId, selectedDeskId, selectedUserId);
      onSuccess();
    } catch (e: any) {
      alert(e.message || "Terjadi kesalahan saat menetapkan meja.");
    }
    setSubmitting(false);
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] dark:bg-slate-900">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Force Assign Pengguna</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-5">
          {/* USER SELECTION */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">1. Pilih Pengguna</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden dark:border-slate-700">
              <div className="p-2 border-b border-gray-200 bg-gray-50 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama atau email..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-400 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredUsers.length === 0 && <p className="text-xs text-center p-4 text-gray-400">Pengguna tidak ditemukan</p>}
                {filteredUsers.map(u => (
                  <label key={u.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 dark:hover:bg-slate-800 dark:border-slate-800 ${selectedUserId === u.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                    <input type="radio" name="force_user" value={u.id} checked={selectedUserId === u.id} onChange={() => setSelectedUserId(u.id)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ROOM SELECTION */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">2. Pilih Ruangan Workspace</label>
            <select 
              value={selectedRoomId} 
              onChange={e => { setSelectedRoomId(e.target.value); setSelectedDeskId(""); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="">-- Pilih Ruangan --</option>
              {buildings.map(b => 
                (b.floors || []).map((f: any) => 
                  (f.rooms || []).map((r: any) => (
                    <option key={r.id} value={r.id}>{b.name} - {f.name} - {r.name}</option>
                  ))
                )
              )}
            </select>
          </div>

          {/* DESK SELECTION */}
          {selectedRoomId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">3. Pilih Meja Kosong</label>
              {loadingLayout ? (
                <div className="flex items-center gap-2 text-sm text-gray-500"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Memuat meja...</div>
              ) : desks.length === 0 ? (
                <p className="text-sm text-red-500 p-3 bg-red-50 rounded-xl dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800/30">Tidak ada meja kosong (VACANT) di ruangan ini.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2">
                  {desks.map(d => (
                    <button
                      key={d.desk_id}
                      onClick={() => setSelectedDeskId(d.desk_id)}
                      className={`py-2 px-1 border rounded-lg text-xs font-bold transition-all ${
                        selectedDeskId === d.desk_id 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                      }`}
                    >
                      Meja {d.desk_id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
          <button 
            onClick={handleSubmit} 
            disabled={!selectedUserId || !selectedRoomId || !selectedDeskId || submitting}
            className={`px-4 py-2 rounded-xl font-medium text-white transition-all flex items-center gap-2 ${
              !selectedUserId || !selectedRoomId || !selectedDeskId || submitting
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
            }`}
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Tetapkan Meja
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------
// RELOCATE MODAL
// ----------------------
function RelocateModal({ assignment, buildings, onClose, onSuccess }: { assignment: WorkspaceAssignment, buildings: any[], onClose: () => void, onSuccess: () => void }) {
  const [selectedRoomId, setSelectedRoomId] = useState(assignment.room_id);
  const [selectedDeskId, setSelectedDeskId] = useState("");
  const [rationale, setRationale] = useState("");
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [desks, setDesks] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRoomId) { setDesks([]); return; }
    const fetchLayout = async () => {
      setLoadingLayout(true);
      try {
        const res = await workspaceService.getLayout(selectedRoomId);
        // Only vacant desks
        const vacant = (((res as any).desks) || []).filter((d: any) => d.status === 'VACANT');
        setDesks(vacant);
      } catch (e) {
        console.error("Failed to load layout", e);
      }
      setLoadingLayout(false);
    };
    fetchLayout();
  }, [selectedRoomId]);

  const handleSubmit = async () => {
    if (!selectedDeskId || !rationale) return;
    if (rationale.length < 10) {
      alert("Alasan harus minimal 10 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      await workspaceService.relocate(assignment.desk_id, selectedDeskId, rationale);
      onSuccess();
    } catch (e: any) {
      alert(e.message || "Gagal memindahkan meja.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] dark:bg-slate-900">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Relokasi Meja Pengguna</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 dark:bg-indigo-900/20 dark:border-indigo-800/30">
            <UserPlus size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">{assignment.user_name}</p>
              <p className="text-xs text-indigo-700 mt-1 dark:text-indigo-400">Saat ini berada di <strong>Meja {assignment.desk_id}</strong> ({assignment.room_name})</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">1. Pilih Meja Tujuan Baru</label>
            {loadingLayout ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Memuat meja...</div>
            ) : desks.length === 0 ? (
              <p className="text-sm text-red-500 p-3 bg-red-50 rounded-xl dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800/30">Tidak ada meja kosong (VACANT) di ruangan ini.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2">
                {desks.map(d => (
                  <button
                    key={d.desk_id}
                    onClick={() => setSelectedDeskId(d.desk_id)}
                    className={`py-2 px-1 border rounded-lg text-xs font-bold transition-all ${
                      selectedDeskId === d.desk_id 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                    }`}
                  >
                    Meja {d.desk_id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">2. Alasan Relokasi</label>
            <textarea 
              value={rationale} 
              onChange={e => setRationale(e.target.value)}
              placeholder="Berikan alasan mengapa pengguna ini dipindahkan (min. 10 karakter)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 min-h-[80px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
          <button 
            onClick={handleSubmit} 
            disabled={!selectedDeskId || rationale.length < 10 || submitting}
            className={`px-4 py-2 rounded-xl font-medium text-white transition-all flex items-center gap-2 ${
              !selectedDeskId || rationale.length < 10 || submitting
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
            }`}
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Pindahkan
          </button>
        </div>
      </div>
    </div>
  );
}
