import { useState, useEffect } from "react";
import { 
  Search, Calendar, MapPin, Clock, AlertTriangle, Video, ExternalLink, 
  Armchair, ArrowRight, CheckCircle2, Sparkles, X, Building, Check, 
  CheckSquare, Info, Map, User, UserCheck, HelpCircle, BarChart2, ShieldAlert,
  QrCode, Camera, ChevronLeft, ChevronRight, XCircle, Copy, Download
} from "lucide-react";
import { bookingService } from "../../services/bookingService";
import { workspaceService, AssignedDesk, PendingRequest, DeskNode } from "../../services/workspaceService";
import { buildingService } from "../../services/index";
import { roomService, Room } from "../../services/roomService";
import { UserStore } from "../../services/apiClient";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';
import { generateAttendancePDF } from "../../utils/pdfExport";

interface MyBookingsProps {
  onNavigate: (page: string, data?: any) => void;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: "bg-blue-50 dark:bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400", label: "Dikonfirmasi" },
  pending: { bg: "bg-amber-50 dark:bg-amber-500/20 dark:bg-amber-500/30 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400", label: "Menunggu Approval" },
  ongoing: { bg: "bg-emerald-50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400", label: "Sedang Berjalan" },
  completed: { bg: "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400", label: "Selesai" },
  cancelled: { bg: "bg-rose-50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400", label: "Dibatalkan" },
  rejected: { bg: "bg-rose-50 dark:bg-rose-500/10 dark:bg-rose-500/20 dark:bg-rose-500/30 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400", label: "Ditolak" },
  CANCELLED_NOSHOW: { bg: "bg-red-100 dark:bg-red-500/20 dark:bg-red-500/30 border border-red-300 dark:border-red-500/30 text-red-800 dark:text-red-400", label: "No-Show (Batal Otomatis)" }
};

const meetingTypeBadge: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  offline: { bg: "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400", label: "Offline", icon: "🏢" },
  online: { bg: "bg-purple-50 dark:bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400", label: "Online", icon: "💻" },
  hybrid: { bg: "bg-teal-50 dark:bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400", label: "Hybrid", icon: "🔄" },
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
  const [resolvedRequest, setResolvedRequest] = useState<(PendingRequest & { rationale?: string }) | null>(null);

  // Relocation Modal States
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [floorsList, setFloorsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  
  const [modalBuilding, setModalBuilding] = useState("");
  const [modalFloor, setModalFloor] = useState("");
  const [modalRoom, setModalRoom] = useState("");
  
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalRoomPhotos, setModalRoomPhotos] = useState<string[]>([]);
  const [modalFacilities, setModalFacilities] = useState<{facility_type: string, quantity: number}[]>([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [modalLayout, setModalLayout] = useState<DeskNode[]>([]);
  const [modalLoadingLayout, setModalLoadingLayout] = useState(false);
  const [modalSelectedDesk, setModalSelectedDesk] = useState<DeskNode | null>(null);
  const [modalRationale, setModalRationale] = useState("");
  const [modalSubmitLoading, setModalSubmitLoading] = useState(false);

  const currentUser = UserStore.get();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [ownRes, guestRes] = await Promise.allSettled([
        bookingService.list({ own_only: "true" }),
        bookingService.getMyAttendances(),
      ]);

      const ownBookings = (ownRes.status === 'fulfilled' && ownRes.value.success) ? ownRes.value.data || [] : [];
      const guestAttended = (guestRes.status === 'fulfilled' && guestRes.value.success) ? guestRes.value.data || [] : [];

      // Merge: guest attendances that aren't already in own bookings
      const ownIds = new Set(ownBookings.map((b: any) => b.id));
      const uniqueGuest = guestAttended.filter((g: any) => !ownIds.has(g.id));
      setBookings([...ownBookings, ...uniqueGuest]);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setBookings([]);
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
          setAssignedDesk(null);
        }
        setPendingRequest(res.data.pending_request);
        setResolvedRequest(res.data.resolved_request || null);
      } else {
        setAssignedDesk(null);
        setPendingRequest(null);
        setResolvedRequest(null);
      }
    } catch (err) {
      console.error("Gagal mengambil data penempatan meja:", err);
      setAssignedDesk(null);
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

  // Bug #3: Refresh every 30s — refetch from API so DB status 'ongoing' propagates after owner checks in
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookings(); // full refetch ensures ongoing status from DB is reflected
    }, 30000);
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
        setModalRoomPhotos(res.room_photos || []);
        setModalFacilities(res.facilities || []);
        setModalPhotoIndex(0);
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

  // Bug #3 fix: For guest attendances, map them to the right category
  const getBookingCategory = (b: any) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Guest attendances that are done go to history
    if (b.is_guest_attendance) {
      const bookingEnd = new Date(`${b.date}T${b.end_time}:00`);
      if (now > bookingEnd) return "past";
      const bookingStart = new Date(`${b.date}T${b.start_time}:00`);
      if (now >= bookingStart && now <= bookingEnd) return "ongoing";
      return "upcoming";
    }

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

  // Bug #3: Get effective display status (time-based for confirmed bookings)
  const getEffectiveStatus = (b: any): string => {
    if (b.is_guest_attendance) return 'completed'; // display as completed for guests
    if (b.status === 'confirmed' && getBookingCategory(b) === 'ongoing') return 'ongoing';
    return b.status;
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

  const handleExportAttendance = () => {
    if (!attendeesList || attendeesList.length === 0) return;
    const selectedBooking = bookings.find(b => b.id === attendeesModal);
    if (!selectedBooking) return;
    
    try {
      generateAttendancePDF(
        selectedBooking.id,
        selectedBooking.room_name || "Ruangan",
        selectedBooking.agenda,
        selectedBooking.date,
        `${selectedBooking.start_time} - ${selectedBooking.end_time}`,
        attendeesList
      );
      toast.success("PDF berhasil diunduh");
    } catch(err) {
      toast.error("Gagal mengunduh PDF");
    }
  };


  // Metrik Statistik
  const totalRapatBulanIni = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length;
  const nextMeeting = bookings.find(b => ["confirmed", "ongoing"].includes(b.status));

  return (
    <div className="p-0 sm:p-6 space-y-3 sm:space-y-6 transition-colors duration-300">
      
      {/* Greetings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 transition-colors dark:border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 transition-colors dark:text-slate-100">
            Selamat Bekerja, {currentUser?.name || "Budi Santoso"} <Sparkles size={16} className="text-amber-500 animate-pulse transition-colors dark:text-amber-400" />
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5 transition-colors dark:text-slate-400">
            Kementerian PPN/Bappenas · Otorita Ibu Kota Nusantara (OIKN)
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2 shadow-sm flex-shrink-0 self-start sm:self-center transition-colors dark:bg-slate-900/80 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm transition-colors dark:bg-indigo-600 dark:border-indigo-500/30">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : "US"}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider transition-colors dark:text-slate-400">Departemen Kerja</span>
            <span className="text-xs font-bold text-slate-700 transition-colors dark:text-slate-200">Divisi Teknologi Informasi IKN</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-2.5 sm:p-4.5 rounded-xl sm:rounded-[1.25rem] shadow-sm flex flex-row items-center gap-2.5 sm:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-emerald-500/30 group dark:bg-slate-900/80 dark:border-indigo-500/30">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-105 transition-transform transition-colors dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/20">
            <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate transition-colors dark:text-slate-500">Total Rapat</span>
            <h4 className="text-xs sm:text-lg font-extrabold text-slate-800 truncate transition-colors dark:text-slate-100">{totalRapatBulanIni} Rapat</h4>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-2.5 sm:p-4.5 rounded-xl sm:rounded-[1.25rem] shadow-sm flex flex-row items-center gap-2.5 sm:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-500/30 group dark:bg-slate-900/80 dark:border-emerald-500/30">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20">
            <Armchair className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate transition-colors dark:text-slate-500">Meja Anda</span>
            <h4 className="text-xs sm:text-lg font-extrabold text-slate-800 truncate transition-colors dark:text-slate-100">{assignedDesk?.desk_id || "Belum Ada"}</h4>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-2.5 sm:p-4.5 rounded-xl sm:rounded-[1.25rem] shadow-sm flex flex-row items-center gap-2.5 sm:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-sky-200 dark:hover:border-sky-500/30 group dark:bg-slate-900/80 dark:border-sky-500/30">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0 group-hover:scale-105 transition-transform transition-colors dark:bg-sky-500/30 dark:text-sky-400 dark:border-sky-500/20">
            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate transition-colors dark:text-slate-500">Agenda Terdekat</span>
            <h4 className="text-xs sm:text-base font-extrabold text-slate-800 truncate transition-colors dark:text-slate-100" title={nextMeeting?.agenda || "Tidak ada rapat terdekat"}>
              {nextMeeting ? `${nextMeeting.start_time} - ${nextMeeting.agenda}` : "Tidak Ada"}
            </h4>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-2.5 sm:p-4.5 rounded-xl sm:rounded-[1.25rem] shadow-sm flex flex-row items-center gap-2.5 sm:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-teal-200 dark:hover:border-teal-500/30 group dark:bg-slate-900/80 dark:border-teal-500/30">
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0 group-hover:scale-105 transition-transform transition-colors dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate transition-colors dark:text-slate-500">Kehadiran</span>
            <h4 className="text-xs sm:text-lg font-extrabold text-slate-800 truncate transition-colors dark:text-slate-100">96.8%</h4>
          </div>
        </div>

      </div>

      {/* Seating Assignment Card Section */}
      <div 
        className="text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-blue-900/30 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] group mt-4 sm:mt-0"
        style={{
          background: assignedDesk?.room_photo 
            ? `linear-gradient(to right, rgba(15,32,66,1) 40%, rgba(30,58,96,0.6) 100%), url(${assignedDesk.room_photo.startsWith('http') ? assignedDesk.room_photo : `http://127.0.0.1:5000${assignedDesk.room_photo}`})`
            : 'linear-gradient(to bottom right, #0F2042, #1E3A60, #254A7B)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center'
        }}
      >
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-400/20 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16 transition-colors duration-300 dark:bg-indigo-500/20" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
          <div className="space-y-2 sm:space-y-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 border border-blue-200 text-blue-700 text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider flex items-center gap-1 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                <Armchair size={10} /> Penempatan Meja Kerja
              </span>
              {pendingRequest && (
                <span className="bg-amber-100 border border-amber-200 text-amber-700 text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 transition-colors dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
                  <AlertTriangle size={10} /> Pengajuan Pindah Pending
                </span>
              )}
            </div>
            
            {seatingLoading ? (
              <div className="space-y-2">
                <div className="h-5 sm:h-6 w-32 sm:w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-3 sm:h-4 w-48 sm:w-64 bg-white/10 rounded animate-pulse" />
              </div>
            ) : assignedDesk ? (
              <div>
                <h3 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  {assignedDesk.building_name}
                </h3>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5 sm:mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-300 flex-shrink-0 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{assignedDesk.floor_name} · {assignedDesk.room_name}</span>
                </p>
                <div className="mt-2 sm:mt-4 flex flex-wrap gap-x-3 gap-y-2 text-[10px] sm:text-xs text-blue-100/80 items-center">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-400 sm:w-3 sm:h-3" /> Alokasi Kerja Dinas</span>
                  <span className="flex items-center gap-1"><Sparkles size={10} className="text-yellow-300 sm:w-3 sm:h-3" /> Fasilitas Premium</span>
                  {!pendingRequest && (
                    <button
                      onClick={() => setIsSeatingModalOpen(true)}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 ml-0 sm:ml-2 mt-1 sm:mt-0 backdrop-blur-sm"
                    >
                      Ganti Tempat Duduk
                      <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              </div>
            ) : pendingRequest ? (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-300">Pengajuan Sedang Diproses</h3>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5 sm:mt-1">
                  Pengajuan penempatan meja Anda di <strong className="text-white">{pendingRequest.room_name}</strong> sedang menanti persetujuan Admin.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Belum Memiliki Tempat Duduk</h3>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5 sm:mt-1">
                  Anda belum terdaftar pada meja kerja manapun di Kawasan Inti IKN. Silakan ajukan penempatan meja.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
            {assignedDesk ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">
                    ID Kursi Anda
                  </span>
                  <span className="text-3xl font-extrabold text-white tracking-wider block filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {assignedDesk.desk_id}
                  </span>
                </div>
                <div className="sm:hidden absolute top-4 right-4 text-right bg-white/10 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                  <span className="text-[8px] text-blue-300 font-bold block uppercase tracking-widest">
                    Meja
                  </span>
                  <span className="text-sm font-black text-white">{assignedDesk.desk_id}</span>
                </div>
              </div>
            ) : (
              !pendingRequest && (
                <button
                  onClick={() => setIsSeatingModalOpen(true)}
                  className="px-4 py-2 sm:px-5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:shadow-xl hover:scale-105 active:scale-95 group/btn dark:bg-blue-500"
                >
                  Ajukan Penempatan Meja
                  <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-1 sm:w-[13px] sm:h-[13px]" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Pending seating request warning alert */}
        {!seatingLoading && pendingRequest && (
          <div className="mt-5 bg-amber-50 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse transition-colors dark:bg-amber-900/20">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={18} />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              Permintaan relokasi Anda ke meja <strong className="text-amber-950 dark:text-white underline">{pendingRequest.desk_id}</strong> di <strong className="text-amber-950 dark:text-white">{pendingRequest.room_name}</strong> diajukan pada {new Date(pendingRequest.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })} sedang dalam antrean peninjauan oleh Admin.
            </div>
          </div>
        )}

        {/* Resolved seating request alert (Approved or Rejected) */}
        {!seatingLoading && resolvedRequest && !pendingRequest && (
          <div className={`mt-5 border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
            resolvedRequest.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-500/30 border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/30 border-red-500/20'
          }`}>
            {resolvedRequest.status === 'APPROVED' ? (
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={18} />
            ) : (
              <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
            )}
            
            <div className={`text-xs flex-1 ${resolvedRequest.status === 'APPROVED' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
              Pengajuan Anda untuk meja kerja <strong className="text-emerald-950 dark:text-white underline">{resolvedRequest.desk_id}</strong> di <strong className="text-emerald-950 dark:text-white">{resolvedRequest.room_name}</strong> telah <strong className={resolvedRequest.status === 'APPROVED' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>{resolvedRequest.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}</strong> oleh Admin.
              
              {resolvedRequest.status === 'REJECTED' && resolvedRequest.rationale && (
                <div className="mt-1 bg-red-100 dark:bg-red-900/30 p-2 rounded-lg border border-red-500/10">
                  <span className="font-bold block text-[10px] text-red-800 dark:text-red-300 mb-0.5 uppercase tracking-wide">Alasan Penolakan:</span>
                  <span className="text-red-900 dark:text-white/90 italic">{resolvedRequest.rationale}</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setResolvedRequest(null)}
              className={`px-3 py-1.5 text-[10px] font-bold border rounded-lg transition-colors ml-auto sm:ml-0 whitespace-nowrap ${
                resolvedRequest.status === 'APPROVED' 
                  ? 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white border-emerald-400/30 hover:bg-emerald-100 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/40' 
                  : 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-white border-red-400/30 hover:bg-red-100 dark:bg-red-500/30 dark:hover:bg-red-500/40'
              }`}
            >
              Tutup Peringatan
            </button>
          </div>
        )}
      </div>

      {/* Booking and Meetings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider transition-colors dark:text-slate-100">Reservasi Rapat & Kolaborasi</h3>
            <p className="text-xs text-slate-500 transition-colors dark:text-slate-400">Jadwal rapat ongoing, upcoming, dan riwayat pemesanan ruangan Anda</p>
          </div>
          
          <div className="relative w-full sm:w-72 flex-shrink-0 group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-emerald-400 transition-colors dark:text-indigo-400" />
            <input
              type="text"
              placeholder="Cari agenda atau ruangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-white/50 backdrop-blur-sm text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-300 font-medium dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 dark:bg-slate-900/80 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 transition-colors dark:bg-slate-800/50 dark:border-slate-800">
            {(["upcoming", "ongoing", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-xs font-bold flex items-center justify-center gap-2 transition-all relative ${
                  activeTab === tab 
                    ? "text-indigo-600 dark:text-emerald-400 bg-indigo-50/50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/80"
                }`}
              >
                {tab === "upcoming" ? "Akan Datang" : tab === "ongoing" ? "Sedang Berjalan" : "Riwayat"}
                <span className={`text-[10px] rounded-full px-2.5 py-0.5 font-extrabold transition-colors ${
                  activeTab === tab 
                    ? "bg-indigo-100 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-indigo-700 dark:text-emerald-300" 
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {tabCount(tab)}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transition-colors dark:bg-emerald-400" />
                )}
              </button>
            ))}
          </div>

          {/* Booking Cards */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 transition-colors">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 space-y-3">
                  <div className="flex gap-2"><Shimmer className="h-5 w-24" /><Shimmer className="h-5 w-16" /></div>
                  <Shimmer className="h-6 w-2/3" />
                  <Shimmer className="h-4 w-1/2" />
                </div>
              ))
            ) : tabBookings.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm transition-colors dark:bg-slate-800/50 dark:border-slate-700">
                  <Calendar size={28} className="text-slate-400 transition-colors dark:text-slate-500" />
                </div>
                <p className="text-slate-700 font-bold text-base mb-1 transition-colors dark:text-slate-200">Tidak ada booking</p>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 transition-colors dark:text-slate-400">
                  {activeTab === "upcoming" ? "Anda belum memiliki reservasi mendatang" :
                   activeTab === "ongoing" ? "Tidak ada booking yang sedang berlangsung" :
                   "Belum ada riwayat booking"}
                </p>
                {activeTab === "upcoming" && (
                  <button onClick={() => onNavigate("rooms")} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 dark:bg-emerald-600">
                    Cari & Booking Ruangan
                  </button>
                )}
              </div>
            ) : (
              tabBookings.map((booking) => {
                const effectiveStatus = getEffectiveStatus(booking);
                const cfg = statusConfig[effectiveStatus] || statusConfig.completed;
                const mtBadge = meetingTypeBadge[booking.meeting_type || "offline"];
                const zoomStatus = getZoomButtonStatus(booking);
                // Bug #2: For hybrid, non-owners must wait for room claim (is_checked_in) before Zoom is active
                const isOwner = booking.booker_id === currentUser?.id || booking.user_id === currentUser?.id;
                const zoomGatedByOwner = (booking.meeting_type === 'hybrid') && !isOwner && !booking.is_checked_in;

                return (
                  <div key={booking.id} className="p-5 md:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`whitespace-nowrap w-max px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                          {booking.is_guest_attendance && (
                            <span className="whitespace-nowrap w-max px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400 flex items-center gap-1">
                              <UserCheck size={10} /> Hadir Sebagai Tamu
                            </span>
                          )}
                          {mtBadge && booking.meeting_type && booking.meeting_type !== "offline" && (

                            <span className={`whitespace-nowrap w-max px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${mtBadge.bg} flex items-center gap-1.5`}>
                              {mtBadge.icon} {mtBadge.label}
                            </span>
                          )}
                          {booking.id.startsWith("mock-") && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                              Simulasi
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-slate-800 text-base font-bold truncate leading-snug transition-colors dark:text-slate-100">{booking.agenda}</h4>
                        
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-1">
                          {booking.room_name && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium transition-colors dark:text-slate-400">
                              <MapPin size={14} className="text-slate-400 flex-shrink-0 transition-colors dark:text-slate-500" />
                              <span className="truncate">{booking.room_name} · {booking.building_name || ""}</span>
                            </div>
                          )}
                          {booking.meeting_type === "online" && !booking.room_name && (
                            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium transition-colors dark:text-emerald-400">
                              <Video size={14} className="flex-shrink-0" />
                              <span>Rapat Online (Zoom)</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium transition-colors dark:text-slate-400">
                            <Calendar size={14} className="text-slate-400 flex-shrink-0 transition-colors dark:text-slate-500" />
                            <span>{booking.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium transition-colors dark:text-slate-400">
                            <Clock size={14} className="text-slate-400 flex-shrink-0 transition-colors dark:text-slate-500" />
                            <span>{booking.start_time} – {booking.end_time}</span>
                          </div>
                        </div>

                        {/* Surat Terkait Display */}
                        {booking.surat_terkait && (
                          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 w-fit transition-colors dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700">
                            <span>📄</span>
                            <span className="font-semibold text-slate-700 transition-colors dark:text-slate-200">Surat Pengantar:</span>
                            <span className="italic opacity-90">{booking.surat_terkait}</span>
                          </div>
                        )}

                        {/* Zoom details */}
                        {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1.5 w-fit min-w-[240px] transition-colors dark:bg-emerald-500/30 dark:border-emerald-500/20">
                            <div className="flex items-center gap-2">
                              <Video size={14} className="text-indigo-600 flex-shrink-0 transition-colors dark:text-emerald-400" />
                              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider transition-colors dark:text-emerald-400">Zoom Meeting Info</span>
                            </div>
                            {booking.zoom_passcode && (
                              <div className="text-xs text-indigo-700 transition-colors dark:text-emerald-300">
                                Passcode: <span className="font-mono bg-indigo-100/60 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest transition-colors dark:bg-emerald-500/30">{booking.zoom_passcode}</span>
                              </div>
                            )}
                            {booking.zoom_host_email && (
                              <div className="text-[11px] text-indigo-500 font-medium mt-1 transition-colors dark:text-emerald-500/80">Host: {booking.zoom_host_email}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center md:items-end justify-between md:flex-col gap-3 flex-shrink-0">
                        {/* Map Location Button */}
                        {booking.building_name && booking.meeting_type !== "online" && (activeTab === "upcoming" || activeTab === "ongoing") && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.building_name + " IKN Nusantara")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 border border-slate-200 group dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                            title={`Lihat rute ke ${booking.building_name}`}
                          >
                            <MapPin size={14} className="text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-emerald-400 transition-colors dark:text-indigo-400" />
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
                            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                              booking.is_checked_in
                                ? "bg-emerald-50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                : "bg-indigo-600 dark:bg-emerald-600 hover:bg-indigo-700 dark:hover:bg-emerald-700 text-white hover:shadow-md hover:-translate-y-0.5"
                            }`}
                            title={booking.is_checked_in ? "Sudah Check-In" : "Scan QR untuk Presensi"}
                          >
                            <QrCode size={14} />
                            <span>{booking.is_checked_in ? "Sudah Check-In" : "Scan QR Presensi"}</span>
                          </button>
                        )}

                        {/* Attendees List Button — visible only when ongoing or past */}
                        {activeTab !== "upcoming" && (
                          <button
                            onClick={() => handleOpenAttendees(booking.id)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 border border-slate-200 group dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                            title="Lihat Daftar Hadir"
                          >
                            <UserCheck size={14} className="text-emerald-500 group-hover:scale-110 transition-transform transition-colors dark:text-emerald-400" />
                            <span>Presensi</span>
                          </button>
                        )}

                        {/* Attendance Link Copy Button (Only for Online/Hybrid) */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/presensi/${booking.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Link presensi berhasil disalin!");
                              }}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              title="Salin Link Presensi Publik"
                            >
                              <Copy size={14} />
                              <span>Salin Link Presensi</span>
                            </button>
                          )}
                          
                          {/* Bug #2: Zoom Link — hybrid non-owners wait for room claim by the booker first */}
                          {booking.zoom_join_url && (booking.meeting_type === "online" || booking.meeting_type === "hybrid") && (
                            zoomGatedByOwner ? (
                              <div
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 cursor-not-allowed"
                                title="Menunggu pembuat booking membuka ruangan (check-in QR) terlebih dahulu"
                              >
                                <Video size={14} />
                                <span>Menunggu Host Buka Ruangan</span>
                              </div>
                            ) : (
                              <a
                                href={zoomStatus.enabled ? booking.zoom_join_url : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { 
                                  if (!zoomStatus.enabled) e.preventDefault(); 
                                  else {
                                    bookingService.logZoomJoin(booking.id).catch(() => {});
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                  zoomStatus.enabled
                                    ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                }`}
                                title={zoomStatus.label}
                              >
                                <Video size={14} />
                                <span>{zoomStatus.label}</span>
                                {zoomStatus.enabled && <ExternalLink size={12} />}
                              </a>
                            )
                          )}
                        </div>

                        {activeTab === "upcoming" && (
                          <button
                            onClick={() => setCancelModal(booking.id)}
                            className="px-4 py-2.5 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 dark:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30"
                          >
                            Batalkan Rapat
                          </button>
                        )}
                        {booking.status === "ongoing" && booking.user_id === UserStore.get()?.id && (
                          <button
                            onClick={async () => {
                              if(window.confirm('Apakah Anda yakin ingin mengakhiri rapat ini sekarang? Ruangan akan segera dikosongkan.')) {
                                try {
                                  await bookingService.endBooking(booking.id);
                                  toast.success("Rapat berhasil diakhiri");
                                  fetchBookings();
                                } catch (e: any) {
                                  toast.error(e.response?.data?.message || "Gagal mengakhiri rapat");
                                }
                              }
                            }}
                            className="px-4 py-2.5 text-xs border border-amber-400 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                          >
                            Akhiri Rapat
                          </button>
                        )}
                        {booking.status === "completed" && (
                          <button
                            onClick={async () => {
                              try {
                                toast.info("Mengambil data presensi...");
                                const res = await bookingService.getAttendees(booking.id);
                                const attendees = res.data || [];
                                if (attendees.length === 0) {
                                  toast.error("Tidak ada data presensi untuk rapat ini.");
                                  return;
                                }
                                generateAttendancePDF(
                                  booking.id, 
                                  booking.room_name || "Ruangan", 
                                  booking.agenda, 
                                  booking.date, 
                                  `${booking.start_time} - ${booking.end_time}`, 
                                  attendees
                                );
                                toast.success("PDF berhasil diunduh");
                              } catch (e: any) {
                                toast.error("Gagal mengunduh PDF");
                              }
                            }}
                            className="px-4 py-2.5 text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 dark:bg-indigo-500/30 dark:text-indigo-400 dark:border-indigo-500/30 flex items-center gap-1.5"
                          >
                            <Download size={14} /> Cetak PDF Presensi
                          </button>
                        )}
                      </div>

                    </div>

                    {booking.rejection_reason && (
                      <div className="mt-4 p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-start gap-2.5 transition-colors dark:bg-rose-500/30 dark:border-rose-500/20">
                        <AlertTriangle className="text-rose-500 mt-0.5 flex-shrink-0 transition-colors dark:text-rose-400" size={16} />
                        <p className="text-sm text-rose-700 leading-relaxed font-medium transition-colors dark:text-rose-300">
                          <span className="font-bold block text-[10px] uppercase tracking-wider text-rose-500 mb-0.5 transition-colors duration-300 dark:text-rose-400">Alasan penolakan admin:</span>
                          {booking.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    {booking.cancel_reason && booking.status === "cancelled" && (
                      <div className="mt-4 p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-start gap-2.5 transition-colors dark:bg-rose-500/30 dark:border-rose-500/20">
                        <AlertTriangle className="text-rose-500 mt-0.5 flex-shrink-0 transition-colors dark:text-rose-400" size={16} />
                        <p className="text-sm text-rose-700 leading-relaxed font-medium transition-colors dark:text-rose-300">
                          <span className="font-bold block text-[10px] uppercase tracking-wider text-rose-500 mb-0.5 transition-colors duration-300 dark:text-rose-400">Alasan Pembatalan:</span>
                          {booking.cancel_reason}
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
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0 transition-colors dark:bg-slate-900 dark:border-slate-800">
              <div>
                <h3 className="text-slate-800 font-extrabold text-lg flex items-center gap-2 transition-colors dark:text-slate-100">
                  <Armchair className="text-indigo-600 transition-colors dark:text-emerald-400" size={20} /> Ganti Penempatan Tempat Duduk
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 transition-colors dark:text-slate-400">
                  Ajukan perpindahan meja kerja dinas Anda di Kawasan Inti IKN secara online
                </p>
              </div>
              <button
                onClick={() => { setIsSeatingModalOpen(false); setModalSelectedDesk(null); }}
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all dark:bg-slate-800 dark:text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white transition-colors dark:bg-slate-900">
              
              {/* Filter Area Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-150 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50">
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-bold mb-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors dark:text-slate-400">
                    <Building size={12} /> Gedung
                  </label>
                  <select
                    value={modalBuilding}
                    onChange={e => setModalBuilding(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400 dark:focus:border-emerald-500 bg-white text-slate-800 font-bold transition-all shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                  >
                    <option value="" disabled>Pilih Gedung</option>
                    {buildingsList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-bold mb-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors dark:text-slate-400">
                    <MapPin size={12} /> Lantai
                  </label>
                  <select
                    value={modalFloor}
                    onChange={e => setModalFloor(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400 dark:focus:border-emerald-500 bg-white text-slate-800 font-bold transition-all shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    disabled={floorsList.length === 0}
                  >
                    {floorsList.length === 0 && <option value="">Tidak ada lantai</option>}
                    {floorsList.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-bold mb-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors dark:text-slate-400">
                    <UserCheck size={12} /> Ruang Kerja
                  </label>
                  <select
                    value={modalRoom}
                    onChange={e => setModalRoom(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400 dark:focus:border-emerald-500 bg-white text-slate-800 font-bold transition-all shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
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
                <div className="lg:col-span-3 border border-slate-200 rounded-[1.25rem] p-5 bg-slate-50/50 flex flex-col min-h-[300px] transition-colors dark:bg-slate-800/20 dark:border-slate-800">
                  
                  {modalRoomPhotos.length > 0 && (
                    <div className="w-full h-48 mb-5 rounded-xl overflow-hidden relative border border-slate-200 group shadow-sm transition-colors dark:border-slate-700">
                      <img 
                        src={modalRoomPhotos[modalPhotoIndex].startsWith('http') ? modalRoomPhotos[modalPhotoIndex] : `http://127.0.0.1:5000${modalRoomPhotos[modalPhotoIndex]}`} 
                        alt={`${modalRoomName} - Foto ${modalPhotoIndex + 1}`} 
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-4">
                        <span className="text-white text-xs font-bold flex items-center gap-2"><Camera size={16}/> Foto Ruangan ({modalPhotoIndex + 1}/{modalRoomPhotos.length})</span>
                      </div>
                      
                      {modalRoomPhotos.length > 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.preventDefault(); setModalPhotoIndex(prev => prev === 0 ? modalRoomPhotos.length - 1 : prev - 1); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all duration-300 border border-white/10"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); setModalPhotoIndex(prev => prev === modalRoomPhotos.length - 1 ? 0 : prev + 1); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all duration-300 border border-white/10"
                          >
                            <ChevronRight size={18} />
                          </button>
                          
                          {/* Indicators */}
                          <div className="absolute bottom-4 right-4 flex gap-1.5">
                            {modalRoomPhotos.map((_, idx) => (
                              <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === modalPhotoIndex ? 'bg-white dark:bg-slate-900 scale-125' : 'bg-white/40'}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {modalFacilities.length > 0 && (
                    <div className="mb-5 flex flex-wrap gap-2.5">
                      {modalFacilities.map((f, idx) => (
                        <div key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-sm transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          <Sparkles size={12} className="text-indigo-500 transition-colors dark:text-emerald-400"/>
                          {f.facility_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md ml-1 transition-colors dark:bg-slate-700 dark:text-slate-400">{f.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5 transition-colors dark:border-slate-700">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100">{modalRoomName || "Visual Floor Plan"}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 transition-colors dark:text-slate-400">Klik meja hijau kosong untuk memilih</p>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider transition-colors dark:text-slate-300">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full transition-colors duration-300 dark:bg-emerald-600" /> <span>Kosong</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full transition-colors dark:bg-slate-9500" /> <span>Terisi</span></div>
                    </div>
                  </div>

                  {modalLoadingLayout ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin transition-colors dark:border-emerald-500" />
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider transition-colors dark:text-slate-400">Memuat denah...</span>
                    </div>
                  ) : modalLayout.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 transition-colors dark:text-slate-600">
                      <Building size={32} className="mb-3 text-slate-300 transition-colors dark:text-slate-200" />
                      <span className="text-sm font-bold">Tidak Ada Workspace Terpilih</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="grid grid-cols-5 md:grid-cols-6 gap-3 w-full p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-colors dark:bg-slate-900 dark:border-slate-700">
                        {modalLayout.map(desk => {
                          const isSelected = modalSelectedDesk?.desk_id === desk.desk_id;
                          let bgColor = "bg-emerald-50 dark:bg-emerald-500/10 dark:bg-emerald-500/20 dark:bg-emerald-500/30 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30";
                          if (desk.status === "OCCUPIED") {
                            bgColor = "bg-indigo-50 dark:bg-slate-800 text-indigo-400 dark:text-slate-500 border-indigo-200 dark:border-slate-700 cursor-not-allowed opacity-75";
                          } else if (desk.status === "DISABLED") {
                            bgColor = "bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50";
                          }
                          
                          if (isSelected) {
                            bgColor = "bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500 shadow-md shadow-emerald-500/20 ring-4 ring-emerald-500/20 scale-105 z-10";
                          }

                          return (
                            <div
                              key={desk.desk_id}
                              onClick={() => desk.status === "VACANT" && handleModalDeskClick(desk)}
                              className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative group ${bgColor}`}
                            >
                              <span className="text-[10px] font-extrabold">{desk.desk_id}</span>
                              {desk.status === "OCCUPIED" && (
                                <div className="opacity-0 group-hover:opacity-100 absolute z-30 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2.5 py-1 rounded-md shadow-lg pointer-events-none transition-opacity font-bold whitespace-nowrap dark:bg-slate-100 dark:text-slate-900">
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
                <div className="lg:col-span-2 border border-slate-200 rounded-[1.25rem] p-5 bg-white space-y-5 shadow-sm transition-colors dark:bg-slate-900 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 transition-colors dark:text-slate-100 dark:border-slate-800">
                    Konfirmasi Relokasi
                  </h4>
                  
                  {modalSelectedDesk ? (
                    <div className="space-y-5">
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2.5 transition-colors dark:bg-emerald-500/30 dark:border-emerald-500/20">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-wider transition-colors dark:text-slate-400">ID Meja Baru:</span>
                          <span className="font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-md text-[11px] transition-colors dark:bg-emerald-500/30 dark:text-emerald-300">
                            {modalSelectedDesk.desk_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-1.5 font-medium transition-colors dark:text-slate-300">
                          <p><strong className="text-slate-700 transition-colors dark:text-slate-200">Gedung:</strong> {buildingsList.find(b => b.id === modalBuilding)?.name}</p>
                          <p><strong className="text-slate-700 transition-colors dark:text-slate-200">Lantai:</strong> {floorsList.find(f => f.id === modalFloor)?.name}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider transition-colors dark:text-slate-400">
                          Alasan Pemindahan <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span>
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Contoh: Kebutuhan tim koordinasi teknologi informasi dekat server..."
                          value={modalRationale}
                          onChange={e => setModalRationale(e.target.value)}
                          className="w-full p-3.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400 dark:focus:border-emerald-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-emerald-500/10 bg-slate-50/50 text-slate-800 transition-all duration-300 dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700"
                        />
                        <div className="text-[10px] text-right font-bold text-slate-400 transition-colors dark:text-slate-500">
                          Karakter: <span className={modalRationale.trim().length >= 10 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>{modalRationale.trim().length}</span> / 10 min
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={modalRationale.trim().length < 10 || modalSubmitLoading}
                        onClick={handleSubmitSeatingRequest}
                        className={`w-full py-3 bg-indigo-600 dark:bg-emerald-600 hover:bg-indigo-700 dark:hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow flex items-center justify-center gap-2 ${
                          modalRationale.trim().length >= 10 && !modalSubmitLoading
                            ? "cursor-pointer hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none"
                        }`}
                      >
                        {modalSubmitLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mengajukan...
                          </>
                        ) : "Kirim Pengajuan Relokasi"}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 transition-colors dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-700">
                      <HelpCircle size={28} className="mx-auto mb-3 text-slate-300 animate-bounce transition-colors dark:text-slate-600" />
                      <span className="text-sm font-bold text-slate-600 transition-colors dark:text-slate-400">Belum Ada Meja Terpilih</span>
                      <p className="text-xs text-slate-500 max-w-[180px] mx-auto mt-2 leading-relaxed transition-colors dark:text-slate-500">
                        Silakan klik salah satu meja kosong hijau pada denah untuk mengajukan perpindahan.
                      </p>
                    </div>
                  )}

                  {/* Policy rules */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-700 space-y-2 transition-colors dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 transition-colors dark:text-amber-400">
                      <Info size={14} /> Ketentuan Persetujuan
                    </div>
                    <p className="leading-relaxed">
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mb-5 shadow-sm transition-colors dark:bg-rose-500/30 dark:border-rose-500/20">
                <AlertTriangle size={28} className="text-rose-600 transition-colors dark:text-rose-400" />
              </div>
              <h3 className="text-slate-800 font-extrabold text-xl mb-3 transition-colors dark:text-slate-100">Batalkan Reservasi?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-[250px] transition-colors dark:text-slate-400">
                Apakah Anda yakin ingin membatalkan jadwal rapat ini? Slot waktu ruangan akan segera dibebaskan untuk pegawai lain.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => handleCancel(cancelModal)}
                  disabled={cancelLoading}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/30 hover:-translate-y-0.5"
                >
                  {cancelLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Batal...</>
                  ) : "Ya, Batalkan Reservasi"}
                </button>
                <button
                  onClick={() => setCancelModal(null)}
                  className="w-full py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {attendeesModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="px-6 py-5 bg-indigo-600 text-white flex items-center justify-between border-b border-indigo-700 transition-colors dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner transition-colors dark:bg-emerald-500/30 dark:border-emerald-500/20">
                  <UserCheck size={22} className="text-white transition-colors dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Daftar Kehadiran</h3>
                  <p className="text-xs text-indigo-100 font-medium mt-0.5 transition-colors dark:text-slate-400">Riwayat presensi peserta rapat</p>
                </div>
              </div>
              <button onClick={() => setAttendeesModal(null)} className="w-10 h-10 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors text-indigo-100 hover:text-white dark:text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4 relative transition-colors dark:bg-slate-900">
              {attendeesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin transition-colors dark:border-emerald-500" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider transition-colors dark:text-slate-400">Memuat Data Presensi...</span>
                </div>
              ) : attendeesList.length === 0 ? (
                <div className="text-center py-12 px-6 bg-white border border-dashed border-slate-200 rounded-2xl transition-colors dark:bg-slate-800/50 dark:border-slate-700">
                  <UserCheck size={36} className="mx-auto text-slate-300 mb-4 transition-colors dark:text-slate-600" />
                  <p className="text-base font-bold text-slate-600 mb-1 transition-colors dark:text-slate-300">Belum ada peserta hadir</p>
                  <p className="text-xs text-slate-400 leading-relaxed transition-colors dark:text-slate-500">Gunakan fitur Scan QR untuk melakukan presensi kehadiran rapat.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-indigo-500/20 dark:before:via-emerald-500/20 before:to-transparent transition-colors">
                  {attendeesList.map((attendee, index) => {
                    const scannedTime = new Date(attendee.scanned_at);
                    const timeString = scannedTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isFirst = index === 0;

                    return (
                      <div key={attendee.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors ${
                          isFirst ? "bg-amber-50 dark:bg-amber-50 dark:bg-amber-900/20/20 border-amber-200 dark:border-amber-500/30 text-amber-500 dark:text-amber-400" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-500 dark:text-emerald-400"
                        }`}>
                          {isFirst ? <Sparkles size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col transition-colors group-hover:shadow-md group-hover:border-indigo-200 dark:group-hover:border-emerald-500/30 dark:bg-slate-800 dark:border-indigo-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20">
                              {timeString}
                            </span>
                            {isFirst && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider transition-colors dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/20">Hadir Pertama</span>}
                          </div>
                          <span className="text-sm font-bold text-slate-800 line-clamp-1 transition-colors dark:text-slate-100">{attendee.user_name}</span>
                          {attendee.user_id && <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide font-medium transition-colors dark:text-slate-400">ID: {attendee.user_id.split('-').pop()}</span>}
                          {(!attendee.user_id && (attendee.institution || attendee.position || attendee.email)) && (
                            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-700/50">
                              {attendee.institution && <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Instansi:</strong> {attendee.institution}</p>}
                              {attendee.position && <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Jabatan:</strong> {attendee.position}</p>}
                              {attendee.email && <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Email:</strong> {attendee.email}</p>}
                              {attendee.signature && (
                                <div className="mt-1.5">
                                  <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tanda Tangan:</p>
                                  <img src={attendee.signature} alt="Tanda Tangan" className="h-10 object-contain bg-slate-50 rounded border border-slate-200/50 p-1 dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                              )}
                            </div>
                          )}
                          {attendee.attendance_type && (
                            <span className="text-[10px] text-slate-500 mt-2 inline-flex uppercase tracking-wide font-medium">Tipe: <strong className="ml-1 text-slate-700 dark:text-slate-300">{attendee.attendance_type}</strong></span>
                          )}
                          {attendee.logs && attendee.logs.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Log Aktivitas Zoom:</span>
                              {attendee.logs.map((log: any, i: number) => (
                                <div key={i} className="text-[10px] text-indigo-500 font-medium">
                                  {log.action === 'zoom_join' ? 'Masuk Rapat' : log.action} - {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-5 bg-white border-t border-slate-200 flex items-center justify-between text-xs transition-colors dark:bg-slate-900 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400">
                Total hadir: <strong className="text-slate-800 font-bold transition-colors dark:text-slate-100">{attendeesList.length} orang</strong>
              </div>
              
              {attendeesList.length > 0 && bookings.find(b => b.id === attendeesModal)?.status === 'completed' && (
                <button
                  onClick={handleExportAttendance}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
