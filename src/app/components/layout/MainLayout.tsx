import { useState, useEffect } from "react";
import { Menu, Bell, Search } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { bookingService } from "../../services/bookingService";

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

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        const res = await bookingService.list({ limit: 15 });
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

        setNotifications(items);
        
        // Calculate unread count (e.g. number of pending or newly updated bookings)
        const unread = items.filter((n: any) => n.status === "pending" || n.type === "success").length;
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-40 h-full
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
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0 z-30">
          <button
            onClick={() => { setMobileOpen(!mobileOpen); if (window.innerWidth >= 1024) setSidebarCollapsed(!sidebarCollapsed); }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-gray-800 hidden sm:block" style={{ fontWeight: 600, fontSize: "1rem", lineHeight: 1.3 }}>{pageTitle}</h1>
            {pageSubtitle && <p className="text-gray-400 text-xs hidden sm:block">{pageSubtitle}</p>}
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-64">
            <Search size={15} className="text-gray-400" />
            <input type="text" placeholder="Cari ruangan, booking..." className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400" />
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="relative text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold animate-pulse" style={{ fontSize: "9px" }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 flex flex-col animate-in fade-in slide-in-from-top-3 duration-200"
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-800 font-bold">Notifikasi Sistem</span>
                  <button onClick={() => setNotifications([])} className="text-xs text-blue-600 hover:underline">Bersihkan</button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === "success" ? "bg-green-500 animate-ping" :
                          n.type === "warning" ? "bg-amber-500 animate-pulse" :
                          n.type === "error" ? "bg-red-500" : "bg-blue-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-normal" style={{ fontWeight: n.type === "success" || n.type === "warning" ? 500 : 400 }}>{n.text}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">{n.date} · {n.time || "Aktif"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs cursor-pointer" style={{ fontWeight: 600 }}>
            {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : role === "superadmin" ? "SA" : role === "admin" ? "AD" : "US"}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
