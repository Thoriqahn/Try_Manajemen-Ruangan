import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Shield, User, Cpu, Check, Edit2, AlertTriangle, X, Building2, UserCog } from "lucide-react";
import { mockUsers } from "../shared/mockData";

type Role = "user" | "admin" | "superadmin" | "api";
type Status = "active" | "inactive";

interface UserOverride {
  role?: Role;
  status?: Status;
}

const roleConfig: Record<Role, { icon: any; label: string; color: string; desc: string }> = {
  user:       { icon: <User size={14} />,    label: "Pengguna Biasa",  color: "bg-blue-100 text-blue-700",   desc: "Dapat melihat & booking ruangan" },
  admin:      { icon: <Shield size={14} />,  label: "Admin Ruangan",   color: "bg-purple-100 text-purple-700", desc: "Mengelola ruangan & menyetujui booking" },
  superadmin: { icon: <UserCog size={14} />, label: "Super Admin",     color: "bg-red-100 text-red-700",    desc: "Akses penuh ke seluruh sistem" },
  api:        { icon: <Cpu size={14} />,     label: "Akun API",        color: "bg-green-100 text-green-700", desc: "Integrasi layanan eksternal" },
};

const buildingTree = [
  {
    name: "Gedung IKN Tower",
    floors: [
      { name: "Lantai 8", rooms: [{ id: "r1", name: "Ruang Rapat Eksekutif A" }, { id: "r6", name: "Lounge Kreatif B2" }] },
      { name: "Lantai 5", rooms: [{ id: "r2", name: "Ruang Diskusi Inovasi" }] },
    ],
  },
  {
    name: "Gedung Serba Guna",
    floors: [
      { name: "Lantai 1", rooms: [{ id: "r3", name: "Aula Serbaguna Nusantara" }] },
    ],
  },
  {
    name: "Gedung Teknologi",
    floors: [
      { name: "Lantai 3", rooms: [{ id: "r4", name: "Ruang Focus Work 01" }] },
      { name: "Lantai 2", rooms: [{ id: "r5", name: "Ruang Pelatihan Digital" }] },
    ],
  },
];

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Local overrides
  const [userOverrides, setUserOverrides] = useState<Record<string, UserOverride>>({});

  // Role edit modal
  const [editModal, setEditModal] = useState<any>(null);

  // Room assignment modal
  const [assignModal, setAssignModal] = useState<any>(null);
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>(["Gedung IKN Tower"]);
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string[]>>({});

  const getEffectiveUser = (user: any) => ({
    ...user,
    role: userOverrides[user.id]?.role ?? user.role,
    status: userOverrides[user.id]?.status ?? user.status,
  });

  const filtered = mockUsers
    .map(getEffectiveUser)
    .filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterStatus !== "all" && u.status !== filterStatus) return false;
      return true;
    });

  const toggleBuilding = (name: string) => {
    setExpandedBuildings(prev => prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]);
  };

  const toggleRoom = (userId: string, roomId: string) => {
    setSelectedRooms(prev => {
      const current = prev[userId] || getUserRooms(userId);
      const updated = current.includes(roomId) ? current.filter(r => r !== roomId) : [...current, roomId];
      return { ...prev, [userId]: updated };
    });
  };

  const getUserRooms = (userId: string) =>
    selectedRooms[userId] ?? (mockUsers.find(u => u.id === userId) as any)?.assignedRooms ?? [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Manajemen Pengguna</h2>
        <p className="text-sm text-gray-500">Kelola akun, peran, dan delegasi wilayah tugas admin</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white">
          <option value="all">Semua Role</option>
          <option value="user">Pengguna Biasa</option>
          <option value="admin">Admin Ruangan</option>
          <option value="superadmin">Super Admin</option>
          <option value="api">Akun API</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Pengguna</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Peran</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Bergabung</th>
                <th className="text-right px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(user => {
                const roleCfg = roleConfig[user.role as Role] || roleConfig.user;
                const isChanged = !!userOverrides[user.id];
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
                          {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{user.name}</span>
                            {isChanged && (
                              <span className="text-xs bg-amber-100 text-amber-600 rounded px-1.5 py-0.5" style={{ fontWeight: 500 }}>Diubah</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${roleCfg.color}`} style={{ fontWeight: 500 }}>
                        {roleCfg.icon}{roleCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs ${user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{user.joinDate}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end">
                        {user.role === "admin" && (
                          <button
                            onClick={() => setAssignModal(user)}
                            className="px-3 py-1.5 text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                          >
                            <Building2 size={11} />
                            Wilayah Tugas
                          </button>
                        )}
                        <button
                          onClick={() => setEditModal(user)}
                          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 size={11} />
                          Edit Peran
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

      {/* Role Edit Modal */}
      {editModal && (
        <RoleEditModal
          user={editModal}
          currentRole={(userOverrides[editModal.id]?.role ?? editModal.role) as Role}
          currentStatus={(userOverrides[editModal.id]?.status ?? editModal.status) as Status}
          onSave={(role, status) => {
            setUserOverrides(prev => ({ ...prev, [editModal.id]: { role, status } }));
            if (role === "admin") {
              const updated = { ...editModal, role, status };
              setAssignModal(updated);
            }
            setEditModal(null);
          }}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Room Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="text-gray-800" style={{ fontWeight: 700 }}>Atur Wilayah Tugas</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Admin: <span className="text-gray-700" style={{ fontWeight: 500 }}>{assignModal.name}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Centang ruangan yang akan didelegasikan</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {buildingTree.map(building => (
                  <div key={building.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleBuilding(building.name)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{building.name}</span>
                      {expandedBuildings.includes(building.name)
                        ? <ChevronDown size={16} className="text-gray-400" />
                        : <ChevronRight size={16} className="text-gray-400" />}
                    </button>
                    {expandedBuildings.includes(building.name) && (
                      <div className="divide-y divide-gray-50">
                        {building.floors.map(floor => (
                          <div key={floor.name} className="px-4 py-3">
                            <div className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>{floor.name}</div>
                            <div className="space-y-2">
                              {floor.rooms.map(room => {
                                const isChecked = getUserRooms(assignModal.id).includes(room.id);
                                return (
                                  <label key={room.id} className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                      onClick={() => toggleRoom(assignModal.id, room.id)}
                                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-300 hover:border-blue-400"}`}
                                    >
                                      {isChecked && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-600 group-hover:text-gray-800">{room.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144]"
              >
                Simpan Matriks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Role Edit Modal ──────────────────────────────────────────────────────────
function RoleEditModal({
  user,
  currentRole,
  currentStatus,
  onSave,
  onClose,
}: {
  user: any;
  currentRole: Role;
  currentStatus: Status;
  onSave: (role: Role, status: Status) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [status, setStatus] = useState<Status>(currentStatus);
  const [confirmSuperadmin, setConfirmSuperadmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const roleOptions: { value: Role; label: string; desc: string; color: string; borderColor: string; icon: any; warn?: boolean }[] = [
    {
      value: "user",
      label: "Pengguna Biasa",
      desc: "Dapat melihat kalender dan melakukan booking ruangan",
      color: "bg-blue-50",
      borderColor: "border-blue-400",
      icon: <User size={18} className="text-blue-600" />,
    },
    {
      value: "admin",
      label: "Admin Ruangan",
      desc: "Mengelola ruangan, menyetujui & menolak booking, kontrol jadwal",
      color: "bg-purple-50",
      borderColor: "border-purple-400",
      icon: <Shield size={18} className="text-purple-600" />,
    },
    {
      value: "superadmin",
      label: "Super Admin",
      desc: "Akses penuh: kelola pengguna, kebijakan global, audit trail",
      color: "bg-red-50",
      borderColor: "border-red-400",
      icon: <UserCog size={18} className="text-red-600" />,
      warn: true,
    },
  ];

  const handleSave = () => {
    if (role === "superadmin" && !confirmSuperadmin) {
      setConfirmSuperadmin(true);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => onSave(role, status), 800);
    }, 700);
  };

  const roleChanged = role !== currentRole;
  const statusChanged = status !== currentStatus;
  const hasChanges = roleChanged || statusChanged;

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-green-500" />
          </div>
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700 }}>Peran Diperbarui!</h3>
          <p className="text-sm text-gray-500">
            <span style={{ fontWeight: 500 }}>{user.name}</span> sekarang menjadi{" "}
            <span style={{ fontWeight: 600 }}>{roleConfig[role].label}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 700 }}>Edit Peran & Status</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs" style={{ fontWeight: 600 }}>
                {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <span className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{user.name}</span>
                <span className="text-xs text-gray-400 ml-2">{user.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Role picker */}
          <div>
            <label className="block text-sm text-gray-700 mb-3" style={{ fontWeight: 600 }}>Pilih Peran</label>
            <div className="space-y-2">
              {roleOptions.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === opt.value
                      ? `${opt.borderColor} ${opt.color}`
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => { setRole(opt.value); setConfirmSuperadmin(false); }}
                    className="sr-only"
                  />
                  {/* Radio circle */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    role === opt.value ? `${opt.borderColor} bg-white` : "border-gray-300"
                  }`}>
                    {role === opt.value && (
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        opt.value === "user" ? "bg-blue-500" :
                        opt.value === "admin" ? "bg-purple-500" : "bg-red-500"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span className="text-sm text-gray-800" style={{ fontWeight: 600 }}>{opt.label}</span>
                      {opt.warn && (
                        <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5" style={{ fontWeight: 500 }}>Hati-hati</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    {opt.value === "admin" && role === "admin" && (
                      <p className="text-xs text-purple-600 mt-1" style={{ fontWeight: 500 }}>
                        * Setelah disimpan, Anda dapat mengatur wilayah tugas admin ini.
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <label className="block text-sm text-gray-700 mb-3" style={{ fontWeight: 600 }}>Status Akun</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "active" as Status,   label: "Aktif",    desc: "Pengguna dapat login dan menggunakan sistem", dot: "bg-green-500", border: "border-green-400", bg: "bg-green-50" },
                { value: "inactive" as Status,  label: "Nonaktif", desc: "Akses diblokir, tidak bisa login", dot: "bg-gray-400", border: "border-gray-300", bg: "bg-gray-50" },
              ]).map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    status === opt.value ? `${opt.border} ${opt.bg}` : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input type="radio" name="status" value={opt.value} checked={status === opt.value} onChange={() => setStatus(opt.value)} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${status === opt.value ? opt.border : "border-gray-300"}`}>
                    {status === opt.value && <div className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Superadmin warning */}
          {confirmSuperadmin && role === "superadmin" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700" style={{ fontWeight: 600 }}>Konfirmasi Promosi Super Admin</p>
                <p className="text-xs text-red-600 mt-1">
                  Anda akan memberikan akses penuh sistem kepada <strong>{user.name}</strong>,
                  termasuk manajemen pengguna, kebijakan global, dan audit trail.
                  Tindakan ini tidak dapat dibatalkan dari sini.
                </p>
                <p className="text-xs text-red-500 mt-2 italic">Klik "Simpan Perubahan" sekali lagi untuk mengkonfirmasi.</p>
              </div>
            </div>
          )}

          {/* Change summary */}
          {hasChanges && !confirmSuperadmin && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p style={{ fontWeight: 600 }}>Ringkasan perubahan:</p>
              {roleChanged && (
                <p>· Peran: <span className="line-through text-gray-400">{roleConfig[currentRole]?.label}</span> → <span style={{ fontWeight: 600 }}>{roleConfig[role]?.label}</span></p>
              )}
              {statusChanged && (
                <p>· Status: <span className="line-through text-gray-400">{currentStatus === "active" ? "Aktif" : "Nonaktif"}</span> → <span style={{ fontWeight: 600 }}>{status === "active" ? "Aktif" : "Nonaktif"}</span></p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className={`px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all ${
              hasChanges && !loading
                ? confirmSuperadmin
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[#1E3A5F] text-white hover:bg-[#0F2144]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            style={{ fontWeight: 500 }}
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              : confirmSuperadmin ? "Ya, Konfirmasi Promosi" : "Simpan Perubahan"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
