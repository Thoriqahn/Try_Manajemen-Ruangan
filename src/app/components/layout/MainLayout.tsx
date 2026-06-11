import { useState, useEffect } from "react";
import { Menu, Bell, Search, Calendar, Building2, BookOpen, QrCode, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { bookingService } from "../../services/bookingService";
import { workspaceService } from "../../services/workspaceService";
import { api } from "../../services/apiClient";

interface MainLayoutProps {
  role: "user" | "admin" | "superadmin";
  currentUser?: { id: string; name: string; email: string; role: string; rawRole?: string } | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
}

export function MainLayout({ role, currentUser, currentPage, onNavigate, onLogout, children, pageTitle, pageSubtitle }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile Menu State
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        const res = await bookingService.list({ 
          limit: 15,
          managed_only: role === 'admin' ? "true" : undefined
        });
        const list = res.data || [];
        
        const items = list.map((b: any) => {
          let text = "";
          let type: "info" | "success" | "warning" | "error" = "info";

          if (role !== "user") {
            // Admin/Superadmin notices
            if (b.status === "pending") {
              text = `Permohonan baru untuk ${b.room_name} oleh ${b.user_name} menunggu persetujuan Anda.`;
              type = "info";
            } else if (b.status === "confirmed") {
              text = `Booking ${b.room_name} oleh ${b.user_name} pada ${b.date} telah disetujui.`;
              type = "success";
            } else if (b.status === "cancelled") {
              text = `Booking ${b.room_name} oleh ${b.user_name} telah dibatalkan. Alasan: ${b.cancel_reason || "-"}`;
              type = "error";
            } else {
              text = `Status booking #${b.id.slice(0,8)} ${b.room_name} berubah menjadi ${b.status}.`;
              type = "info";
            }
          } else {
            // Regular user notices
            if (b.status === "pending") {
              text = `Pemesanan ${b.room_name} Anda pada ${b.date} sedang menunggu persetujuan Admin.`;
              type = "warning";
            } else if (b.status === "confirmed") {
              text = `Selamat! Pemesanan ${b.room_name} Anda pada ${b.date} (${b.start_time} - ${b.end_time}) TELAH DISETUJUI!`;
              type = "success";
            } else if (b.status === "cancelled") {
              text = `Pemesanan ${b.room_name} Anda pada ${b.date} dibatalkan. Alasan: ${b.cancel_reason || "-"}`;
              type = "error";
            } else if (b.status === "rejected") {
              text = `Maaf, permohonan booking ${b.room_name} Anda telah ditolak. Alasan: ${b.rejection_reason || "-"}`;
              type = "error";
            } else {
              text = `Status pemesanan ${b.room_name} Anda berubah menjadi ${b.status}.`;
              type = "info";
            }
          }

          return {
            id: b.id,
            text,
            type,
            date: b.date,
            time: b.start_time,
            status: b.status,
            createdAt: b.created_at || Date.now()
          };
        });

        let workspaceItems: any[] = [];
        try {
          if (role !== "user" && (currentUser.rawRole === 'ADMIN_KERJA' || currentUser.rawRole === 'SUPERADMIN' || role === 'superadmin')) {
            const wRes = await workspaceService.getRequests();
            const wList = (wRes as any).data || wRes || [];
            const arr = Array.isArray(wList) ? wList : (wList.data || []);
            workspaceItems = arr.filter((req: any) => req.status === 'PENDING').map((r: any) => ({
              id: r.request_id || r.id,
              text: `Permintaan penempatan meja baru dari ${r.user_name || 'seseorang'} di ${r.room_name || 'ruangan'} menunggu persetujuan.`,
              type: "info",
              date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
              time: "",
              status: "pending",
              createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
            }));
          } else if (role === "user") {
            const wRes = await workspaceService.getMySeating();
            const pr = wRes.data?.pending_request;
            if (pr) {
              workspaceItems.push({
                id: pr.request_id,
                text: `Pengajuan penempatan meja kerja Anda di ${pr.room_name} sedang menunggu persetujuan Admin.`,
                type: "warning",
                date: pr.created_at ? new Date(pr.created_at).toLocaleDateString() : "",
                time: "",
                status: "pending",
                createdAt: pr.created_at ? new Date(pr.created_at).getTime() : Date.now()
              });
            }
            const rr = wRes.data?.resolved_request;
            if (rr) {
              workspaceItems.push({
                id: rr.request_id + "-resolved",
                text: `Pengajuan penempatan meja kerja Anda di ${rr.room_name} telah ${rr.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'} oleh Admin.`,
                type: rr.status === 'APPROVED' ? "success" : "error",
                date: rr.created_at ? new Date(rr.created_at).toLocaleDateString() : "",
                time: "",
                status: rr.status.toLowerCase(),
                createdAt: rr.created_at ? new Date(rr.created_at).getTime() + 1000 : Date.now()
              });
            }
          }
        } catch (e) {
          console.warn("Gagal memuat notifikasi workspace:", e);
        }

        try {
          const dbNotifsRes = await api.get('/notifications');
          const dbNotifs = dbNotifsRes.data || [];
          const parsedDbNotifs = dbNotifs.map((n: any) => {
            let nType = "info";
            const lowerTitle = n.title?.toLowerCase() || '';
            if (lowerTitle.includes('disetujui') || lowerTitle.includes('baru')) nType = "success";
            else if (lowerTitle.includes('dicabut') || lowerTitle.includes('batal')) nType = "error";
            else if (lowerTitle.includes('dipindah')) nType = "warning";
            
            return {
              id: n.id,
              text: n.message,
              type: nType,
              date: new Date(n.created_at).toLocaleDateString('id-ID'),
              time: new Date(n.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
              status: n.is_read ? "read" : "pending",
              createdAt: new Date(n.created_at).getTime()
            };
          });
          workspaceItems = [...workspaceItems, ...parsedDbNotifs];
        } catch(e) {
          console.warn("Gagal memuat DB notifications:", e);
        }

        const combinedItems = [...items, ...workspaceItems]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 15);

        setNotifications(combinedItems);
        
        // Calculate unread count
        const unread = combinedItems.filter((n: any) => n.status === "pending" || n.type === "success" || n.status === "rejected").length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Dynamic polling
    return () => clearInterval(interval);
  }, [currentUser, role]);

  useEffect(() => {
    if (!showNotifications) return;
    const close = () => setShowNotifications(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showNotifications]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const close = () => setShowProfileMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showProfileMenu]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans transition-colors duration-300 relative dark:bg-slate-900">
      {/* Background IKN Ornaments - Subtle Patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.03] dark:opacity-[0.05] transition-colors duration-300">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/200/svg">
          <defs>
            <pattern id="ikn-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-slate-300 transition-colors duration-300 dark:text-slate-200" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#ikn-pattern)" />
        </svg>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity dark:bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 lg:z-40 h-full
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-transform duration-300
      `}>
        <Sidebar
          role={role}
          rawRole={currentUser?.rawRole}
          currentPage={currentPage}
          onNavigate={(page) => { onNavigate(page); setMobileOpen(false); }}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          userName={currentUser?.name}
          userEmail={currentUser?.email}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 relative z-10 transition-colors duration-300 dark:bg-slate-900/50">
        {/* Topbar */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-4 lg:px-8 h-16 flex items-center gap-6 flex-shrink-0 z-30 shadow-[0_4px_20px_rgb(0,0,0,0.02)] relative transition-colors duration-300 dark:bg-slate-950/70 dark:border-slate-800">
          <button
            onClick={() => { if (window.innerWidth >= 1024) { setSidebarCollapsed(!sidebarCollapsed); } else { setMobileOpen(!mobileOpen); } }}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 hover:bg-indigo-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all hidden lg:block dark:bg-indigo-500/30 dark:text-indigo-400"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-slate-800 hidden sm:block tracking-tight transition-colors dark:text-slate-100" style={{ fontWeight: 600, fontSize: "1.1rem", lineHeight: 1.3 }}>{pageTitle}</h1>
            {pageSubtitle && <p className="text-slate-500 text-xs hidden sm:block mt-0.5 transition-colors dark:text-slate-400">{pageSubtitle}</p>}
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3 py-2 w-72 transition-all focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-indigo-300 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-emerald-500/20 dark:bg-slate-900 dark:border-indigo-500/40">
            <Search size={16} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" />
            <input type="text" placeholder="Cari ruangan, booking..." className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400 dark:placeholder-slate-500 transition-colors duration-300 dark:text-slate-300" />
          </div>

          <ThemeToggle />

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="relative text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl dark:bg-indigo-500/30 dark:text-indigo-400"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-2.5 h-2.5 border-2 border-white animate-pulse transition-colors duration-300 dark:bg-red-600 dark:border-slate-900" />
              )}
            </button>

            {showNotifications && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] z-50 overflow-hidden max-h-96 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right transition-colors dark:bg-slate-900/95 dark:border-slate-700"
              >
                <div className="px-5 py-4 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between transition-colors duration-300 dark:bg-slate-800/80 dark:border-slate-700">
                  <span className="text-sm text-slate-800 font-semibold tracking-tight transition-colors duration-300 dark:text-slate-200">Notifikasi Sistem</span>
                  <button onClick={() => setNotifications([])} className="text-xs text-indigo-600 hover:text-indigo-700 dark:hover:text-emerald-300 font-medium hover:underline transition-all dark:text-indigo-400">Bersihkan</button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-700/50 transition-colors duration-300">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center transition-colors duration-300 dark:bg-slate-800">
                        <Bell size={20} className="text-slate-300 transition-colors duration-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-400 text-xs font-medium transition-colors duration-300 dark:text-slate-500">Tidak ada notifikasi baru</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-4 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 group">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-transform group-hover:scale-125 ${
                          n.type === "success" ? "bg-emerald-500 dark:bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                          n.type === "warning" ? "bg-amber-500 dark:bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                          n.type === "error" ? "bg-rose-500 dark:bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-indigo-500 dark:bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-relaxed transition-colors duration-300 dark:text-slate-300" style={{ fontWeight: n.type === "success" || n.type === "warning" ? 500 : 400 }}>{n.text}</p>
                          <span className="text-[10px] text-slate-400 mt-1.5 font-medium flex items-center gap-1.5 transition-colors duration-300 dark:text-slate-500">
                            {n.date} <span className="w-1 h-1 rounded-full bg-slate-300 transition-colors duration-300 dark:bg-slate-600" /> {n.time || "Aktif"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar & Profile Dropdown */}
          <div className="relative">
            <div 
              onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center text-white text-xs font-semibold cursor-pointer shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : role === "superadmin" ? "SA" : role === "admin" ? "AD" : "US"}
            </div>

            {showProfileMenu && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right transition-colors dark:bg-slate-900/95 dark:border-slate-700"
              >
                <div className="px-5 py-4 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 dark:bg-slate-800/80 dark:border-slate-700 transition-colors duration-300">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {currentUser?.name || (role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin Ruangan" : "Pengguna")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser?.email || (role === "superadmin" ? "superadmin@oikn.go.id" : role === "admin" ? "admin@oikn.go.id" : "user@oikn.go.id")}
                  </div>
                  <div className="mt-2 inline-block px-2 py-0.5 bg-indigo-100 dark:bg-emerald-500/20 text-indigo-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider">
                    {role}
                  </div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => { setShowProfileMenu(false); onLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-sm transition-all duration-300 group font-medium"
                  >
                    <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Keluar Sistem
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/50 z-40 flex items-center justify-around h-16 pb-safe px-2 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] transition-colors duration-300 dark:bg-slate-950/80 dark:border-slate-800">
        <button onClick={() => onNavigate("calendar")} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentPage === "calendar" ? "text-indigo-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
          <Calendar size={20} className={currentPage === "calendar" ? "fill-indigo-50 dark:fill-emerald-900/30" : ""} />
          <span className="text-[10px] font-semibold tracking-wide">Kalender</span>
        </button>
        <button onClick={() => onNavigate("rooms")} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentPage === "rooms" ? "text-indigo-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
          <Building2 size={20} className={currentPage === "rooms" ? "fill-indigo-50 dark:fill-emerald-900/30" : ""} />
          <span className="text-[10px] font-semibold tracking-wide">Ruangan</span>
        </button>

        {/* Center QR Scan Button */}
        <div className="relative -top-6">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('menara:trigger-scan-simulator'))} 
            className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-indigo-600 dark:from-emerald-500 dark:to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 dark:shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 border-4 border-slate-50 rotate-3 hover:rotate-6 dark:border-slate-900"
          >
            <QrCode size={24} />
          </button>
        </div>

        <button onClick={() => onNavigate("my-bookings")} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentPage === "my-bookings" ? "text-indigo-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
          <BookOpen size={20} className={currentPage === "my-bookings" ? "fill-indigo-50 dark:fill-emerald-900/30" : ""} />
          <span className="text-[10px] font-semibold tracking-wide">Booking</span>
        </button>
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 transition-colors dark:text-indigo-400">
          <Menu size={20} />
          <span className="text-[10px] font-semibold tracking-wide">Menu</span>
        </button>
      </div>
    </div>
  );
}
