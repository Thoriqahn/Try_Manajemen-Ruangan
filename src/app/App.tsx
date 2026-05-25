import { useState, useEffect } from "react";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { MainLayout } from "./components/layout/MainLayout";
import { CalendarView } from "./components/user/CalendarView";
import { RoomList } from "./components/user/RoomList";
import { RoomDetail } from "./components/user/RoomDetail";
import { MyBookings } from "./components/user/MyBookings";
import { WorkspaceDeskMap } from "./components/workspace/WorkspaceDeskMap";
import { WorkspaceApproval } from "./components/admin/WorkspaceApproval";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ApprovalQueue } from "./components/admin/ApprovalQueue";
import { ScheduleControl } from "./components/admin/ScheduleControl";
import { RoomManagement } from "./components/admin/RoomManagement";
import { UserManagement } from "./components/superadmin/UserManagement";
import { BuildingManagement } from "./components/superadmin/BuildingManagement";
import { GlobalPolicy } from "./components/superadmin/GlobalPolicy";
import { ApiMonitoring } from "./components/superadmin/ApiMonitoring";
import { AuditTrail } from "./components/superadmin/AuditTrail";
import { ZoomManagement } from "./components/superadmin/ZoomManagement";
import { authService } from "./services/authService";
import { TokenStore, UserStore } from "./services/apiClient";
import { Toaster } from "./components/ui/sonner";
import { QrScanSimulator } from "./components/shared/QrScanSimulator";


type Page =
  | "login" | "register" | "forgot-password"
  | "calendar" | "rooms" | "room-detail" | "my-bookings" | "workspaces"
  | "admin-dashboard" | "admin-approval" | "admin-schedule" | "admin-rooms" | "admin-workspace-approval"
  | "sa-buildings" | "sa-rooms" | "sa-users" | "sa-policy" | "sa-api" | "sa-audit" | "sa-zoom";

type Role = "user" | "admin" | "superadmin";

interface NavState {
  page: Page;
  data?: any;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  calendar: { title: "Kalender Ruangan", subtitle: "Cari dan pesan slot waktu yang tersedia" },
  rooms: { title: "Daftar Ruangan", subtitle: "Jelajahi semua ruangan yang tersedia" },
  "room-detail": { title: "Detail Ruangan" },
  "my-bookings": { title: "Dashboard Saya", subtitle: "Pantau penempatan meja kerja dan jadwal reservasi rapat Anda" },
  workspaces: { title: "Manajemen Ruang Kerja", subtitle: "Denah spasial dan penempatan tempat duduk Anda" },
  "admin-dashboard": { title: "Dashboard", subtitle: "Statistik operasional ruangan" },
  "admin-approval": { title: "Persetujuan Booking", subtitle: "Kelola antrean permohonan booking" },
  "admin-schedule": { title: "Jadwal Aktif", subtitle: "Pantau dan kelola jadwal yang sedang berjalan" },
  "admin-rooms": { title: "Kelola Ruangan", subtitle: "Manajemen ruangan yang menjadi tanggung jawab Anda" },
  "admin-workspace-approval": { title: "Persetujuan Meja", subtitle: "Kelola antrean permohonan meja pegawai" },
  "sa-buildings": { title: "Manajemen Gedung", subtitle: "Kelola daftar gedung, kantor, dan lokasi peta" },
  "sa-rooms": { title: "Ruangan Global", subtitle: "Kelola seluruh ruangan di semua gedung" },
  "sa-users": { title: "Manajemen Pengguna", subtitle: "Kelola akun dan delegasi wilayah tugas" },
  "sa-policy": { title: "Kebijakan Global", subtitle: "Atur batasan dan blackout dates sistem" },
  "sa-api": { title: "Integrasi & API", subtitle: "Pantau trafik dan kelola token akses" },
  "sa-audit": { title: "Riwayat Aktivitas", subtitle: "Audit trail yang immutable" },
  "sa-zoom": { title: "Integrasi Zoom", subtitle: "Konfigurasi OAuth dan kelola pool akun Zoom" },
};

const defaultPage: Record<Role, Page> = {
  user: "calendar",
  admin: "admin-dashboard",
  superadmin: "sa-rooms",
};

import PublicAttendance from "./pages/PublicAttendance";
import QrRedirect from "./pages/QrRedirect";

export default function App() {
  const isPresensiPath = window.location.pathname.startsWith('/presensi/');

  const [authPage, setAuthPage] = useState<"login" | "register" | "forgot-password">("login");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [nav, setNav] = useState<NavState>({ page: "calendar" });
  const [initializing, setInitializing] = useState(!isPresensiPath);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedUser = UserStore.get();
    const token = TokenStore.get();
    if (storedUser && token) {
      setCurrentUser(storedUser);
      setNav({ page: defaultPage[storedUser.role as Role] || "calendar" });
    }
    setInitializing(false);
  }, []);

  // Handle session expiry event from API client
  useEffect(() => {
    const handler = () => {
      setCurrentUser(null);
      setAuthPage("login");
    };
    window.addEventListener('menara:session-expired', handler);
    return () => window.removeEventListener('menara:session-expired', handler);
  }, []);

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    UserStore.set(user);
    setNav({ page: defaultPage[user.role] });
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setAuthPage("login");
  };

  const handleNavigate = (page: string, data?: any) => {
    setNav({ page: page as Page, data });
  };

  if (isPresensiPath) {
    return (
      <>
        <PublicAttendance />
        <Toaster position="top-center" closeButton richColors />
      </>
    );
  }

  const isQrPath = window.location.pathname.startsWith('/qr/');
  if (isQrPath) {
    return (
      <>
        <QrRedirect />
        <Toaster position="top-center" closeButton richColors />
      </>
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500 dark:bg-emerald-500 rounded-full blur-md opacity-20 animate-pulse"></div>
            <div className="w-12 h-12 border-[3px] border-indigo-100 dark:border-emerald-900/50 border-t-indigo-600 dark:border-t-emerald-500 rounded-full animate-spin relative z-10" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm tracking-wide">Memuat Menara...</p>
        </div>
      </div>
    );
  }

  // Auth screens
  if (!currentUser) {
    if (authPage === "register") return <RegisterPage onNavigate={setAuthPage as any} onLogin={handleLogin} />;
    if (authPage === "forgot-password") return <ForgotPasswordPage onNavigate={setAuthPage as any} />;
    return <LoginPage onLogin={handleLogin} onNavigate={setAuthPage as any} />;
  }

  const role = currentUser.role;
  const pageInfo = pageTitles[nav.page] || { title: "Menara" };

  const renderPage = () => {
    switch (nav.page) {
      // User
      case "calendar":
        return <CalendarView onNavigate={handleNavigate} userRole={role} />;
      case "rooms":
        return <RoomList onNavigate={handleNavigate} />;
      case "room-detail":
        return <RoomDetail roomId={nav.data?.roomId || "r1"} onNavigate={handleNavigate} userRole={role} />;
      case "my-bookings":
        return <MyBookings onNavigate={handleNavigate} />;
      case "workspaces":
        return <WorkspaceDeskMap initialRoomId={nav.data?.roomId} />;

      // Admin
      case "admin-dashboard":
        return <AdminDashboard onNavigate={handleNavigate} isSuperAdmin={role === "superadmin"} />;
      case "admin-approval":
        return <ApprovalQueue onNavigate={handleNavigate} isSuperAdmin={role === "superadmin"} />;
      case "admin-schedule":
        return <ScheduleControl />;
      case "admin-rooms":
        return <RoomManagement isSuperAdmin={false} onNavigate={handleNavigate} />;
      case "admin-workspace-approval":
        return <WorkspaceApproval onNavigate={handleNavigate} isSuperAdmin={role === "superadmin"} />;

      // Super Admin
      case "sa-buildings":
        return <BuildingManagement />;
      case "sa-rooms":
        return <RoomManagement isSuperAdmin={true} onNavigate={handleNavigate} />;
      case "sa-users":
        return <UserManagement />;
      case "sa-policy":
        return <GlobalPolicy />;
      case "sa-api":
        return <ApiMonitoring />;
      case "sa-audit":
        return <AuditTrail />;
      case "sa-zoom":
        return <ZoomManagement />;

      default:
        return <CalendarView onNavigate={handleNavigate} userRole={role} />;
    }
  };

  return (
    <>
      <MainLayout
        role={role}
        currentUser={currentUser}
        currentPage={nav.page}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        pageTitle={pageInfo.title}
        pageSubtitle={pageInfo.subtitle}
      >
        {renderPage()}
      </MainLayout>
      <QrScanSimulator onCheckInSuccess={() => { window.dispatchEvent(new CustomEvent('menara:checkin-success')); }} />
      <Toaster position="top-center" closeButton richColors />
    </>
  );
}
