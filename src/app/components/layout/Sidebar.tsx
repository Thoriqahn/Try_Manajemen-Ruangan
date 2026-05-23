import { Building2, Calendar, LayoutGrid, BookOpen, CheckSquare, Clock, Settings, Users, Globe, ShieldCheck, Activity, BarChart2, LogOut, ChevronDown, ChevronRight, Video } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: "user" | "admin" | "superadmin";
  rawRole?: string;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  collapsed?: boolean;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  page: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ role, rawRole, currentPage, onNavigate, onLogout, collapsed = false }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["user", "admin", "superadmin"]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
  };

  const userNav: NavGroup = {
    title: "Menu Utama",
    items: [
      { icon: <BookOpen size={18} />, label: "Dashboard Saya", page: "my-bookings" },
      { icon: <Calendar size={18} />, label: "Kalender Ruangan", page: "calendar" },
      { icon: <Building2 size={18} />, label: "Daftar Ruangan", page: "rooms" },

    ],
  };

  const adminItems: NavItem[] = [
    { icon: <BarChart2 size={18} />, label: "Dashboard", page: "admin-dashboard" },
  ];

  const effectiveRawRole = rawRole || (role === "superadmin" ? "SUPERADMIN" : role === "admin" ? "ADMIN_RAPAT" : "USER");

  if (effectiveRawRole === "ADMIN_RAPAT" || effectiveRawRole === "SUPERADMIN") {
    adminItems.push({ icon: <CheckSquare size={18} />, label: "Persetujuan Rapat", page: "admin-approval" });
    adminItems.push({ icon: <Clock size={18} />, label: "Jadwal Rapat Aktif", page: "admin-schedule" });
  }

  if (effectiveRawRole === "ADMIN_KERJA" || effectiveRawRole === "SUPERADMIN") {
    adminItems.push({ icon: <CheckSquare size={18} />, label: "Persetujuan Meja", page: "admin-workspace-approval" });
  }

  adminItems.push({ icon: <Settings size={18} />, label: "Kelola Ruangan", page: "admin-rooms" });

  const adminNav: NavGroup = {
    title: "Admin Ruangan",
    items: adminItems,
  };

  const superAdminNav: NavGroup = {
    title: "Super Admin",
    items: [
      { icon: <Building2 size={18} />, label: "Manajemen Gedung", page: "sa-buildings" },
      { icon: <Globe size={18} />, label: "Ruangan Global", page: "sa-rooms" },
      { icon: <Users size={18} />, label: "Manajemen Pengguna", page: "sa-users" },
      { icon: <ShieldCheck size={18} />, label: "Kebijakan Global", page: "sa-policy" },
      { icon: <Activity size={18} />, label: "Integrasi & API", page: "sa-api" },
      { icon: <Video size={18} />, label: "Integrasi Zoom", page: "sa-zoom" },
      { icon: <Clock size={18} />, label: "Riwayat Aktivitas", page: "sa-audit" },
    ],
  };

  const groups: NavGroup[] = role === "user" ? [userNav] : role === "admin" ? [userNav, adminNav] : [userNav, adminNav, superAdminNav];
  const groupKeys = ["user", "admin", "superadmin"];

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = currentPage === item.page;
    return (
      <button
        onClick={() => onNavigate(item.page)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${isActive
            ? "bg-white text-[#1E3A5F] shadow-sm"
            : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
      >
        <span className={isActive ? "text-[#1E3A5F]" : "text-white/60 group-hover:text-white"}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left" style={{ fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ fontWeight: 600 }}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className={`h-full bg-[#1E3A5F] flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow">
            <Building2 className="w-5 h-5 text-[#1E3A5F]" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white" style={{ fontWeight: 700, fontSize: "1.1rem" }}>Menara</div>
              <div className="text-white/50 text-xs">OIKN Space Management</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(groupKeys[gi])}
                className="w-full flex items-center justify-between px-2 mb-1 text-white/40 text-xs uppercase tracking-wider hover:text-white/60 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <span>{group.title}</span>
                {expandedGroups.includes(groupKeys[gi]) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            {(collapsed || expandedGroups.includes(groupKeys[gi])) && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.page} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User profile & logout */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center flex-shrink-0 text-sm text-[#1E3A5F]" style={{ fontWeight: 700 }}>
            {role === "superadmin" ? "SA" : role === "admin" ? "AD" : "US"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate" style={{ fontWeight: 500 }}>
                {role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin Ruangan" : "Budi Santoso"}
              </div>
              <div className="text-white/40 text-xs truncate">
                {role === "superadmin" ? "superadmin@oikn.go.id" : role === "admin" ? "admin@oikn.go.id" : "user@oikn.go.id"}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all"
        >
          <LogOut size={16} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );
}
