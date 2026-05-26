import { Building2, Calendar, LayoutGrid, BookOpen, CheckSquare, Clock, Settings, Users, Globe, ShieldCheck, Activity, BarChart2, LogOut, ChevronDown, ChevronRight, Video } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface SidebarProps {
  role: "user" | "admin" | "superadmin";
  rawRole?: string;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  collapsed?: boolean;
  userName?: string;
  userEmail?: string;
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

export function Sidebar({ role, rawRole, currentPage, onNavigate, onLogout, collapsed = false, userName, userEmail }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["user", "admin", "superadmin"]);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(Math.ceil(scrollTop + clientHeight) < scrollHeight);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [expandedGroups, role]);

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
            ? "bg-white/15 dark:bg-indigo-500/20 text-white dark:text-indigo-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
            : "text-blue-100/70 hover:text-white hover:bg-white/5 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
          }`}
      >
        <span className={`${isActive ? "text-white dark:text-indigo-400" : "text-blue-200/60 group-hover:text-white dark:text-slate-500 dark:group-hover:text-slate-300"} transition-colors`}>{item.icon}</span>
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
    <div className={`h-full bg-[#2A4E85] dark:bg-slate-950 border-r border-[#1e3a63] dark:border-slate-800 flex flex-col transition-all duration-300 rounded-tr-[2rem] overflow-hidden shadow-lg dark:shadow-none ${collapsed ? "w-[72px]" : "w-72"}`}>
      {/* Logo */}
      <div className="p-5 border-b border-[#1e3a63] dark:border-slate-800/60 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-tight text-lg leading-tight">Menara</span>
              <span className="text-indigo-200 text-[10px] font-semibold uppercase tracking-widest">OIKN Space</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="relative flex-1 min-h-0">
        <div className={`absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#2A4E85] dark:from-slate-950 to-transparent pointer-events-none transition-opacity duration-300 z-10 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`} />
        
        <nav 
          ref={navRef}
          onScroll={checkScroll}
          className="h-full overflow-y-auto p-4 space-y-6 custom-scrollbar relative"
        >
          {groups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(groupKeys[gi])}
                  className="w-full flex items-center justify-between px-2 mb-2 text-blue-200/60 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider hover:text-white dark:hover:text-slate-300 transition-colors"
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

        <div className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#2A4E85] dark:from-slate-950 to-transparent pointer-events-none transition-opacity duration-300 z-10 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`} />
        {canScrollDown && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none animate-bounce z-20">
            <ChevronDown size={16} className="text-blue-200/50 dark:text-slate-500" />
          </div>
        )}
      </div>

      {/* User profile & logout */}
      <div className="p-4 border-t border-[#2A4E85] dark:border-slate-800/60 bg-[#162C4A] dark:bg-slate-950/50">
        <div className={`flex items-center gap-3 px-2 py-2 mb-2 rounded-xl ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-[#2A4E85] dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs text-blue-100 dark:text-slate-300 font-bold border border-[#3A60A0] dark:border-slate-700">
            {role === "superadmin" ? "SA" : role === "admin" ? "AD" : "US"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white dark:text-slate-200 text-sm font-semibold truncate">
                {userName || (role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin Ruangan" : "Pengguna")}
              </div>
              <div className="text-blue-200/70 dark:text-slate-500 text-xs truncate font-medium mt-0.5">
                {userEmail || (role === "superadmin" ? "superadmin@oikn.go.id" : role === "admin" ? "admin@oikn.go.id" : "user@oikn.go.id")}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200/70 dark:text-slate-400 hover:text-rose-300 dark:hover:text-rose-400 hover:bg-rose-500/10 text-sm transition-all duration-300 group dark:bg-rose-500/30"
        >
          <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          {!collapsed && <span className="font-medium">Keluar Sistem</span>}
        </button>
      </div>
    </div>
  );
}
