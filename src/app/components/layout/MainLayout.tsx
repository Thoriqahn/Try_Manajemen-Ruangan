import { useState } from "react";
import { Menu, Bell, Search } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  role: "user" | "admin" | "superadmin";
  currentUser?: { id: string; name: string; email: string; role: string } | null;
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
          currentPage={currentPage}
          onNavigate={(page) => { onNavigate(page); setMobileOpen(false); }}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0">
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

          {/* Notifications */}
          <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: "10px", fontWeight: 700 }}>3</span>
          </button>

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
