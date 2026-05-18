import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Users, Clock, Monitor, Wifi, Volume2, Zap, Calendar, RefreshCw } from "lucide-react";
import { roomService, Room } from "../../services/roomService";
import { bookingService, Booking } from "../../services/bookingService";
import { TokenStore } from "../../services/apiClient";

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
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; date: string } | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

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
    roomService.availability(roomId, weekDays[0].full, weekDays[4].full)
      .then(res => setAvailability(res.data?.availability || [])).catch(() => {});
  }, [currentWeekOffset]);

  const isBooked = (date: string, time: string) => {
    return availability.some((b: any) => {
      if (b.date !== date) return false;
      const slotMins = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
      const startMins = parseInt(b.start_time.split(":")[0]) * 60 + parseInt(b.start_time.split(":")[1]);
      const endMins = parseInt(b.end_time.split(":")[0]) * 60 + parseInt(b.end_time.split(":")[1]);
      return slotMins >= startMins && slotMins < endMins;
    });
  };

  const timeSlots = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

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

  const photos = room.photos || [];
  const heroImage = photos.find((p: any) => p.is_primary)?.url || photos[0]?.url;
  const layouts = room.layouts || [];
  const facilities = room.facilities || {};

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Hero */}
      <div className="relative h-56 bg-gray-200 flex-shrink-0">
        {heroImage
          ? <img src={heroImage} alt={room.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-[#1E3A5F] to-[#0F2144]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={() => onNavigate("rooms")}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-700 rounded-lg p-2 flex items-center gap-1.5 text-sm shadow">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.3rem" }}>{room.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <MapPin size={14} className="text-white/70" />
            <span className="text-white/80 text-sm">{room.floor_name} · {room.building_name}</span>
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${room.status === "active" ? "bg-green-400/80 text-white" : "bg-gray-400/80 text-white"}`} style={{ fontWeight: 500 }}>
              {room.status === "active" ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-shrink-0">
        {[
          { icon: <Users size={18} className="text-blue-500" />, label: "Kapasitas", value: layouts.length > 0 ? `s.d. ${Math.max(...layouts.map((l: any) => l.capacity || 0))} orang` : "–" },
          { icon: <Clock size={18} className="text-purple-500" />, label: "Operasional", value: room.operational_start ? `${room.operational_start} – ${room.operational_end}` : "24 Jam" },
          { icon: <Calendar size={18} className="text-green-500" />, label: "Sistem Booking", value: room.approval_type === "instant" ? "Instan" : "Perlu Approval" },
          { icon: <Monitor size={18} className="text-orange-500" />, label: "Layout", value: `${layouts.length} tipe` },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">{s.icon}</div>
            <div><div className="text-xs text-gray-400">{s.label}</div><div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{s.value}</div></div>
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
            {room.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-gray-700 mb-2" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Deskripsi</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{room.description}</p>
              </div>
            )}
            {layouts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Layout & Kapasitas</h3>
                <div className="space-y-2">
                  {layouts.map((l: any) => (
                    <div key={l.id || l.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{l.name}</span>
                      <span className="text-sm" style={{ fontWeight: 500 }}>{l.capacity} orang</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(facilities).length > 0 && (
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
                  <p className="text-xs text-gray-400 mt-0.5">Klik slot kosong untuk booking</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentWeekOffset(o => o - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">‹</button>
                  <button onClick={() => setCurrentWeekOffset(0)} className="px-2 py-1 text-xs bg-gray-100 rounded-lg text-gray-600">Minggu Ini</button>
                  <button onClick={() => setCurrentWeekOffset(o => o + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">›</button>
                </div>
              </div>
              <div className="overflow-auto">
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
                        return (
                          <div key={d.full} className="border-l border-gray-100 h-10 relative">
                            {booked
                              ? <div className="absolute inset-0.5 rounded bg-blue-200" />
                              : <button onClick={() => { setSelectedSlot({ time, date: d.full }); setShowBookingModal(true); }}
                                  className="absolute inset-0.5 rounded hover:bg-green-50 hover:border border-green-200 transition-all group">
                                  <span className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: "10px" }}>+ Booking</span>
                                </button>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-200" /><span>Sudah Dibooking</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200" /><span>Tersedia</span></div>
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
          <button onClick={() => { setSelectedSlot(null); setShowBookingModal(true); }}
            className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#0F2144] transition-all" style={{ fontWeight: 500 }}>
            Booking Ruangan Ini
          </button>
        </div>
      )}

      {showBookingModal && room && (
        <QuickBookingModal room={room} initialDate={selectedSlot?.date} initialTime={selectedSlot?.time}
          onClose={() => setShowBookingModal(false)}
          onConfirm={() => { setShowBookingModal(false); bookingService.list({ room_id: roomId }).then(d => setBookings(d.bookings || d)); }} />
      )}
    </div>
  );
}

function QuickBookingModal({ room, initialDate, initialTime, onClose, onConfirm }: any) {
  const [form, setForm] = useState({
    date: initialDate || new Date().toISOString().split("T")[0],
    startTime: initialTime || "",
    endTime: "",
    agenda: "",
    participants: "",
    layout: "",
    notes: "",
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
        room_id: room.id, date: form.date,
        start_time: form.startTime, end_time: form.endTime,
        agenda: form.agenda, participants: Number(form.participants) || 1,
        layout: form.layout, notes: form.notes,
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
          <p className="text-sm text-gray-500 mb-6">
            {room.approval_type === "instant" ? "Booking Anda telah dikonfirmasi." : "Menunggu persetujuan Admin."}
          </p>
          <button onClick={onConfirm} className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Booking Ruangan</h3>
          <p className="text-sm text-gray-500 mt-0.5">{room.name}</p>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">{error}</div>}
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
          {room.approval_type === "manual" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
              ⚠️ Ruangan ini memerlukan persetujuan manual dari Admin Ruangan.
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
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
