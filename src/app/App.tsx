import { useState, useEffect } from "react";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { MainLayout } from "./components/layout/MainLayout";
import { CalendarView } from "./components/user/CalendarView";
import { RoomList } from "./components/user/RoomList";
import { RoomDetail } from "./components/user/RoomDetail";
import { MyBookings } from "./components/user/MyBookings";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ApprovalQueue } from "./components/admin/ApprovalQueue";
import { ScheduleControl } from "./components/admin/ScheduleControl";
import { RoomManagement } from "./components/admin/RoomManagement";
import { UserManagement } from "./components/superadmin/UserManagement";
import { BuildingManagement } from "./components/superadmin/BuildingManagement";
import { GlobalPolicy } from "./components/superadmin/GlobalPolicy";
import { ApiMonitoring } from "./components/superadmin/ApiMonitoring";
import { AuditTrail } from "./components/superadmin/AuditTrail";
import { authService } from "./services/authService";
import { TokenStore, UserStore } from "./services/apiClient";
import { Toaster } from "./components/ui/sonner";

type Page =
  | "login" | "register" | "forgot-password"
  | "calendar" | "rooms" | "room-detail" | "my-bookings"
  | "admin-dashboard" | "admin-approval" | "admin-schedule" | "admin-rooms"
  | "sa-buildings" | "sa-rooms" | "sa-users" | "sa-policy" | "sa-api" | "sa-audit";

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
  "my-bookings": { title: "Booking Saya", subtitle: "Kelola reservasi ruangan Anda" },
  "admin-dashboard": { title: "Dashboard", subtitle: "Statistik operasional ruangan" },
  "admin-approval": { title: "Persetujuan Booking", subtitle: "Kelola antrean permohonan booking" },
  "admin-schedule": { title: "Jadwal Aktif", subtitle: "Pantau dan kelola jadwal yang sedang berjalan" },
  "admin-rooms": { title: "Kelola Ruangan", subtitle: "Manajemen ruangan yang menjadi tanggung jawab Anda" },
  "sa-buildings": { title: "Manajemen Gedung", subtitle: "Kelola daftar gedung, kantor, dan lokasi peta" },
  "sa-rooms": { title: "Ruangan Global", subtitle: "Kelola seluruh ruangan di semua gedung" },
  "sa-users": { title: "Manajemen Pengguna", subtitle: "Kelola akun dan delegasi wilayah tugas" },
  "sa-policy": { title: "Kebijakan Global", subtitle: "Atur batasan dan blackout dates sistem" },
  "sa-api": { title: "Integrasi & API", subtitle: "Pantau trafik dan kelola token akses" },
  "sa-audit": { title: "Riwayat Aktivitas", subtitle: "Audit trail yang immutable" },
};

const defaultPage: Record<Role, Page> = {
  user: "calendar",
  admin: "admin-dashboard",
  superadmin: "sa-rooms",
};

export default function App() {
  const [authPage, setAuthPage] = useState<"login" | "register" | "forgot-password">("login");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [nav, setNav] = useState<NavState>({ page: "calendar" });
  const [initializing, setInitializing] = useState(true);

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

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F2144] to-[#1E3A5F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Memuat Menara...</p>
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

      // Admin
      case "admin-dashboard":
        return <AdminDashboard onNavigate={handleNavigate} isSuperAdmin={role === "superadmin"} />;
      case "admin-approval":
        return <ApprovalQueue onNavigate={handleNavigate} isSuperAdmin={role === "superadmin"} />;
      case "admin-schedule":
        return <ScheduleControl />;
      case "admin-rooms":
        return <RoomManagement isSuperAdmin={false} onNavigate={handleNavigate} />;

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
      <Toaster position="top-center" closeButton richColors />
    </>
  );
}
