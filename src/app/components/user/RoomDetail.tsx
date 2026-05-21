import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Users, Clock, Monitor, Wifi, Volume2, Zap, Calendar, RefreshCw } from "lucide-react";
import { roomService, Room } from "../../services/roomService";
import { bookingService, Booking } from "../../services/bookingService";
import { TokenStore } from "../../services/apiClient";
import { toast } from "sonner";

const getImageUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `http://localhost:5000${url.startsWith('/') ? url : '/' + url}`;
};

interface RoomDetailProps {
  roomId: string;
  onNavigate: (page: string, data?: any) => void;
  userRole: string;
  userId?: string;
}

export function RoomDetail({ roomId, onNavigate, userRole }: RoomDetailProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "schedule" | "history">("info");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; date: string; endTime?: string } | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Drag states
  const [dragStart, setDragStart] = useState<{ date: string; time: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: string; time: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getWeekDays = (offset = 0) => {
    const days = [];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum"];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      days.push({ label: dayNames[i], date: String(d.getDate()).padStart(2, "0"), full: iso });
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekOffset);

  const fetchAvailability = async () => {
    try {
      const avail = await roomService.availability(roomId, weekDays[0].full, weekDays[4].full);
      setAvailability(avail.data?.availability || []);
    } catch (e) {
      console.error("Gagal memuat ketersediaan:", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [roomData, bkData] = await Promise.all([
          roomService.get(roomId),
          bookingService.list({ room_id: roomId, limit: 50 }),
        ]);
        setRoom(roomData.data || null);
        setBookings(bkData.data || []);
        // fetch availability for this week
        const avail = await roomService.availability(roomId, weekDays[0].full, weekDays[4].full);
        setAvailability(avail.data?.availability || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    fetchAvailability();
  }, [currentWeekOffset]);

  const isBooked = (date: string, time: string) => {
    const day = availability.find(d => d.date === date);
    if (!day) return false;
    if (day.isBlackout) return true; // Blackout slots cannot be booked
    return day.bookings?.some((b: any) => {
      const slotMins = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
      const startMins = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]);
      const endMins = parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1]);
      return slotMins >= startMins && slotMins < endMins;
    }) || false;
  };

  const getBookingForSlot = (date: string, time: string) => {
    const day = availability.find(d => d.date === date);
    if (!day) return null;
    return day.bookings?.find((b: any) => {
      const slotMins = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
      const startMins = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]);
      const endMins = parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1]);
      return slotMins >= startMins && slotMins < endMins;
    }) || null;
  };

  const isBlackoutDate = (date: string) => {
    const day = availability.find(d => d.date === date);
    return day?.isBlackout || false;
  };

  const timeSlots = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

  const isSlotInDragRange = (date: string, time: string) => {
    if (!isDragging || !dragStart || !dragEnd || date !== dragStart.date) return false;
    const startIndex = timeSlots.indexOf(dragStart.time);
    const endIndex = timeSlots.indexOf(dragEnd.time);
    const currIndex = timeSlots.indexOf(time);
    if (startIndex === -1 || endIndex === -1 || currIndex === -1) return false;
    return currIndex >= Math.min(startIndex, endIndex) && currIndex <= Math.max(startIndex, endIndex);
  };

  const getDragLabel = (date: string, time: string) => {
    if (!isDragging || !dragStart || !dragEnd || date !== dragStart.date) return "+ Booking";
    const startIndex = timeSlots.indexOf(dragStart.time);
    const endIndex = timeSlots.indexOf(dragEnd.time);
    const currIndex = timeSlots.indexOf(time);
    if (startIndex === -1 || endIndex === -1 || currIndex === -1) return "+ Booking";

    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);

    if (currIndex < minIdx || currIndex > maxIdx) return "+ Booking";

    if (minIdx === maxIdx) return "30 Mins";
    if (currIndex === minIdx) return `Mulai (${timeSlots[minIdx]})`;
    if (currIndex === maxIdx) {
      const timeOptions = [
        "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
        "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
        "17:00","17:30","18:00"
      ];
      const endVal = timeOptions[maxIdx + 1] || "17:30";
      return `Selesai (${endVal})`;
    }
    return "·";
  };

  const handleDragEnd = () => {
    if (!isDragging || !dragStart || !dragEnd) return;
    setIsDragging(false);

    const startIndex = timeSlots.indexOf(dragStart.time);
    const endIndex = timeSlots.indexOf(dragEnd.time);
    if (startIndex === -1 || endIndex === -1) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);
    const selectedTimes = timeSlots.slice(minIdx, maxIdx + 1);

    // Validate conflicts
    const hasConflict = selectedTimes.some(t => isBooked(dragStart.date, t));
    if (hasConflict) {
      toast.error("Rentang waktu yang dipilih berbenturan dengan booking yang sudah ada!");
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startTime = selectedTimes[0];
    const timeOptions = [
      "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
      "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
      "17:00","17:30","18:00"
    ];
    const startIdxInOptions = timeOptions.indexOf(startTime);
    const selectedLen = selectedTimes.length;
    const endTime = timeOptions[startIdxInOptions + selectedLen] || "17:30";

    setSelectedSlot({ date: dragStart.date, time: startTime, endTime });
    setShowBookingModal(true);
    fetchAvailability(); // Double check current availability

    setDragStart(null);
    setDragEnd(null);
  };

  const facilityIcons: Record<string, any> = {
    tv: { icon: <Monitor size={16} />, label: "TV Monitor" },
    projector: { icon: <Monitor size={16} />, label: "Proyektor" },
    videoConference: { icon: <Wifi size={16} />, label: "Video Conference" },
    soundSystem: { icon: <Volume2 size={16} />, label: "Sound System" },
    whiteboard: { icon: <Monitor size={16} />, label: "Whiteboard" },
    outlet: { icon: <Zap size={16} />, label: "Stop Kontak" },
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    ongoing: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-gray-100 text-gray-600",
    rejected: "bg-red-100 text-red-700",
  };

  const statusLabel: Record<string, string> = {
    confirmed: "Dikonfirmasi", pending: "Menunggu", ongoing: "Berlangsung",
    cancelled: "Dibatalkan", completed: "Selesai", rejected: "Ditolak",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
        <p className="text-gray-500">Ruangan tidak ditemukan.</p>
        <button onClick={() => onNavigate("rooms")} className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm">
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  let photos = room.photos || [];
  if (photos.length === 0 && room.image_url) {
    photos = [{ url: room.image_url, id: 'primary' }];
  }
  
  const heroImage = getImageUrl(room.image_url);
  const layouts = room.layouts || [];
  const facilities = room.facilities || {};

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Hero */}
      <div className="relative h-32 bg-gray-200 flex-shrink-0">
        {heroImage
          ? <img src={heroImage} alt={room.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-[#1E3A5F] to-[#0F2144]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={() => onNavigate("rooms")}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-700 rounded-lg p-2 flex items-center gap-1.5 text-sm shadow">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{room.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <MapPin size={14} className="text-white/80" />
            <span className="text-white/90 text-sm">{room.room_type === 'digital' ? "Virtual Rapat · Zoom" : room.room_type === 'hybrid' ? `Hybrid · ${room.floor_name} · ${room.building_name}` : `${room.floor_name} · ${room.building_name}`}</span>
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${room.status === "active" ? "bg-green-500/90 text-white" : "bg-gray-500/90 text-white"}`} style={{ fontWeight: 500 }}>
              {room.status === "active" ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-1 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-shrink-0 items-center">
        {[
          { icon: <Users size={18} className="text-blue-500" />, label: "Kapasitas", value: room.room_type === 'digital' ? "s.d. 100 orang" : layouts.length > 0 ? `s.d. ${Math.max(...layouts.map((l: any) => l.capacity || 0))} orang` : "–" },
          { icon: <Clock size={18} className="text-purple-500" />, label: "Operasional", value: room.operational_start ? `${room.operational_start} – ${room.operational_end}` : "24 Jam" },
          { icon: <Calendar size={18} className="text-green-500" />, label: "Sistem Booking", value: room.approval_type === "instant" ? "Instan" : "Perlu Approval" },
          { icon: <Monitor size={18} className="text-orange-500" />, label: room.room_type === 'digital' ? "Platform" : room.room_type === 'hybrid' ? "Mode" : "Layout", value: room.room_type === 'digital' ? "Zoom Premium" : room.room_type === 'hybrid' ? "Fisik + Zoom" : `${layouts.length} tipe` },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">{s.icon}</div>
            <div>
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-6 flex-shrink-0">
        {(["info", "schedule", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-3.5 text-sm border-b-2 transition-all ${activeTab === tab ? "border-[#1E3A5F] text-[#1E3A5F]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            style={{ fontWeight: activeTab === tab ? 600 : 400 }}>
            {tab === "info" ? "Informasi Ruangan" : tab === "schedule" ? "Jadwal Mingguan" : "Riwayat Booking"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === "info" && (
          <div className="p-6 space-y-6">
            
            {/* Carousel Galeri Foto */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Galeri Foto Ruangan</h3>
              {photos.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {photos.map((p: any, i: number) => (
                    <div key={p.id || i} 
                         className="w-64 h-40 sm:w-72 sm:h-48 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 snap-center relative group cursor-pointer"
                         onClick={() => setSelectedPhoto(p.url)}>
                      <img src={getImageUrl(p.url)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : room.room_type === 'hybrid' ? (
                <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-left">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-sm border border-teal-200">
                    Hybrid
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-teal-950">Ruangan Hybrid (Fisik + Zoom)</h4>
                    <p className="text-xs text-teal-700 mt-1 leading-relaxed">
                      Ruangan fisik yang dilengkapi integrasi Zoom Premium. Saat Anda memesan, ruangan fisik akan diamankan dan tautan Zoom akan dibuat secara otomatis.
                    </p>
                  </div>
                </div>
              ) : room.room_type === 'digital' ? (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-left">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 text-purple-600 font-bold text-sm border border-purple-100">
                    Zoom
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-purple-950">Ruangan Rapat Digital Premium</h4>
                    <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                      Ruangan rapat virtual didukung oleh lisensi Zoom Premium. Seluruh tautan rapat dibuat secara unik, aman dengan passcode, dan mendukung kualitas audio-video definisi tinggi (HD).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Belum ada foto galeri</p>
                  <p className="text-xs text-gray-400 mt-1">Admin belum mengunggah foto tambahan untuk ruangan ini.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {room.description && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
                  <h3 className="text-gray-700 mb-2" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Deskripsi</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{room.description}</p>
                </div>
              )}
              {room.room_type === 'hybrid' ? (
                <>
                  {layouts.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
                      <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Layout & Kapasitas (Fisik)</h3>
                      <div className="space-y-2">
                        {layouts.map((l: any) => (
                          <div key={l.id || l.layout_type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <span className="text-sm text-gray-600">{l.layout_type}</span>
                            <span className="text-sm" style={{ fontWeight: 500 }}>{l.capacity} orang</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-xl border border-teal-200 p-5 flex-1">
                    <h3 className="text-teal-800 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Integrasi Zoom Premium</h3>
                    <div className="space-y-2">
                      {[
                        { label: "Kapasitas Virtual", val: "s.d. 100 Partisipan" },
                        { label: "Batas Durasi", val: "Tanpa Batas (Unlimited)" },
                        { label: "Link Zoom", val: "Otomatis saat booking" },
                        { label: "Fitur", val: "Breakout Rooms, Screen Share, Recording" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-teal-50 last:border-0">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className="text-sm text-teal-700" style={{ fontWeight: 600 }}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : room.room_type === 'digital' ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
                  <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Spesifikasi Virtual</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Kapasitas Rapat", val: "Maksimal 100 Partisipan" },
                      { label: "Batas Durasi", val: "Tanpa Batas (Unlimited)" },
                      { label: "Metode Enkripsi", val: "AES-256 GCM" },
                      { label: "Fitur Rapat", val: "Breakout Rooms, Screen Share, Cloud Recording" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className="text-sm text-[#1E3A5F]" style={{ fontWeight: 600 }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                layouts.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
                    <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Layout & Kapasitas</h3>
                    <div className="space-y-2">
                      {layouts.map((l: any) => (
                        <div key={l.id || l.layout_type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-600">{l.layout_type}</span>
                          <span className="text-sm" style={{ fontWeight: 500 }}>{l.capacity} orang</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
            {room.room_type !== 'digital' && Object.keys(facilities).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Fasilitas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(facilities).filter(([, v]) => (v as number) > 0).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
                        {facilityIcons[key]?.icon || <Monitor size={16} />}
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{facilityIcons[key]?.label || key}</div>
                        <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{String(val)} unit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="p-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Jadwal Mingguan</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tarik/drag rentang waktu kosong untuk membooking</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentWeekOffset(o => o - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">‹</button>
                  <button onClick={() => setCurrentWeekOffset(0)} className="px-2 py-1 text-xs bg-gray-100 rounded-lg text-gray-600">Minggu Ini</button>
                  <button onClick={() => setCurrentWeekOffset(o => o + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">›</button>
                </div>
              </div>
              <div 
                className="overflow-auto select-none"
                onMouseUp={handleDragEnd}
                onMouseLeave={() => { if (isDragging) setIsDragging(false); }}
              >
                <div style={{ minWidth: "600px" }}>
                  <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
                    <div className="p-3" />
                    {weekDays.map(d => (
                      <div key={d.full} className="p-3 text-center border-l border-gray-100">
                        <div className="text-xs text-gray-400" style={{ fontWeight: 500 }}>{d.label}</div>
                        <div className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{d.date}</div>
                      </div>
                    ))}
                  </div>
                  {timeSlots.map(time => (
                    <div key={time} className="grid border-b border-gray-50" style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
                      <div className="px-3 py-2 text-xs text-gray-400 text-right" style={{ fontWeight: 500 }}>{time}</div>
                      {weekDays.map(d => {
                        const booked = isBooked(d.full, time);
                        const isInDrag = isSlotInDragRange(d.full, time);
                        const dragLabel = getDragLabel(d.full, time);
                        return (
                          <div
                            key={d.full}
                            className="border-l border-gray-100 h-10 relative"
                            onMouseDown={(e) => {
                              if (!booked) {
                                e.preventDefault(); // Prevent text/ghost dragging in browser
                                setIsDragging(true);
                                setDragStart({ date: d.full, time });
                                setDragEnd({ date: d.full, time });
                              }
                            }}
                            onMouseEnter={() => {
                              if (isDragging && dragStart && dragStart.date === d.full) {
                                // Concurrency overlap prevention: restrict dragging beyond booked slots
                                const startIdx = timeSlots.indexOf(dragStart.time);
                                const currIdx = timeSlots.indexOf(time);
                                const minIdx = Math.min(startIdx, currIdx);
                                const maxIdx = Math.max(startIdx, currIdx);
                                const pathTimes = timeSlots.slice(minIdx, maxIdx + 1);
                                const pathHasConflict = pathTimes.some(t => isBooked(d.full, t));
                                if (!pathHasConflict) {
                                  setDragEnd({ date: d.full, time });
                                }
                              }
                            }}
                          >
                            {booked ? (
                              isBlackoutDate(d.full) ? (
                                <div className="absolute inset-0.5 rounded bg-gray-100 border border-gray-200 text-gray-400 text-[10px] font-medium flex items-center justify-center shadow-sm select-none">Libur/Tutup</div>
                              ) : (() => {
                                const booking = getBookingForSlot(d.full, time);
                                return (
                                  <div
                                    className={`absolute inset-0.5 rounded flex items-center justify-center overflow-hidden border shadow-sm select-none ${
                                      booking?.status === "pending"
                                        ? "bg-amber-500 border-amber-600 text-white"
                                        : booking?.status === "ongoing"
                                        ? "bg-emerald-600 border-emerald-700 text-white"
                                        : "bg-[#1E3A5F] border-[#132742] text-white"
                                    }`}
                                    title={booking ? `${booking.agenda} (${booking.userName || "Pemesan"}) - ${booking.status === "pending" ? "Menunggu Persetujuan" : "Disetujui"}` : "Terbooking"}
                                  >
                                    {booking && time === booking.startTime && (
                                      <span className="text-white truncate px-1 text-center font-bold" style={{ fontSize: "9px", fontWeight: 700 }}>
                                        {booking.status === "pending" ? "⏳ " : ""}
                                        {booking.agenda}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div
                                className={`absolute inset-0.5 rounded transition-all cursor-pointer flex items-center justify-center border text-center px-1 ${
                                  isInDrag
                                    ? "bg-amber-100 border-amber-400 text-amber-800 font-semibold shadow-md scale-[1.01] z-10 animate-pulse"
                                    : "hover:bg-green-50 border-transparent hover:border-green-200 text-transparent hover:text-green-600"
                                }`}
                              >
                                <span className="text-[10px]" style={{ fontWeight: 600 }}>
                                  {isInDrag ? (
                                    <span className="flex items-center gap-1">
                                      <span>⏳</span>
                                      {dragLabel}
                                    </span>
                                  ) : "+ Booking"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50/50">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500" /><span>⏳ Menunggu Persetujuan</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#1E3A5F]" /><span>✅ Disetujui (Terkonfirmasi)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-600" /><span>⚡ Sedang Berjalan</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-400" /><span>Pilihan Anda (Proses Request)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-gray-200" /><span>Tersedia</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-6 space-y-3">
            {bookings.length === 0
              ? <div className="text-center py-12"><Calendar size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">Belum ada riwayat booking</p></div>
              : bookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{b.agenda}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.date} · {b.start_time} – {b.end_time}</div>
                    <div className="text-xs text-gray-400">{b.user_name}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs ${statusColor[b.status] || "bg-gray-100 text-gray-600"}`} style={{ fontWeight: 500 }}>
                    {statusLabel[b.status] || b.status}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {room.status === "active" && (
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <button onClick={() => { setSelectedSlot(null); setShowBookingModal(true); fetchAvailability(); }}
            className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] transition-all" style={{ fontWeight: 500 }}>
            Booking Ruangan Ini
          </button>
        </div>
      )}

      {showBookingModal && room && (
        <QuickBookingModal room={room} initialDate={selectedSlot?.date} initialTime={selectedSlot?.time} initialEndTime={selectedSlot?.endTime}
          onClose={() => setShowBookingModal(false)}
          onConfirm={() => {
            setShowBookingModal(false);
            bookingService.list({ room_id: roomId, limit: 50 }).then(d => setBookings(d.data || d.bookings || d));
            fetchAvailability();
          }} />
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (() => {
        const selectedIndex = photos.findIndex((p: any) => p.url === selectedPhoto);
        const hasPrev = selectedIndex > 0;
        const hasNext = selectedIndex >= 0 && selectedIndex < photos.length - 1;

        return (
          <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
            <button className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/70 hover:text-white p-2 z-10" onClick={() => setSelectedPhoto(null)}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {hasPrev && (
              <button className="absolute left-2 sm:left-8 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-10" 
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photos[selectedIndex - 1].url); }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            
            <div className="relative max-w-full max-h-[90vh] flex items-center justify-center px-12 sm:px-24" onClick={e => e.stopPropagation()}>
              <img src={getImageUrl(selectedPhoto)} alt="Detail Foto" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none" />
            </div>

            {hasNext && (
              <button className="absolute right-2 sm:right-8 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-10" 
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photos[selectedIndex + 1].url); }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function QuickBookingModal({ room, initialDate, initialTime, initialEndTime, onClose, onConfirm }: any) {
  const [form, setForm] = useState({
    date: initialDate || new Date().toISOString().split("T")[0],
    startTime: initialTime || "",
    endTime: initialEndTime || "",
    agenda: "",
    participants: "",
    layout: "",
    notes: "",
    meetingType: (room.room_type === "digital" ? "online" : room.room_type === "hybrid" ? "hybrid" : "offline") as "offline" | "online" | "hybrid",
    suratTerkait: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const timeOptions = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
  const endOptions = timeOptions.filter(t => t > form.startTime);

  const handleSubmit = async () => {
    if (!form.agenda || !form.startTime || !form.endTime) return;
    setLoading(true); setError("");
    try {
      await bookingService.create({
        room_id: (form.meetingType === "online" && room.room_type !== "digital") ? undefined : room.id,
        date: form.date,
        start_time: form.startTime, end_time: form.endTime,
        agenda: form.agenda, participants: Number(form.participants) || 1,
        layout: form.layout, notes: form.notes,
        meeting_type: form.meetingType,
        surat_terkait: form.suratTerkait || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Gagal membuat booking");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>
            {room.approval_type === "instant" ? "Booking Berhasil!" : "Permohonan Terkirim!"}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            {room.approval_type === "instant" ? "Booking Anda telah dikonfirmasi." : "Menunggu persetujuan Admin."}
          </p>
          {(form.meetingType === "online" || form.meetingType === "hybrid") && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">
              🔗 Link Zoom akan tersedia setelah booking disetujui. Cek halaman "Booking Saya".
            </p>
          )}
          <button onClick={onConfirm} className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm">Tutup</button>
        </div>
      </div>
    );
  }

  const meetingTypeOptions = [
    { value: "offline", label: "Offline (Tatap Muka)", icon: "🏢", desc: "Rapat di ruangan fisik" },
    { value: "online", label: "Online (Virtual)", icon: "💻", desc: "Rapat via Zoom" },
    { value: "hybrid", label: "Hybrid", icon: "🔄", desc: "Ruangan fisik + Link Zoom" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Booking Ruangan</h3>
          <p className="text-sm text-gray-500 mt-0.5">{room.name}</p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">{error}</div>}

          {/* Meeting Type Selector */}
          {room.room_type === "digital" ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">💻</span>
              <div>
                <div className="text-sm font-semibold text-purple-900">Ruangan Rapat Digital (Zoom)</div>
                <p className="text-xs text-purple-700 mt-0.5">
                  Tipe rapat otomatis dikonfigurasi secara <strong>Online</strong>. Link Zoom Premium yang unik akan dibuat secara otomatis setelah pemesanan disetujui.
                </p>
              </div>
            </div>
          ) : room.room_type === "hybrid" ? (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔄</span>
              <div>
                <div className="text-sm font-semibold text-teal-900">Ruangan Hybrid (Fisik + Zoom)</div>
                <p className="text-xs text-teal-700 mt-0.5">
                  Tipe rapat dikunci ke <strong>Hybrid</strong>. Ruangan fisik <strong>{room.name}</strong> akan diamankan, dan link Zoom Premium yang unik akan dibuat secara otomatis.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Tipe Rapat <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {meetingTypeOptions.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({ ...form, meetingType: opt.value as any })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.meetingType === opt.value
                          ? "border-[#1E3A5F] bg-[#1E3A5F]/5 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-xs text-gray-700" style={{ fontWeight: form.meetingType === opt.value ? 600 : 400 }}>{opt.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.meetingType === "online" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
                  💻 Rapat online tidak memerlukan ruangan fisik. Link Zoom akan dibuat otomatis setelah booking disetujui.
                </div>
              )}

              {form.meetingType === "hybrid" && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 text-xs text-purple-700">
                  🔄 Rapat hybrid menggunakan ruangan <strong>{room.name}</strong> + Link Zoom otomatis.
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Mulai <span className="text-red-500">*</span></label>
              <select value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value, endTime: "" })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                <option value="">Pilih waktu</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Selesai <span className="text-red-500">*</span></label>
              <select value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} disabled={!form.startTime}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 disabled:opacity-50">
                <option value="">Pilih waktu</option>
                {endOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Agenda Rapat <span className="text-red-500">*</span></label>
            <input type="text" value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })}
              placeholder="Contoh: Rapat Evaluasi Bulanan"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jumlah Peserta</label>
            <input type="number" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })}
              placeholder="Jumlah peserta" min={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
          </div>

          {/* Surat Terkait (optional) */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
              Surat Terkait <span className="text-gray-400 text-xs font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.suratTerkait}
              onChange={e => setForm({ ...form, suratTerkait: e.target.value })}
              placeholder="Contoh: SE-001/OTK/2025 — Rapat Koordinasi Antar Divisi. Cantumkan nomor surat atau keterangan urgensi jika diperlukan."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Cantumkan nomor surat edaran, memo, atau referensi terkait untuk mendukung urgensi peminjaman.</p>
          </div>

          {room.approval_type === "manual" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
              ⚠️ Ruangan ini memerlukan persetujuan manual dari Admin Ruangan.
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
          <button onClick={handleSubmit} disabled={!form.agenda || !form.startTime || !form.endTime || loading}
            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${form.agenda && form.startTime && form.endTime && !loading ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : "Konfirmasi Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

