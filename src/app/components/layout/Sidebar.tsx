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
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group ${isActive
            ? "bg-indigo-500/10 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
      >
        <span className={`${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} transition-colors`}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left" style={{ fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors duration-300 dark:bg-red-600" style={{ fontWeight: 600 }}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className={`h-full bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ${collapsed ? "w-[72px]" : "w-72"}`}>
      {/* Logo */}
      <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-tight text-lg leading-tight">Menara</span>
              <span className="text-indigo-400 text-[10px] font-semibold uppercase tracking-widest">OIKN Space</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(groupKeys[gi])}
                className="w-full flex items-center justify-between px-2 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider hover:text-slate-300 transition-colors"
              >
                <span>{group.title}</span>
                {expandedGroups.includes(groupKeys[gi]) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            {(collapsed || expandedGroups.includes(groupKeys[gi])) && (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.page} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User profile & logout */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/50">
        <div className={`flex items-center gap-3 px-2 py-2 mb-2 rounded-xl ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs text-slate-300 font-bold border border-slate-700">
            {role === "superadmin" ? "SA" : role === "admin" ? "AD" : "US"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-sm font-semibold truncate">
                {role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin Ruangan" : "Budi Santoso"}
              </div>
              <div className="text-slate-500 text-xs truncate font-medium mt-0.5">
                {role === "superadmin" ? "superadmin@oikn.go.id" : role === "admin" ? "admin@oikn.go.id" : "user@oikn.go.id"}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-sm transition-all duration-300 group dark:bg-rose-500/30"
        >
          <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          {!collapsed && <span className="font-medium">Keluar Sistem</span>}
        </button>
      </div>
    </div>
  );
}
