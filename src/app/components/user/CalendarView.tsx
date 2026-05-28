import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Filter, Info, MapPin, Users, Monitor } from "lucide-react";
import { timeSlots } from "../shared/mockData";
import { roomService } from "../../services/roomService";
import { bookingService } from "../../services/bookingService";
import { buildingService, policyService } from "../../services/index";
import { UserStore } from "../../services/apiClient";

interface CalendarViewProps {
  onNavigate: (page: string, data?: any) => void;
  userRole: string;
}

const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAY_NAMES_SHORT = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const DAY_NAMES_FULL = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

function getMondayOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => { 
    const d = new Date(monday); 
    d.setDate(d.getDate() + i); 
    return d; 
  });
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const mondayOffset = startDow === 0 ? 6 : startDow - 1;
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - mondayOffset);
  const grid: Date[][] = [];
  let current = new Date(startDate);
  while (grid.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { 
      week.push(new Date(current)); 
      current.setDate(current.getDate() + 1); 
    }
    grid.push(week);
    if (current.getMonth() > month || (month === 11 && current.getMonth() === 0)) break;
  }
  return grid;
}

function toMins(t: string) { 
  const [h, m] = t.split(":").map(Number); 
  return h * 60 + m; 
}

// ── Daily View (Draggable Grid) ───────────────────────────────────────────────
interface DragState {
  roomId: string;
  startIdx: number;
  endIdx: number;
  active: boolean;
}

export function DailyView({
  selectedDay,
  filteredRooms,
  onNavigate,
  onBack,
  filterButton,
  filterPanel,
  blackoutDates,
  userRole
}: {
  selectedDay: string;
  filteredRooms: any[];
  onNavigate: (page: string, data?: any) => void;
  onBack: () => void;
  filterButton?: React.ReactNode;
  filterPanel?: React.ReactNode;
  blackoutDates: string[];
  userRole?: string;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [bookingData, setBookingData] = useState<{ room: any; startTime: string; endTime: string } | null>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const isDragging = useRef(false);

  const selDate = new Date(selectedDay);
  const dow = selDate.getDay();
  const dayName = DAY_NAMES_FULL[dow === 0 ? 6 : dow - 1];

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const promises = filteredRooms.map(async (room) => {
        try {
          const res = await roomService.getAvailability(room.id, selectedDay);
          const dayData = res.data?.availability?.find((a: any) => a.date === selectedDay);
          return { roomId: room.id, bookings: dayData?.bookings || [] };
        } catch {
          return { roomId: room.id, bookings: [] };
        }
      });
      const results = await Promise.all(promises);
      const map: Record<string, any[]> = {};
      results.forEach(r => {
        map[r.roomId] = r.bookings;
      });
      setAvailabilityMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, filteredRooms]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const visibleTimeSlots = useMemo(() => {
    const today = new Date();
    const todayStr = formatDate(today);
    const allSlots: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, '0');
      allSlots.push(`${hh}:00`);
      allSlots.push(`${hh}:30`);
    }
    
    if (selectedDay === todayStr) {
      let currentMins = today.getHours() * 60 + today.getMinutes();
      let startMins = Math.floor(currentMins / 30) * 30 - 30;
      if (startMins < 0) startMins = 0;
      return allSlots.filter(t => toMins(t) >= startMins);
    }
    return allSlots;
  }, [selectedDay]);

  const isSlotBooked = useCallback((roomId: string, slotIdx: number) => {
    const time = visibleTimeSlots[slotIdx];
    const bookings = availabilityMap[roomId] || [];
    return bookings.some(b => {
      const slotM = toMins(time);
      const startM = toMins(b.startTime);
      const endM = toMins(b.endTime);
      return slotM >= startM && slotM < endM;
    });
  }, [availabilityMap]);

  const getSlotBooking = useCallback((roomId: string, slotIdx: number) => {
    const time = visibleTimeSlots[slotIdx];
    const bookings = availabilityMap[roomId] || [];
    return bookings.find(b => {
      const slotM = toMins(time);
      const startM = toMins(b.startTime);
      const endM = toMins(b.endTime);
      return slotM >= startM && slotM < endM;
    }) || null;
  }, [availabilityMap]);

  const rangeHasConflict = (roomId: string, from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i++) { 
      if (isSlotBooked(roomId, i)) return true; 
    }
    return false;
  };

  const isInSelection = (roomId: string, slotIdx: number) => {
    if (!drag || drag.roomId !== roomId) return false;
    const lo = Math.min(drag.startIdx, drag.endIdx);
    const hi = Math.max(drag.startIdx, drag.endIdx);
    return slotIdx >= lo && slotIdx <= hi;
  };

  const handleMouseDown = (roomId: string, slotIdx: number) => {
    if (isSlotBooked(roomId, slotIdx)) return;
    isDragging.current = true;
    setDrag({ roomId, startIdx: slotIdx, endIdx: slotIdx, active: true });
  };

  const handleMouseEnter = (roomId: string, slotIdx: number) => {
    if (!isDragging.current || !drag || drag.roomId !== roomId) return;
    setDrag(prev => prev ? { ...prev, endIdx: slotIdx } : prev);
  };

  const handleMouseUp = (roomId: string) => {
    if (!isDragging.current || !drag || drag.roomId !== roomId) return;
    isDragging.current = false;
    const lo = Math.min(drag.startIdx, drag.endIdx);
    const hi = Math.max(drag.startIdx, drag.endIdx);
    if (!rangeHasConflict(roomId, lo, hi)) {
      const room = filteredRooms.find(r => r.id === roomId);
      const startTime = visibleTimeSlots[lo];
      const endIdx = Math.min(hi + 1, visibleTimeSlots.length - 1);
      const endTime = visibleTimeSlots[endIdx];
      setBookingData({ room, startTime, endTime });
    }
    setDrag(null);
  };

  const handleTouchStart = (roomId: string, slotIdx: number, e: React.TouchEvent) => {
    if (isSlotBooked(roomId, slotIdx)) return;
    e.preventDefault();
    isDragging.current = true;
    setDrag({ roomId, startIdx: slotIdx, endIdx: slotIdx, active: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !drag) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const slotEl = el.closest("[data-slot]") as HTMLElement | null;
      if (slotEl) {
        const roomId = slotEl.dataset.room;
        const slotIdx = parseInt(slotEl.dataset.slot || "0");
        if (roomId === drag.roomId) {
          setDrag(prev => prev ? { ...prev, endIdx: slotIdx } : prev);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !drag) return;
    isDragging.current = false;
    const lo = Math.min(drag.startIdx, drag.endIdx);
    const hi = Math.max(drag.startIdx, drag.endIdx);
    if (!rangeHasConflict(drag.roomId, lo, hi)) {
      const room = filteredRooms.find(r => r.id === drag.roomId);
      const startTime = visibleTimeSlots[lo];
      const endIdx = Math.min(hi + 1, visibleTimeSlots.length - 1);
      const endTime = visibleTimeSlots[endIdx];
      setBookingData({ room, startTime, endTime });
    }
    setDrag(null);
  };

  useEffect(() => {
    const onUp = () => { 
      if (isDragging.current) { 
        isDragging.current = false; 
        setDrag(null); 
      } 
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const SLOT_W = 48; 
  const ROW_H = 76; 
  const LEFT_W = 200; 

  const activeConflict = drag ? rangeHasConflict(drag.roomId, Math.min(drag.startIdx, drag.endIdx), Math.max(drag.startIdx, drag.endIdx)) : false;

  const isPastDay = selectedDay < formatDate(new Date());

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-colors dark:bg-slate-950" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0 gap-2 transition-colors dark:bg-slate-900 dark:border-slate-700">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 shrink-0 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-800">
          <ChevronLeft size={16} />
          <span>Kembali</span>
        </button>
        <div className="text-center flex-1">
          <div className="text-gray-800 text-sm sm:text-base transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>
            {dayName}, {selDate.getDate()} {MONTH_NAMES[selDate.getMonth()]} {selDate.getFullYear()}
          </div>
          <div className="text-xs text-gray-500 transition-colors dark:text-slate-500">Pilih rentang waktu</div>
        </div>
        {filterButton && <div className="shrink-0">{filterButton}</div>}
      </div>
      
      {filterPanel && (
        <div className="px-4 sm:px-6 pt-4 shrink-0 bg-white dark:bg-slate-950 transition-colors">
          {filterPanel}
        </div>
      )}

      <div className="sm:hidden px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 transition-colors dark:bg-blue-900/20">
        <Info size={13} className="text-blue-500 shrink-0 transition-colors duration-300 dark:text-blue-400" />
        <p className="text-xs text-blue-600 transition-colors duration-300 dark:text-blue-400">Tahan & seret kolom waktu untuk memilih durasi booking</p>
      </div>

      <div className="bg-slate-100/80 border-b border-slate-200 px-4 py-3 flex items-center gap-x-5 gap-y-2 text-xs text-slate-600 flex-shrink-0 overflow-x-auto transition-colors duration-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/50">
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-white border border-slate-300 shadow-sm transition-colors duration-300 dark:bg-slate-900 dark:border-slate-700" /><span style={{ fontWeight: 500 }}>Tersedia</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-blue-50 border border-blue-300 transition-colors duration-300 dark:bg-blue-500/20 dark:border-blue-500/50" /><span style={{ fontWeight: 500 }}>Pilihan Anda</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-amber-50 border border-amber-300 transition-colors duration-300 dark:bg-amber-500/20 dark:border-amber-500/30" /><span style={{ fontWeight: 500 }}>Menunggu Persetujuan</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-blue-600 border border-blue-700 transition-colors duration-300 dark:bg-blue-500/30 dark:border-blue-400/40" /><span style={{ fontWeight: 500 }}>Disetujui</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 transition-colors duration-300 dark:bg-emerald-500/30 dark:border-emerald-400/40" /><span style={{ fontWeight: 500 }}>Sedang Berjalan</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-gray-500 border border-gray-600 transition-colors duration-300 dark:bg-gray-700 dark:border-gray-600" /><span style={{ fontWeight: 500 }}>Booked</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-red-50 border border-red-200 transition-colors duration-300 dark:bg-red-500/10 dark:border-red-500/20" /><span style={{ fontWeight: 500 }}>Tutup</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-4 h-3.5 rounded-md bg-slate-200/70 border border-slate-300 transition-colors duration-300 dark:bg-slate-800/40 dark:border-slate-700/50" /><span style={{ fontWeight: 500 }}>Sudah Lewat</span></div>
      </div>

      <div className="flex-1 overflow-auto select-none bg-white transition-colors dark:bg-slate-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 transition-colors dark:text-slate-500">Memuat jadwal ruangan...</p>
          </div>
        ) : (
          <div style={{ minWidth: `${LEFT_W + visibleTimeSlots.length * SLOT_W}px` }}>
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm flex transition-colors dark:bg-slate-900 dark:border-slate-700">
              <div className="shrink-0 border-r border-gray-200 bg-gray-50 flex items-end px-3 pb-2 transition-colors dark:bg-slate-800 dark:border-slate-700" style={{ width: LEFT_W }}>
                <span className="text-xs text-gray-400 transition-colors dark:text-slate-500" style={{ fontWeight: 600 }}>Ruangan</span>
              </div>
              {visibleTimeSlots.map((t, i) => (
                <div
                  key={t}
                  className={`shrink-0 border-r border-gray-100 dark:border-slate-800 last:border-r-0 flex items-end justify-center pb-1.5 ${i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/50 dark:bg-slate-800/30"}`}
                  style={{ width: SLOT_W }}
                >
                  {i % 2 === 0 && (
                    <span className="text-xs text-gray-400 transition-colors dark:text-slate-500" style={{ fontWeight: 600, fontSize: "10px" }}>{t}</span>
                  )}
                </div>
              ))}
            </div>

            {filteredRooms.map((room, ri) => {
              const maxCap = room.layouts?.length ? Math.max(...room.layouts.map((l: any) => l.capacity)) : 0;
              const hasVC = room.facilities?.some((f: any) => f.facility_type === "video_conference" && f.quantity > 0);

              return (
                <div
                  key={room.id}
                  className={`flex border-b border-gray-100 dark:border-slate-800 ${ri % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/30 dark:bg-slate-800/20"}`}
                  style={{ minHeight: ROW_H }}
                >
                  <div
                    className="shrink-0 border-r border-gray-200 px-3 py-2 flex flex-col justify-center cursor-pointer hover:bg-blue-50/50 transition-colors dark:border-slate-700"
                    style={{ width: LEFT_W }}
                    onClick={() => onNavigate("room-detail", { roomId: room.id })}
                  >
                    <div className="text-sm text-gray-800 leading-tight transition-colors dark:text-slate-100" style={{ fontWeight: 600 }} title={room.name}>{room.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {room.room_type === 'digital' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold tracking-wider uppercase transition-colors dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-500/20">Digital</span>
                      ) : room.room_type === 'hybrid' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-bold tracking-wider uppercase transition-colors dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-500/20">Hybrid</span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold tracking-wider uppercase transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Fisik</span>
                      )}
                      {(() => {
                        const isInstant = room.approval_type === 'instant' || room.approvalType === 'instant';
                        return isInstant ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold tracking-wider uppercase transition-colors dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500/20" title="Booking Langsung Disetujui">Instan</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold tracking-wider uppercase transition-colors dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/20" title="Memerlukan Persetujuan Admin">Persetujuan</span>
                        );
                      })()}
                      <span className="flex items-center gap-0.5 text-xs text-gray-400 transition-colors dark:text-slate-500">
                        <MapPin size={10} />{room.floor_name || "Lantai"}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-400 transition-colors dark:text-slate-500">
                        <Users size={10} />{maxCap}
                      </span>
                      {hasVC && <span className="text-xs bg-green-50 text-green-600 rounded px-1 border border-green-200 transition-colors dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50" style={{ fontSize: "9px" }}>VC</span>}
                    </div>
                  </div>

                  {visibleTimeSlots.map((time, si) => {
                    const isBlackout = blackoutDates.includes(selectedDay);
                    
                    const isOutsideOpHours = (() => {
                      const restrictHours = room.restrict_hours || room.restrictHours;
                      if (!restrictHours) return false;
                      const hStart = room.hours_start || room.hoursStart;
                      const hEnd = room.hours_end || room.hoursEnd;
                      if (!hStart || !hEnd) return false;
                      const slotMins = toMins(time);
                      const startMins = toMins(hStart);
                      const endMins = toMins(hEnd);
                      return slotMins < startMins || slotMins >= endMins;
                    })();

                    const isPastTime = (() => {
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                      if (selectedDay < todayStr) return true;
                      if (selectedDay > todayStr) return false;
                      const currentMins = today.getHours() * 60 + today.getMinutes();
                      return toMins(time) < currentMins;
                    })();

                    const booked = isSlotBooked(room.id, si);
                    const disabled = isPastTime || booked || isBlackout || isOutsideOpHours;
                    const booking = getSlotBooking(room.id, si);
                    const selected = isInSelection(room.id, si);
                    const isSelConflict = selected && activeConflict;

                    return (
                      <div
                        key={`${room.id}-${si}`}
                        data-room={room.id}
                        data-slot={si}
                        className={`shrink-0 border-r border-gray-100 dark:border-slate-800 last:border-r-0 relative transition-colors ${
                          disabled
                            ? "cursor-not-allowed bg-slate-50 dark:bg-slate-950"
                            : selected
                            ? isSelConflict
                              ? "cursor-not-allowed bg-red-100 dark:bg-red-500/20"
                              : "cursor-crosshair bg-amber-50/50 dark:bg-amber-500/20"
                            : "cursor-crosshair hover:bg-green-50/50 dark:hover:bg-green-900/20"
                        }`}
                        style={{ width: SLOT_W }}
                        onMouseDown={() => !disabled && handleMouseDown(room.id, si)}
                        onMouseEnter={() => handleMouseEnter(room.id, si)}
                        onMouseUp={() => handleMouseUp(room.id)}
                        onTouchStart={(e) => !disabled && handleTouchStart(room.id, si, e)}
                      >
                        {isOutsideOpHours ? (
                          <div className="absolute inset-0.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-[10px] flex items-center justify-center shadow-sm select-none transition-colors duration-300 dark:bg-red-500/10 dark:text-red-400/70 dark:border-red-500/20" style={{ fontWeight: 600 }}>Tutup</div>
                        ) : isBlackout ? (
                          <div className="absolute inset-0.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-[10px] flex items-center justify-center shadow-sm select-none transition-colors duration-300 dark:bg-red-500/10 dark:text-red-400/70 dark:border-red-500/20" style={{ fontWeight: 600 }}>Tutup</div>
                        ) : booked ? (
                          <div
                            className={`absolute inset-0.5 rounded-xl flex items-center justify-center overflow-hidden border shadow-sm select-none transition-all duration-300 cursor-pointer hover:opacity-90 active:scale-[0.98] ${
                              booking && booking.isOwn === false
                                ? "bg-gray-500 dark:bg-gray-700 border-gray-600 dark:border-gray-600 text-white"
                                : booking?.status === "pending"
                                ? "bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300"
                                : booking?.status === "ongoing"
                                ? "bg-emerald-500 dark:bg-emerald-500/30 border-emerald-600 dark:border-emerald-400/40 text-white dark:text-emerald-300"
                                : "bg-blue-600 dark:bg-blue-500/30 border-blue-700 dark:border-blue-400/40 text-white dark:text-blue-300"
                            }`}
                            title={booking ? (booking.isOwn === false ? `${booking.agenda} (${booking.userName || "Pemesan"}) - Booked` : `${booking.agenda} (${booking.userName || "Pemesan"}) - ${booking.status === "pending" ? "Menunggu Persetujuan" : "Disetujui"}`) : "Terbooking"}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setViewBooking(booking); }}
                          >
                            {booking && toMins(time) === toMins(booking.startTime) && (
                              <span className="truncate px-1 text-center font-bold" style={{ fontSize: "10px", fontWeight: 700 }}>
                                {booking.status === "pending" ? "⏳ " : ""}
                                {booking.agenda}
                              </span>
                            )}
                          </div>
                        ) : isPastTime ? (
                          <div className="absolute inset-0.5 rounded-xl bg-slate-200/70 border border-slate-300 transition-colors duration-300 dark:bg-slate-800/40 dark:border-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] font-bold shadow-inner select-none">Lewat</div>
                        ) : null}
                        {selected && !booked && !isBlackout && !isPastTime && !isOutsideOpHours && (
                          <div className={`absolute inset-0.5 rounded-xl border border-blue-400 bg-blue-50 dark:bg-blue-500/20 dark:border-blue-500/50 flex items-center justify-center transition-all duration-300 shadow-md scale-[1.02] z-10`}>
                            {si === (drag ? Math.min(drag.startIdx, drag.endIdx) : si) && (
                              <span className={`text-blue-800 dark:text-blue-300 font-bold ${isSelConflict ? "" : "animate-pulse"}`} style={{ fontSize: "10px", fontWeight: 700 }}>
                                {isSelConflict ? "✗" : "+ Booking"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {drag && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-4 py-2.5 rounded-full text-sm shadow-xl flex items-center gap-2 ${
            activeConflict
              ? "bg-red-600 text-white"
              : "bg-[#1E3A5F] text-white"
          }`} style={{ fontWeight: 600 }}>
            {activeConflict ? (
              <><span>✗</span> Slot ini sudah terpesan</>
            ) : (
              <>
                <span>⏱</span>
                {timeSlots[Math.min(drag.startIdx, drag.endIdx)]} –{" "}
                {timeSlots[Math.min(Math.max(drag.startIdx, drag.endIdx) + 1, timeSlots.length - 1)]}
                {" "}
                <span className="opacity-75 font-normal">
                  ({Math.abs(drag.endIdx - drag.startIdx) + 1} × 30m)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {bookingData && (
        <BookingModal
          room={bookingData.room}
          date={selectedDay}
          startTime={bookingData.startTime}
          endTime={bookingData.endTime}
          onClose={() => setBookingData(null)}
          onConfirm={() => {
            setBookingData(null);
            loadAvailability();
          }}
        />
      )}

      {viewBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setViewBooking(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Informasi Booking</h3>
              <button onClick={() => setViewBooking(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pemesan</label>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold mt-1">{viewBooking.userName || "Pemesan tidak diketahui"}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</label>
                  <div className="mt-1">
                    {viewBooking.isOwn === false ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-bold transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Booked</span>
                    ) : viewBooking.status === "pending" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold transition-colors dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/20">Menunggu</span>
                    ) : viewBooking.status === "ongoing" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold transition-colors dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/20">Berjalan</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold transition-colors dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500/20">Disetujui</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Agenda Rapat</label>
                <div className="text-slate-800 dark:text-slate-200 font-semibold mt-1">{viewBooking.agenda || "Tidak ada deskripsi agenda"}</div>
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Waktu Mulai</label>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold mt-1 text-lg">{viewBooking.startTime}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Waktu Selesai</label>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold mt-1 text-lg">{viewBooking.endTime}</div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
              <button onClick={() => setViewBooking(null)} className="px-5 py-2.5 bg-indigo-600 dark:bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 dark:hover:bg-emerald-700 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CalendarView ──────────────────────────────────────────────────────────
export function CalendarView({ onNavigate, userRole }: CalendarViewProps) {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekMonday, setWeekMonday] = useState(getMondayOfWeek(today));
  const [rooms, setRooms] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, bookingsRes, policyRes] = await Promise.all([
        roomService.list({ status: "active" }),
        bookingService.list({ limit: 100, own_only: "true" }),
        policyService.get().catch(() => ({ data: { blackoutDates: [] } }))
      ]);
      setRooms(roomsRes.data || []);
      setMyBookings(bookingsRes.data || []);
      setBlackoutDates((policyRes.data?.blackoutDates || []).map((d: any) => d.date || d));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const buildings = ["all", ...Array.from(new Set(rooms.map(r => r.building_name).filter(Boolean)))];
  const floors = ["all", ...Array.from(new Set(
    rooms.filter(r => filterBuilding === "all" || r.building_name === filterBuilding).map(r => r.floor_name).filter(Boolean)
  ))];

  const filteredRooms = rooms.filter(r => {
    if (r.status !== "active") return false;
    if (filterBuilding !== "all" && r.building_name !== filterBuilding) return false;
    if (filterFloor !== "all" && r.floor_name !== filterFloor) return false;
    return true;
  });

  const todayStr = formatDate(today);
  const monthGrid = getMonthGrid(monthDate.getFullYear(), monthDate.getMonth());
  const weekDays = getWeekDays(weekMonday);

  const getBookingsForDate = (dateStr: string) => {
    return myBookings.filter(b => b.date === dateStr && (b.status === "confirmed" || b.status === "ongoing" || b.status === "pending"));
  };

  const FilterPanel = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 transition-colors dark:bg-slate-900 dark:border-slate-700">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1 transition-colors dark:text-slate-400" style={{ fontWeight: 500 }}>Gedung</label>
        <select value={filterBuilding} onChange={e => { setFilterBuilding(e.target.value); setFilterFloor("all"); }}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700">
          {buildings.map(b => <option key={b} value={b}>{b === "all" ? "Semua Gedung" : b}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1 transition-colors dark:text-slate-400" style={{ fontWeight: 500 }}>Lantai</label>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700">
          {floors.map(f => <option key={f} value={f}>{f === "all" ? "Semua Lantai" : f}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button onClick={() => { setFilterBuilding("all"); setFilterFloor("all"); }}
          className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors duration-300 dark:bg-red-500/30 dark:text-red-400 dark:border-red-500/30">Reset</button>
      </div>
    </div>
  );

  if (selectedDay) {
    return (
      <DailyView
        selectedDay={selectedDay}
        filteredRooms={filteredRooms}
        onNavigate={onNavigate}
        onBack={() => { setSelectedDay(null); setShowFilters(false); }}
        filterButton={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm transition-all ${showFilters ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800"}`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        }
        filterPanel={showFilters ? <FilterPanel /> : undefined}
        blackoutDates={blackoutDates}
      />
    );
  }



  const DayCell = ({ date, inCurrentMonth = true, compact = false }: { date: Date; inCurrentMonth?: boolean; compact?: boolean }) => {
    const dateStr = formatDate(date);
    const bookings = getBookingsForDate(dateStr);
    const isToday = dateStr === todayStr;
    const isPast = date < today && !isToday;
    const isBlackout = blackoutDates.includes(dateStr);

    return (
      <button
        onClick={() => !isPast && !isBlackout && setSelectedDay(dateStr)}
        disabled={isPast || isBlackout}
        className={`w-full text-left border-r border-b border-gray-100 dark:border-slate-800 last:border-r-0 transition-colors group ${
          compact ? "p-1 min-h-[70px]" : "p-2 sm:p-2.5 min-h-[80px] sm:min-h-[96px]"
        } ${isBlackout ? "cursor-not-allowed bg-red-50/50 dark:bg-red-900/10" : isPast ? "cursor-not-allowed bg-gray-50/70 dark:bg-slate-800/40" : isToday ? "bg-blue-50/70 dark:bg-blue-900/20" : "bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/50"}`}
      >
        {!compact && (
          <div className="flex items-start justify-between mb-1">
            <span className={`text-xs sm:text-sm transition-colors ${
              isToday ? "w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white" :
              !inCurrentMonth ? "text-gray-300" :
              isPast ? "text-gray-400 dark:text-slate-500" : 
              isBlackout ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }`} style={{ fontWeight: isToday ? 700 : 500 }}>
              {date.getDate()}
            </span>
            {bookings.length > 0 && !isBlackout && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full w-5 h-5 flex items-center justify-center font-bold transition-colors dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50" style={{ fontSize: "10px" }}>{bookings.length}</span>
            )}
          </div>
        )}
        {!compact ? (
          <div className="space-y-1 mt-1">
            {isBlackout ? (
              <div className="rounded-md px-1.5 py-1 hidden sm:flex flex-col border shadow-sm transition-colors duration-300 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 items-center justify-center font-semibold text-[10px]">
                Tutup
              </div>
            ) : (
              bookings.slice(0, 2).map((b, i) => (
                <div 
                  key={i} 
                  className={`rounded-md px-1.5 py-1 hidden sm:flex flex-col border shadow-sm transition-colors duration-300 ${
                    b.status === "pending"
                      ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                      : b.status === "ongoing"
                      ? "bg-emerald-500 dark:bg-emerald-500/30 text-white dark:text-emerald-300 border-emerald-600 dark:border-emerald-400/40"
                      : "bg-blue-600 dark:bg-blue-500/30 text-white dark:text-blue-300 border-blue-700 dark:border-blue-400/40"
                  }`} 
                >
                  {b.room_name && (
                    <span className="text-[8px] uppercase tracking-wider opacity-90 truncate mb-0.5" style={{ fontWeight: 800 }}>
                      {b.room_name}
                    </span>
                  )}
                  <span className="text-[10px] truncate" style={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {b.status === "pending" ? "⏳ " : ""}{b.agenda}
                  </span>
                </div>
              ))
            )}
            {bookings.length > 0 && !isBlackout && (
              <div className="sm:hidden flex gap-1 mt-1 flex-wrap">
                {bookings.slice(0, 4).map((b, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${
                      b.status === "pending" ? "bg-amber-400 dark:bg-amber-400" :
                      b.status === "ongoing" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-blue-600 dark:bg-blue-400"
                    }`} 
                  />
                ))}
              </div>
            )}
            {bookings.length > 2 && (
              <div className="text-gray-400 hidden sm:block pl-1 transition-colors duration-300 dark:text-slate-500" style={{ fontSize: "10px", fontWeight: 500 }}>+{bookings.length - 2} lainnya</div>
            )}
          </div>
        ) : (
          bookings.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {bookings.slice(0, 3).map((b, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${
                    b.status === "pending" ? "bg-amber-400 dark:bg-amber-400" :
                    b.status === "ongoing" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-blue-600 dark:bg-blue-400"
                  }`} 
                />
              ))}
            </div>
          )
        )}
      </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-gray-800 transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>Kalender Ruangan</h2>
          <p className="text-sm text-gray-500 transition-colors dark:text-slate-400">Pilih tanggal untuk melihat jadwal & booking</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm transition-all self-start sm:self-auto ${showFilters ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800"}`}
        >
          <Filter size={15} />
          Filter Ruangan
        </button>
      </div>

      {showFilters && <FilterPanel />}

      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 transition-colors dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
        <Info size={14} className="shrink-0" />
        Pilih tanggal → tahan & seret kolom waktu di baris ruangan untuk memilih durasi booking secara instan.
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4 min-h-[300px] transition-colors dark:bg-slate-900 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 transition-colors dark:text-slate-500">Memuat data kalender...</p>
        </div>
      ) : (
        <>
          {/* DESKTOP Month View */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50/50 transition-colors dark:border-slate-800">
              <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors bg-white border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                <ChevronLeft size={18} />
              </button>
              <span className="text-gray-800 text-base transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</span>
              <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors bg-white border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100 bg-slate-50/20 transition-colors dark:border-slate-800">
              {DAY_NAMES_SHORT.map(d => (
                <div key={d} className="py-2.5 text-center text-xs text-gray-400 border-r border-gray-100 last:border-r-0 transition-colors dark:text-slate-500 dark:border-slate-800" style={{ fontWeight: 700 }}>{d}</div>
              ))}
            </div>
            {monthGrid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((date, di) => (
                  <DayCell key={di} date={date} inCurrentMonth={date.getMonth() === monthDate.getMonth()} />
                ))}
              </div>
            ))}
          </div>

          {/* MOBILE Week View */}
          <div className="lg:hidden bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-slate-50/50 transition-colors dark:border-slate-800">
              <button onClick={() => { const d = new Date(weekMonday); d.setDate(d.getDate() - 7); setWeekMonday(d); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors bg-white border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <div className="text-gray-800 text-sm transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>
                  {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTH_NAMES[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 transition-colors dark:text-slate-500">Ketuk tanggal untuk detail jadwal</div>
              </div>
              <button onClick={() => { const d = new Date(weekMonday); d.setDate(d.getDate() + 7); setWeekMonday(d); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors bg-white border border-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100 transition-colors dark:border-slate-800">
              {weekDays.map((date, i) => {
                const isToday = formatDate(date) === todayStr;
                return (
                  <div key={i} className="py-2 text-center border-r border-gray-100 last:border-r-0 transition-colors dark:border-slate-800">
                    <div className="text-xs text-gray-400 mb-0.5 transition-colors dark:text-slate-500" style={{ fontWeight: 600 }}>{DAY_NAMES_SHORT[i]}</div>
                    <div className={`mx-auto text-xs ${isToday ? "w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold" : "text-gray-700 dark:text-slate-200 font-semibold mb-1"}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((date, i) => (
                <DayCell key={i} date={date} compact />
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500 bg-slate-50/50 transition-colors dark:text-slate-400 dark:border-slate-800">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-50 transition-colors dark:bg-blue-900/20" /><span>Ada booking</span></div>
              <div className="flex items-center gap-1.5"><span className="text-gray-300 text-sm">—</span><span>Kosong</span></div>
            </div>
          </div>
        </>
      )}

      <div className="hidden lg:flex flex-wrap gap-5 text-xs text-slate-600 bg-slate-100/80 backdrop-blur-sm border border-slate-200 p-3 mt-4 rounded-xl transition-colors duration-300 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-400">
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300 shadow-sm transition-colors duration-300 dark:bg-slate-900 dark:border-slate-700" /><span style={{ fontWeight: 500 }}>Tersedia</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-blue-50 border border-blue-300 transition-colors duration-300 dark:bg-blue-900/20 dark:border-blue-800/50" /><span style={{ fontWeight: 500 }}>Hari Ini</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-amber-50 border border-amber-300 transition-colors duration-300 dark:bg-amber-500/20 dark:border-amber-500/30" /><span style={{ fontWeight: 500 }}>Menunggu Persetujuan</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-blue-600 border border-blue-700 transition-colors duration-300 dark:bg-blue-500/30 dark:border-blue-400/40" /><span style={{ fontWeight: 500 }}>Disetujui</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 transition-colors duration-300 dark:bg-emerald-500/30 dark:border-emerald-400/40" /><span style={{ fontWeight: 500 }}>Sedang Berjalan</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-red-50 border border-red-200 transition-colors duration-300 dark:bg-red-500/10 dark:border-red-500/20" /><span style={{ fontWeight: 500 }}>Tutup</span></div>
        <div className="flex items-center gap-2 shrink-0"><div className="w-3.5 h-3.5 rounded-md bg-slate-200/70 border border-slate-300 transition-colors duration-300 dark:bg-slate-800/40 dark:border-slate-700/50" /><span style={{ fontWeight: 500 }}>Sudah Lewat</span></div>
      </div>
    </div>
  );
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ room, date, startTime, endTime, onClose, onConfirm }: {
  room: any; date: string; startTime: string; endTime?: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const [form, setForm] = useState({
    agenda: "",
    endTime: endTime || "",
    participants: "",
    suratTerkait: "" as any,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const endOptions = timeSlots.filter(t => t > startTime);

  const handleSubmit = async () => {
    if (!form.agenda || !form.endTime) return;
    setLoading(true);
    setError("");
    try {
      await bookingService.create({
        room_id: room.id,
        date,
        start_time: startTime,
        end_time: form.endTime,
        agenda: form.agenda,
        participants: parseInt(form.participants) || 1,
        surat_terkait: form.suratTerkait || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Gagal melakukan pemesanan");
    } finally {
      setLoading(false);
    }
  };

  const durationLabel = () => {
    if (!form.endTime) return null;
    const mins = toMins(form.endTime) - toMins(startTime);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} jam${m > 0 ? ` ${m} menit` : ""}` : `${m} menit`;
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 dark:bg-green-500/30">
            <svg className="w-8 h-8 text-green-500 transition-colors duration-300 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-gray-800 mb-2 transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>
            {room?.approval_type === "instant" ? "Booking Berhasil!" : "Permohonan Terkirim!"}
          </h3>
          <p className="text-sm text-gray-500 mb-1 transition-colors dark:text-slate-400">{room?.name}</p>
          <p className="text-sm text-blue-600 mb-6 font-bold transition-colors duration-300 dark:text-blue-400">
            {date} · {startTime} – {form.endTime}
          </p>
          <button onClick={onConfirm} className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-900/10 hover:bg-[#142946] transition-colors">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between transition-colors dark:border-slate-800">
          <div>
            <h3 className="text-gray-800 transition-colors dark:text-slate-100" style={{ fontWeight: 700 }}>Konfirmasi Booking</h3>
            <p className="text-sm text-gray-500 mt-0.5 transition-colors dark:text-slate-400">{room?.name} · {room?.floor_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg transition-colors dark:text-slate-300">×</button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl transition-colors duration-300 dark:bg-red-500/30 dark:text-red-400 dark:border-red-500/30">
            {error}
          </div>
        )}

        <div className="mx-5 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 transition-colors dark:bg-blue-900/20 dark:border-blue-800/50">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Monitor size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-blue-900 font-bold transition-colors dark:text-blue-100">{date}</div>
            <div className="text-xs text-blue-600 transition-colors duration-300 dark:text-blue-400">
              {startTime} – {form.endTime || "…"}
              {durationLabel() && <span className="ml-2 text-blue-400">({durationLabel()})</span>}
            </div>
          </div>
          {room?.approval_type === "manual" && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 shrink-0 transition-colors duration-300 dark:bg-amber-500/30 dark:text-amber-400" style={{ fontWeight: 500 }}>Perlu Approval</span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 transition-colors dark:text-slate-200" style={{ fontWeight: 500 }}>Mulai</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-bold transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">{startTime}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 transition-colors dark:text-slate-200" style={{ fontWeight: 500 }}>Selesai <span className="text-red-500 transition-colors duration-300 dark:text-red-400">*</span></label>
              <select
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 font-bold transition-colors dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Pilih waktu</option>
                {endOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 transition-colors dark:text-slate-200" style={{ fontWeight: 500 }}>Agenda Rapat <span className="text-red-500 transition-colors duration-300 dark:text-red-400">*</span></label>
            <input
              type="text"
              value={form.agenda}
              onChange={e => setForm({ ...form, agenda: e.target.value })}
              placeholder="Contoh: Rapat Koordinasi Q2"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 transition-colors dark:text-slate-200" style={{ fontWeight: 500 }}>Jumlah Peserta</label>
            <input
              type="number"
              value={form.participants}
              onChange={e => setForm({ ...form, participants: e.target.value })}
              placeholder={`Contoh: 10 orang`}
              min={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 transition-colors dark:text-slate-200" style={{ fontWeight: 500 }}>
              Surat Terkait <span className="text-gray-400 text-xs font-normal transition-colors dark:text-slate-500">(opsional, max 2MB)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size > 2 * 1024 * 1024) {
                  alert("File terlalu besar. Maksimal 2MB.");
                  e.target.value = "";
                } else {
                  setForm({ ...form, suratTerkait: file });
                }
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700"
            />
            <p className="text-[10px] text-gray-400 mt-1 transition-colors dark:text-slate-500">Unggah file surat edaran, memo, atau referensi terkait untuk mendukung urgensi peminjaman.</p>
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!form.agenda || !form.endTime || loading}
            className={`px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
              form.agenda && form.endTime && !loading
                ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144]"
                : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed"
            }`}
            style={{ fontWeight: 600 }}
          >
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : "Konfirmasi Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
