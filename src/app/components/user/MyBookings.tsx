import { useState, useEffect } from "react";
import { 
  Search, Calendar, MapPin, Clock, AlertTriangle, Video, ExternalLink, 
  Armchair, ArrowRight, CheckCircle2, Sparkles, X, Building, Check, 
  CheckSquare, Info, Map, User, UserCheck, HelpCircle, BarChart2, ShieldAlert,
  QrCode
} from "lucide-react";
import { bookingService } from "../../services/bookingService";
import { workspaceService, AssignedDesk, PendingRequest, DeskNode } from "../../services/workspaceService";
import { buildingService } from "../../services/index";
import { roomService, Room } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';

interface MyBookingsProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: "bg-blue-50 border border-blue-200 text-blue-700", label: "Dikonfirmasi" },
  pending: { bg: "bg-amber-50 border border-amber-200 text-amber-700", label: "Menunggu Approval" },
  ongoing: { bg: "bg-green-50 border border-green-200 text-green-700", label: "Sedang Berjalan" },
  completed: { bg: "bg-slate-50 border border-slate-200 text-slate-600", label: "Selesai" },
  cancelled: { bg: "bg-red-50 border border-red-200 text-red-600", label: "Dibatalkan" },
  rejected: { bg: "bg-rose-50 border border-rose-200 text-rose-600", label: "Ditolak" },
  CANCELLED_NOSHOW: { bg: "bg-red-100 border border-red-300 text-red-800", label: "No-Show (Batal Otomatis)" }
};

const meetingTypeBadge: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  offline: { bg: "bg-slate-50 border border-slate-200 text-slate-600", label: "Offline", icon: "🏢" },
  online: { bg: "bg-purple-50 border border-purple-200 text-purple-700", label: "Online", icon: "💻" },
  hybrid: { bg: "bg-teal-50 border border-teal-200 text-teal-700", label: "Hybrid", icon: "🔄" },
};

// Fallback Mock Bookings Data for Demonstration
const mockBookings = [
  {
    id: "mock-1",
    agenda: "Rapat Pleno Sinkronisasi Infrastruktur Hijau KIPP IKN",
    room_name: "Ruang Rapat Nusantara",
    building_name: "Gedung Utama OIKN",
    date: new Date().toISOString().split('T')[0], // today
    start_time: "14:00",
    end_time: "16:00",
    status: "ongoing",
    meeting_type: "hybrid",
    zoom_join_url: "https://zoom.us/j/9876543210",
    zoom_passcode: "IKN2026",
    zoom_host_email: "sekretariat.bidang1@oikn.go.id",
    surat_terkait: "S-142/OIKN/PAN/2026"
  },
  {
    id: "mock-2",
    agenda: "Sinkronisasi Peta Spasial Tata Ruang Kawasan Inti Pusat Pemerintahan",
    room_name: "Ruang Rapat Garuda",
    building_name: "Gedung Utama OIKN",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    start_time: "09:00",
    end_time: "11:30",
    status: "confirmed",
    meeting_type: "offline",
    surat_terkait: "S-143/OIKN/PAN/2026"
  },
  {
    id: "mock-3",
    agenda: "Review Progress Masterplan Sistem Pengolahan Sampah Terpadu",
    room_name: "Ruang Kerja Kolaboratif 3A",
    building_name: "Gedung Utama OIKN",
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // in 2 days
    start_time: "13:30",
    end_time: "15:00",
    status: "pending",
    meeting_type: "online",
    zoom_join_url: "https://zoom.us/j/9876543211",
    zoom_passcode: "BAPP2026",
    zoom_host_email: "env.planning@bappenas.go.id"
  },
  {
    id: "mock-4",
    agenda: "Evaluasi Tahunan Relokasi ASN Tahap I Kementerian/Lembaga",
    room_name: "Ruang Rapat Amarta",
    building_name: "Gedung Utama OIKN",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago
    start_time: "10:00",
    end_time: "12:00",
    status: "completed",
    meeting_type: "offline",
    surat_terkait: "S-112/OIKN/PAN/2026"
  },
  {
    id: "mock-5",
    agenda: "Koordinasi Penyediaan Jaringan Listrik dan Fiber Optik KIPP",
    room_name: "Ruang Rapat Nusantara",
    building_name: "Gedung Utama OIKN",
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], // 5 days ago
    start_time: "14:00",
    end_time: "16:30",
    status: "cancelled",
    meeting_type: "hybrid",
    cancel_reason: "Perubahan jadwal koordinasi pimpinan pusat"
  }
];

// Fallback Mock Seating Data
const defaultMockDesk = {
  desk_id: "WS-B8-14",
  status: "OCCUPIED",
  room_id: "r7",
  room_name: "Ruang Kerja Bersama Level 5",
  floor_name: "Lantai 5",
  building_name: "Gedung Utama Bappenas KIPP"
};

function isZoomButtonEnabled(booking: any): boolean {
  if (!booking.zoom_join_url) return false;
  const now = new Date();
  const bookingDate = booking.date;
  const [startH, startM] = booking.start_time.split(":").map(Number);
  const [endH, endM] = booking.end_time.split(":").map(Number);

  const start = new Date(`${bookingDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
  const end = new Date(`${bookingDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

  // Enable 15 minutes before start until end
  const enableAt = new Date(start.getTime() - 15 * 60 * 1000);
  return now >= enableAt && now <= end;
}

function getZoomButtonStatus(booking: any): { enabled: boolean; label: string } {
  if (!booking.zoom_join_url) return { enabled: false, label: "Link belum tersedia" };

  const now = new Date();
  const bookingDate = booking.date;
  const [startH, startM] = booking.start_time.split(":").map(Number);
  const [endH, endM] = booking.end_time.split(":").map(Number);

  const start = new Date(`${bookingDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
  const end = new Date(`${bookingDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
  const enableAt = new Date(start.getTime() - 15 * 60 * 1000);

  if (now < enableAt) {
    const diff = enableAt.getTime() - now.getTime();
    const mins = Math.ceil(diff / 60000);
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return { enabled: false, label: `Aktif dalam ${hours}j ${mins % 60}m` };
    }
    return { enabled: false, label: `Aktif dalam ${mins} menit` };
  }
  if (now > end) return { enabled: false, label: "Rapat sudah selesai" };
  return { enabled: true, label: "Masuk Rapat Zoom" };
}

export function MyBookings({ onNavigate }: MyBookingsProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "ongoing" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // QR Scanner States

  // Attendees States
  const [attendeesModal, setAttendeesModal] = useState<string | null>(null);
  const [attendeesList, setAttendeesList] = useState<any[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Seating States
  const [seatingLoading, setSeatingLoading] = useState(true);
  const [assignedDesk, setAssignedDesk] = useState<AssignedDesk | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);

  // Relocation Modal States
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [floorsList, setFloorsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  
  const [modalBuilding, setModalBuilding] = useState("");
  const [modalFloor, setModalFloor] = useState("");
  const [modalRoom, setModalRoom] = useState("");
  
  const [modalLayout, setModalLayout] = useState<DeskNode[]>([]);
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalLoadingLayout, setModalLoadingLayout] = useState(false);
  const [modalSelectedDesk, setModalSelectedDesk] = useState<DeskNode | null>(null);
  const [modalRationale, setModalRationale] = useState("");
  const [modalSubmitLoading, setModalSubmitLoading] = useState(false);

  const currentUser = UserStore.get();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.list({ own_only: "true" });
      if (res.success && res.data && res.data.length > 0) {
        setBookings(res.data);
      } else {
        setBookings(mockBookings);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setBookings(mockBookings);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeating = async () => {
    setSeatingLoading(true);
    try {
      const res = await workspaceService.getMySeating();
      if (res.success && res.data) {
        if (res.data.assigned_desk) {
          setAssignedDesk(res.data.assigned_desk);
        } else {
          setAssignedDesk(defaultMockDesk);
        }
        setPendingRequest(res.data.pending_request);
      } else {
        setAssignedDesk(defaultMockDesk);
      }
    } catch (err) {
      console.error("Gagal mengambil data penempatan meja:", err);
      setAssignedDesk(defaultMockDesk);
    } finally {
      setSeatingLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchSeating();
    
    const handleCheckInSuccess = () => fetchBookings();
    window.addEventListener('menara:checkin-success', handleCheckInSuccess);
    return () => window.removeEventListener('menara:checkin-success', handleCheckInSuccess);
  }, []);

  // Refresh every minute for zoom button timing and status check
  useEffect(() => {
    const interval = setInterval(() => {
      setBookings(prev => [...prev]); // trigger re-render for time checks
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load Buildings for Modal Seating Relocation
  useEffect(() => {
    if (isSeatingModalOpen) {
      buildingService.list().then(res => {
        setBuildingsList(res.data || []);
        if (res.data && res.data.length > 0) {
          // preselect current building if available
          const currentBId = assignedDesk?.building_name 
            ? res.data.find((b: any) => b.name === assignedDesk.building_name)?.id 
            : null;
          setModalBuilding(currentBId || res.data[0].id);
        }
      }).catch(err => {
        console.error("Failed to load buildings:", err);
      });

      roomService.list().then(res => {
        const workspaces = (res.data || []).filter(r => r.jenis_manajemen_ruang === "WORKSPACE");
        setRoomsList(workspaces);
      }).catch(err => {
        console.error("Failed to load workspaces:", err);
      });
    }
  }, [isSeatingModalOpen, assignedDesk]);

  // Load floors when modal building changes
  useEffect(() => {
    if (modalBuilding) {
      buildingService.listFloors(modalBuilding).then(res => {
        const newFloors = res.data || [];
        setFloorsList(newFloors);
        if (newFloors.length > 0) {
          // preselect current floor if available
          const currentFId = assignedDesk?.floor_name
            ? newFloors.find((f: any) => f.name === assignedDesk.floor_name)?.id
            : null;
          setModalFloor(currentFId || newFloors[0].id);
        } else {
          setModalFloor("");
        }
      }).catch(() => {});
    } else {
      setFloorsList([]);
      setModalFloor("");
    }
  }, [modalBuilding, assignedDesk]);

  // Filter workspaces for modal selection
  const modalFilteredRooms = roomsList.filter(r => 
    r.building_id === modalBuilding && 
    r.floor_id === modalFloor
  );

  // Auto-select room in modal when filtered list changes
  useEffect(() => {
    if (modalFilteredRooms.length > 0) {
      const currentRId = assignedDesk?.room_name
        ? modalFilteredRooms.find(r => r.name === assignedDesk.room_name)?.id
        : null;
      setModalRoom(currentRId || modalFilteredRooms[0].id);
    } else {
      setModalRoom("");
    }
  }, [modalBuilding, modalFloor, roomsList, assignedDesk]);

  // Load desk layout for selected modal workspace room
  const loadModalLayout = async (roomId: string) => {
    if (!roomId) return;
    setModalLoadingLayout(true);
    try {
      const res = await workspaceService.getLayout(roomId);
      if (res.success) {
        setModalLayout(res.desks || []);
        setModalRoomName(res.room_name || "");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat denah meja.");
    } finally {
      setModalLoadingLayout(false);
    }
  };

  useEffect(() => {
    if (modalRoom) {
      loadModalLayout(modalRoom);
      setModalSelectedDesk(null);
    } else {
      setModalLayout([]);
      setModalRoomName("");
      setModalSelectedDesk(null);
    }
  }, [modalRoom]);

  const handleModalDeskClick = (desk: DeskNode) => {
    if (desk.status === "VACANT") {
      setModalSelectedDesk(desk);
    } else {
      toast.warning("Meja terpilih harus dalam status KOSONG (VACANT).");
    }
  };

  const handleSubmitSeatingRequest = async () => {
    if (!modalRoom || !modalSelectedDesk) return;
    if (modalRationale.trim().length < 10) {
      toast.error("Alasan relokasi wajib diisi, minimal 10 karakter.");
      return;
    }
    setModalSubmitLoading(true);
    try {
      await workspaceService.submitRequest(modalRoom, modalSelectedDesk.desk_id);
      toast.success(`Permintaan relokasi ke meja ${modalSelectedDesk.desk_id} berhasil diajukan!`);
      setIsSeatingModalOpen(false);
      setModalSelectedDesk(null);
      setModalRationale("");
      // Refetch to update seating status immediately on the dashboard
      fetchSeating();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim pengajuan relokasi.");
    } finally {
      setModalSubmitLoading(false);
    }
  };

  const getBookingCategory = (b: any) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (["completed", "cancelled", "rejected", "CANCELLED_NOSHOW"].includes(b.status)) {
      return "past";
    }
    if (b.status === "ongoing") {
      return "ongoing";
    }
    if (b.status === "confirmed") {
      if (b.date === today) {
        const startTime = new Date(`${b.date}T${b.start_time}:00`);
        const endTime = new Date(`${b.date}T${b.end_time}:00`);
        // Early check-in allowed 15 mins before
        const earlyLimit = new Date(startTime.getTime() - 15 * 60 * 1000);
        if (now >= earlyLimit && now <= endTime) {
          return "ongoing"; // Time has arrived, show in ongoing for check-in
        }
      }
      return "upcoming";
    }
    if (b.status === "pending") {
      return "upcoming";
    }
    return "past";
  };

  const tabBookings = bookings.filter(b => {
    const category = getBookingCategory(b);
    if (activeTab !== category) return false;

    if (search) {
      return (b.room_name || "").toLowerCase().includes(search.toLowerCase()) ||
        b.agenda.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const tabCount = (tab: "upcoming" | "ongoing" | "past") =>
    bookings.filter(b => getBookingCategory(b) === tab).length;

  const handleCancel = async (id: string) => {
    setCancelLoading(true);
    try {
      if (id.startsWith("mock-")) {
        // Handle mock cancellation locally
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled", cancel_reason: "Dibatalkan oleh pengguna" } : b));
        setCancelModal(null);
        toast.success("Reservasi rapat simulasi berhasil dibatalkan.");
      } else {
        // Real API call
        const res = await bookingService.cancel(id, "Dibatalkan oleh pengguna");
        if (res.success) {
          setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
          setCancelModal(null);
          toast.success("Reservasi rapat berhasil dibatalkan.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan booking");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenAttendees = async (bookingId: string) => {
    setAttendeesModal(bookingId);
    setAttendeesLoading(true);
    try {
      const res = await bookingService.getAttendees(bookingId);
      if (res.success && res.data) {
        setAttendeesList(res.data);
      } else {
        setAttendeesList([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat daftar hadir.");
      setAttendeesList([]);
    } finally {
      setAttendeesLoading(false);
    }
  };

  // Metrik Statistik
  const totalRapatBulanIni = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length;
  const nextMeeting = bookings.find(b => ["confirmed", "ongoing"].includes(b.status));

  return (
    <div className="p-6 space-y-6">
      
      {/* Greetings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-150/60">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            Selamat Bekerja, {currentUser?.name || "Budi Santoso"} <Sparkles size={16} className="text-yellow-500 animate-pulse" />
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Kementerian PPN/Bappenas · Otorita Ibu Kota Nusantara (OIKN)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-150 rounded-2xl px-4 py-2 shadow-sm flex-shrink-0 self-start sm:self-center">
          <div className="w-8 h-8 rounded-full bg-[#1E3A5F] border border-blue-900/10 flex items-center justify-center overflow-hidden">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : "US"}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Departemen Kerja</span>
            <span className="text-[11px] font-bold text-gray-700">Divisi Teknologi Informasi IKN</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Rapat Bulan Ini</span>
            <h4 className="text-base font-extrabold text-gray-800 mt-0.5">{totalRapatBulanIni} Rapat</h4>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Armchair size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Meja Kerja Anda</span>
            <h4 className="text-base font-extrabold text-gray-800 mt-0.5">{assignedDesk?.desk_id || "Belum Ada"}</h4>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Agenda Rapat Terdekat</span>
            <h4 className="text-xs font-extrabold text-gray-800 mt-0.5 truncate" title={nextMeeting?.agenda || "Tidak ada rapat terdekat"}>
              {nextMeeting ? `${nextMeeting.start_time} - ${nextMeeting.agenda}` : "Tidak Ada"}
            </h4>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tingkat Kehadiran</span>
            <h4 className="text-base font-extrabold text-gray-800 mt-0.5">96.8%</h4>
          </div>
        </div>

      </div>

      {/* Seating Assignment Card Section */}
      <div className="bg-gradient-to-br from-[#0F2042] via-[#1E3A60] to-[#254A7B] text-white rounded-3xl p-6 shadow-xl border border-blue-900/30 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] group">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-400/20 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Armchair size={10} /> Penempatan Meja Kerja
              </span>
              {pendingRequest && (
                <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <AlertTriangle size={10} /> Pengajuan Pindah Pending
                </span>
              )}
            </div>
            
            {seatingLoading ? (
              <div className="space-y-2">
                <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
              </div>
            ) : assignedDesk ? (
              <div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  {assignedDesk.building_name}
                </h3>
                <p className="text-sm text-blue-200 mt-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-300 flex-shrink-0" />
                  <span>{assignedDesk.floor_name} · {assignedDesk.room_name}</span>
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-blue-100/80">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-400" /> Alokasi Kerja Dinas Aktif</span>
                  <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-yellow-300" /> Fasilitas Premium Bersama</span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white">Belum Memiliki Tempat Duduk</h3>
                <p className="text-sm text-blue-200 mt-1">
                  Anda belum terdaftar pada meja kerja manapun di Kawasan Inti IKN. Silakan ajukan penempatan meja.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
            {assignedDesk ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">ID Kursi Anda</span>
                  <span className="text-3xl font-extrabold text-white tracking-wider block filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {assignedDesk.desk_id}
                  </span>
                </div>
                <div className="sm:hidden text-left bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-[9px] text-blue-300 font-bold block uppercase">Meja</span>
                  <span className="text-lg font-black text-white">{assignedDesk.desk_id}</span>
                </div>
                
                <button
                  onClick={() => setIsSeatingModalOpen(true)}
                  className="px-5 py-3 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:shadow-xl hover:scale-105 active:scale-95 group/btn"
                >
                  Ganti Tempat Duduk
                  <ArrowRight size={13} className="text-blue-800 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSeatingModalOpen(true)}
                className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:shadow-xl hover:scale-105 active:scale-95 group/btn"
              >
                Ajukan Penempatan Meja Kerja Baru
                <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-1" />
              </button>
            )}
          </div>
        </div>

        {/* Pending seating request warning alert */}
        {!seatingLoading && pendingRequest && (
          <div className="mt-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <AlertTriangle className="text-amber-400 flex-shrink-0" size={18} />
            <div className="text-xs text-amber-200">
              Permintaan relokasi Anda ke meja <strong className="text-white underline">{pendingRequest.desk_id}</strong> di <strong className="text-white">{pendingRequest.room_name}</strong> diajukan pada {new Date(pendingRequest.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })} sedang dalam antrean peninjauan oleh Admin.
            </div>
          </div>
        )}
      </div>

      {/* Booking and Meetings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reservasi Rapat & Kolaborasi</h3>
            <p className="text-xs text-gray-400">Jadwal rapat ongoing, upcoming, dan riwayat pemesanan ruangan Anda</p>
          </div>
          
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari agenda atau ruangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white text-gray-700"
            />
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-md border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-150 bg-gray-50/50">
            {(["upcoming", "ongoing", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all relative ${
                  activeTab === tab 
                    ? "text-[#1E3A5F] bg-[#1E3A5F]/5" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab === "upcoming" ? "Akan Datang" : tab === "ongoing" ? "Sedang Berjalan" : "Riwayat"}
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-extrabold ${
                  activeTab === tab 
                    ? "bg-[#1E3A5F]/10 text-[#1E3A5F]" 
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {tabCount(tab)}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E3A5F]" />
                )}
              </button>
            ))}
          </div>

          {/* Booking Cards */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 space-y-3">
                  <div className="flex gap-2"><Shimmer className="h-4 w-20" /><Shimmer className="h-4 w-14" /></div>
                  <Shimmer className="h-5 w-2/3" />
                  <Shimmer className="h-3.5 w-1/2" />
                </div>
              ))
            ) : tabBookings.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-bold text-sm">Tidak ada booking</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  {activeTab === "upcoming" ? "Anda belum memiliki reservasi mendatang" :
                   activeTab === "ongoing" ? "Tidak ada booking yang sedang berlangsung" :
                   "Belum ada riwayat booking"}
                </p>
                {activeTab === "upcoming" && (
                  <button onClick={() => onNavigate("rooms")} className="mt-4 px-4 py-2 bg-[#1E3A5F] hover:bg-[#254A7B] text-white rounded-xl text-xs font-bold transition-all shadow">
                    Cari & Booking Ruangan
                  </button>
                )}
              </div>
            ) : (
              tabBookings.map((booking) => {
                const cfg = statusConfig[booking.status] || statusConfig.completed;
                const mtBadge = meetingTypeBadge[booking.meeting_type || "offline"];
                const zoomStatus = getZoomButtonStatus(booking);

                return (
                  <div key={booking.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                          {mtBadge && booking.meeting_type && booking.meeting_type !== "offline" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mtBadge.bg} flex items-center gap-1`}>
                              {mtBadge.icon} {mtBadge.label}
                            </span>
                          )}
                          {booking.id.startsWith("mock-") && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Simulasi
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-gray-800 text-sm font-bold truncate leading-snug">{booking.agenda}</h4>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                          {booking.room_name && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{booking.room_name} · {booking.building_name || ""}</span>
                            </div>
                          )}
                          {booking.meeting_type === "online" && !booking.room_name && (
                            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                              <Video size={12} className="flex-shrink-0" />
                              <span>Rapat Online (Zoom)</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                            <span>{booking.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <Clock size={12} className="text-gray-400 flex-shrink-0" />
                            <span>{booking.start_time} – {booking.end_time}</span>
                          </div>
                        </div>

                        {/* Surat Terkait Display */}
                        {booking.surat_terkait && (
                          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-150 rounded-xl px-3 py-2 flex items-center gap-2 w-fit">
                            <span>📄</span>
                            <span className="font-semibold text-gray-600">Surat Pengantar:</span>
                            <span className="italic">{booking.surat_terkait}</span>
                          </div>
                        )}

                        {/* Zoom details */}
                        {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-3 py-2 space-y-1 w-fit min-w-[240px]">
                            <div className="flex items-center gap-2">
                              <Video size={13} className="text-indigo-600 flex-shrink-0" />
                              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Zoom Meeting Info</span>
                            </div>
                            {booking.zoom_passcode && (
                              <div className="text-xs text-indigo-600">
                                Passcode: <span className="font-mono bg-indigo-100/60 px-1.5 py-0.5 rounded text-[11px] font-bold">{booking.zoom_passcode}</span>
                              </div>
                            )}
                            {booking.zoom_host_email && (
                              <div className="text-[11px] text-indigo-500 font-medium">Host: {booking.zoom_host_email}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center md:items-end justify-between md:flex-col gap-2 flex-shrink-0">
                        {/* Map Location Button */}
                        {booking.building_name && booking.meeting_type !== "online" && (activeTab === "upcoming" || activeTab === "ongoing") && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.building_name + " IKN Nusantara")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                            title={`Lihat rute ke ${booking.building_name}`}
                          >
                            <MapPin size={13} className="text-gray-500" />
                            <span>Lokasi Gedung</span>
                          </a>
                        )}
                        
                        {/* Check-In Button for Ongoing Physical/Hybrid Meetings */}
                        {activeTab === "ongoing" && booking.meeting_type !== "online" && (
                          <button
                            onClick={() => {
                              if (booking.is_checked_in) {
                                toast.success("Anda sudah melakukan check-in untuk rapat ini.");
                              } else {
                                window.dispatchEvent(new CustomEvent('menara:trigger-scan-simulator', { detail: { bookingId: booking.id } }));
                              }
                            }}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                              booking.is_checked_in
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white hover:shadow-md hover:-translate-y-0.5"
                            }`}
                            title={booking.is_checked_in ? "Sudah Check-In" : "Scan QR untuk Presensi"}
                          >
                            <QrCode size={13} />
                            <span>{booking.is_checked_in ? "Sudah Check-In" : "Scan QR Presensi"}</span>
                          </button>
                        )}

                        {/* Attendees List Button for Ongoing/Past */}
                        {(activeTab === "ongoing" || activeTab === "past") && booking.meeting_type !== "online" && (
                          <button
                            onClick={() => handleOpenAttendees(booking.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                            title="Lihat Daftar Hadir"
                          >
                            <UserCheck size={13} className="text-emerald-500" />
                            <span>Presensi</span>
                          </button>
                        )}

                        {/* Zoom Link Trigger Button */}
                        {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                          <a
                            href={zoomStatus.enabled ? booking.zoom_join_url : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { if (!zoomStatus.enabled) e.preventDefault(); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              zoomStatus.enabled
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                            }`}
                            title={zoomStatus.label}
                          >
                            <Video size={13} />
                            <span>{zoomStatus.label}</span>
                            {zoomStatus.enabled && <ExternalLink size={11} />}
                          </a>
                        )}

                        {activeTab === "upcoming" && (
                          <button
                            onClick={() => setCancelModal(booking.id)}
                            className="px-3.5 py-2 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all"
                          >
                            Batalkan Rapat
                          </button>
                        )}
                      </div>

                    </div>

                    {booking.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={14} />
                        <p className="text-xs text-red-600 leading-normal">
                          <span className="font-bold">Alasan penolakan admin:</span> {booking.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Seating Relocation Inline Modal */}
      {isSeatingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-gray-800 font-extrabold text-base flex items-center gap-2">
                  <Armchair className="text-blue-600" size={18} /> Ganti Penempatan Tempat Duduk
                </h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Ajukan perpindahan meja kerja dinas Anda di Kawasan Inti IKN secara online
                </p>
              </div>
              <button
                onClick={() => { setIsSeatingModalOpen(false); setModalSelectedDesk(null); }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Filter Area Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-150">
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1">
                    <Building size={11} /> Gedung
                  </label>
                  <select
                    value={modalBuilding}
                    onChange={e => setModalBuilding(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white text-gray-700 font-bold"
                  >
                    <option value="" disabled>Pilih Gedung</option>
                    {buildingsList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1">
                    <MapPin size={11} /> Lantai
                  </label>
                  <select
                    value={modalFloor}
                    onChange={e => setModalFloor(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white text-gray-700 font-bold"
                    disabled={floorsList.length === 0}
                  >
                    {floorsList.length === 0 && <option value="">Tidak ada lantai</option>}
                    {floorsList.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1">
                    <UserCheck size={11} /> Ruang Kerja
                  </label>
                  <select
                    value={modalRoom}
                    onChange={e => setModalRoom(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white text-gray-700 font-bold"
                    disabled={modalFilteredRooms.length === 0}
                  >
                    {modalFilteredRooms.length === 0 && <option value="">Tidak ada workspace</option>}
                    {modalFilteredRooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Spatial Floor Plan & Action Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Visual Layout Map */}
                <div className="lg:col-span-3 border border-gray-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">{modalRoomName || "Visual Floor Plan"}</h4>
                      <p className="text-[10px] text-gray-400">Klik meja hijau kosong untuk memilih</p>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-3 text-[10px] font-semibold">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /> <span>Kosong</span></div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> <span>Terisi</span></div>
                    </div>
                  </div>

                  {modalLoadingLayout ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-gray-400 font-bold">Memuat denah...</span>
                    </div>
                  ) : modalLayout.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                      <Building size={28} className="mb-2 text-gray-300" />
                      <span className="text-xs font-bold">Tidak Ada Workspace Terpilih</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="grid grid-cols-5 md:grid-cols-6 gap-3 w-full p-2 bg-white rounded-xl border border-gray-100">
                        {modalLayout.map(desk => {
                          const isSelected = modalSelectedDesk?.desk_id === desk.desk_id;
                          let bgColor = "bg-green-50 hover:bg-green-100 text-green-700 border-green-300";
                          if (desk.status === "OCCUPIED") {
                            bgColor = "bg-blue-50 text-blue-400 border-blue-200 cursor-not-allowed";
                          } else if (desk.status === "DISABLED") {
                            bgColor = "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                          }
                          
                          if (isSelected) {
                            bgColor = "bg-green-500 text-white border-green-600 shadow ring-2 ring-green-300 scale-105";
                          }

                          return (
                            <div
                              key={desk.desk_id}
                              onClick={() => desk.status === "VACANT" && handleModalDeskClick(desk)}
                              className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer relative group ${bgColor}`}
                            >
                              <span className="text-[9px] font-extrabold">{desk.desk_id}</span>
                              {desk.status === "OCCUPIED" && (
                                <div className="absolute z-30 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity font-bold">
                                  {desk.name || "Terisi"}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Action Column */}
                <div className="lg:col-span-2 border border-gray-150 rounded-2xl p-4 bg-white space-y-4">
                  <h4 className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-100">
                    Konfirmasi Relokasi
                  </h4>
                  
                  {modalSelectedDesk ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50/50 border border-blue-150 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-semibold">ID Meja Baru:</span>
                          <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px]">
                            {modalSelectedDesk.desk_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 space-y-1">
                          <p><strong>Gedung:</strong> {buildingsList.find(b => b.id === modalBuilding)?.name}</p>
                          <p><strong>Lantai:</strong> {floorsList.find(f => f.id === modalFloor)?.name}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-gray-400 font-bold uppercase">
                          Alasan Pemindahan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Contoh: Kebutuhan tim koordinasi teknologi informasi dekat server..."
                          value={modalRationale}
                          onChange={e => setModalRationale(e.target.value)}
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-400 bg-white"
                        />
                        <div className="text-[9px] text-right font-semibold text-gray-400">
                          Karakter: <span className={modalRationale.trim().length >= 10 ? "text-green-600" : "text-rose-500"}>{modalRationale.trim().length}</span> / 10 min
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={modalRationale.trim().length < 10 || modalSubmitLoading}
                        onClick={handleSubmitSeatingRequest}
                        className={`w-full py-2 bg-[#1E3A5F] hover:bg-[#254A7B] text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 ${
                          modalRationale.trim().length >= 10 && !modalSubmitLoading
                            ? "cursor-pointer"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none"
                        }`}
                      >
                        {modalSubmitLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Mengajukan...
                          </>
                        ) : "Kirim Pengajuan Relokasi"}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400 border border-dashed border-gray-150 rounded-xl bg-gray-50/20">
                      <HelpCircle size={22} className="mx-auto mb-2 text-gray-300 animate-bounce" />
                      <span className="text-xs font-bold">Belum Ada Meja Terpilih</span>
                      <p className="text-[10px] text-gray-400 max-w-[150px] mx-auto mt-1 leading-normal">
                        Silakan klik salah satu meja kosong hijau pada denah untuk mengajukan perpindahan.
                      </p>
                    </div>
                  )}

                  {/* Policy rules */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] text-slate-500 space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1">
                      <Info size={11} /> Ketentuan Persetujuan
                    </div>
                    <p className="leading-normal">
                      Setiap permohonan relokasi akan langsung diajukan ke antrean persetujuan Admin Ruangan Kerja terkait. Meja kerja lama Anda akan dibebaskan otomatis ketika permohonan disetujui.
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <h3 className="text-gray-800 font-extrabold text-lg mb-2">Batalkan Reservasi?</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed max-w-[250px]">
                Apakah Anda yakin ingin membatalkan jadwal rapat ini? Slot waktu ruangan akan segera dibebaskan untuk pegawai lain.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setCancelModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Kembali
                </button>
                <button
                  onClick={() => handleCancel(cancelModal)}
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                >
                  {cancelLoading ? (
                    <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Batal...</span>
                  ) : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {attendeesModal && (
        <div className="fixed inset-0 bg-[#0A1428]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#1E3A5F] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserCheck size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Daftar Kehadiran</h3>
                  <p className="text-[10px] text-blue-200">Riwayat presensi dari pemindaian pintu ruangan</p>
                </div>
              </div>
              <button onClick={() => setAttendeesModal(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-200 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 relative">
              {attendeesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Memuat Data Presensi...</span>
                </div>
              ) : attendeesList.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white border border-dashed border-gray-200 rounded-2xl">
                  <UserCheck size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-600">Belum ada peserta hadir</p>
                  <p className="text-xs text-gray-400 mt-1">Gunakan QR Simulator untuk men-scan pintu ruangan.</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-emerald-500/20 before:to-transparent">
                  {attendeesList.map((attendee, index) => {
                    const scannedTime = new Date(attendee.scanned_at);
                    const timeString = scannedTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isFirst = index === 0;

                    return (
                      <div key={attendee.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 group-[.is-active]:bg-emerald-50 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          {isFirst ? <Sparkles size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              {timeString}
                            </span>
                            {isFirst && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 rounded-full">Klaim Ruangan</span>}
                          </div>
                          <span className="text-sm font-bold text-gray-800 line-clamp-1">{attendee.user_name}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">ID: {attendee.user_id.split('-').pop()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 text-center text-[10px] text-gray-400">
              Total peserta tercatat hadir: <strong className="text-gray-700">{attendeesList.length} orang</strong>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
