import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Filter, Info, MapPin, Users, Monitor } from "lucide-react";
import { mockRooms, timeSlots, calendarBookings } from "../shared/mockData";

interface CalendarViewProps {
  onNavigate: (page: string, data?: any) => void;
  userRole: string;
}

// Extended bookings for demo
const allBookings: Record<string, { roomId: string; start: string; end: string; label: string }[]> = {
  ...calendarBookings,
  "2025-05-05_r2": [{ roomId: "r2", start: "09:00", end: "10:30", label: "Kick-off Proyek" }],
  "2025-05-06_r1": [{ roomId: "r1", start: "13:00", end: "15:00", label: "Rapat Direksi" }],
  "2025-05-07_r4": [{ roomId: "r4", start: "10:00", end: "11:00", label: "Sprint Review" }],
  "2025-05-08_r2": [{ roomId: "r2", start: "14:00", end: "16:00", label: "Workshop UX" }, { roomId: "r2", start: "09:00", end: "11:00", label: "Rapat Tim" }],
  "2025-05-12_r1": [{ roomId: "r1", start: "08:00", end: "10:00", label: "Laporan Bulanan" }],
  "2025-05-13_r3": [{ roomId: "r3", start: "09:00", end: "17:00", label: "Seminar SPBE" }],
  "2025-05-14_r2": [{ roomId: "r2", start: "13:00", end: "15:00", label: "Koordinasi" }],
  "2025-05-15_r5": [{ roomId: "r5", start: "09:00", end: "12:00", label: "Pelatihan SDM" }],
  "2025-05-26_r1": [{ roomId: "r1", start: "10:00", end: "12:00", label: "Board Meeting" }],
  "2025-05-27_r2": [{ roomId: "r2", start: "14:00", end: "16:00", label: "Review Anggaran" }],
  "2025-05-28_r4": [{ roomId: "r4", start: "09:00", end: "10:00", label: "Standup" }],
  "2025-05-29_r1": [{ roomId: "r1", start: "13:00", end: "15:00", label: "Rapat Koordinasi" }, { roomId: "r1", start: "10:00", end: "11:30", label: "Evaluasi" }],
  "2025-05-30_r3": [{ roomId: "r3", start: "08:00", end: "12:00", label: "Workshop Nasional" }],
};

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
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
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
    for (let i = 0; i < 7; i++) { week.push(new Date(current)); current.setDate(current.getDate() + 1); }
    grid.push(week);
    if (current.getMonth() > month || (month === 11 && current.getMonth() === 0)) break;
  }
  return grid;
}
function getBookingsForDate(dateStr: string) {
  return Object.entries(allBookings).filter(([k]) => k.startsWith(dateStr + "_")).flatMap(([, b]) => b);
}
function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

// ── Daily detail with drag-to-select ─────────────────────────────────────────
interface DragState {
  roomId: string;
  startIdx: number;
  endIdx: number;
  active: boolean;
}

function DailyView({
  selectedDay,
  filteredRooms,
  onNavigate,
  onBack,
}: {
  selectedDay: string;
  filteredRooms: typeof mockRooms;
  onNavigate: (page: string, data?: any) => void;
  onBack: () => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [bookingData, setBookingData] = useState<{ room: any; startTime: string; endTime: string } | null>(null);
  const isDragging = useRef(false);

  const selDate = new Date(selectedDay);
  const dow = selDate.getDay();
  const dayName = DAY_NAMES_FULL[dow === 0 ? 6 : dow - 1];

  const prevDay = () => { const d = new Date(selectedDay); d.setDate(d.getDate() - 1); };
  const nextDayFn = () => { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); };

  const isSlotBooked = useCallback((roomId: string, slotIdx: number) => {
    const time = timeSlots[slotIdx];
    const key = `${selectedDay}_${roomId}`;
    const bookings = allBookings[key] || [];
    return bookings.some(b => {
      const slotM = toMins(time);
      return slotM >= toMins(b.start) && slotM < toMins(b.end);
    });
  }, [selectedDay]);

  const getSlotBooking = useCallback((roomId: string, slotIdx: number) => {
    const time = timeSlots[slotIdx];
    const key = `${selectedDay}_${roomId}`;
    const bookings = allBookings[key] || [];
    return bookings.find(b => toMins(time) === toMins(b.start)) || null;
  }, [selectedDay]);

  // Check if any slot in range is booked
  const rangeHasConflict = (roomId: string, from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i++) { if (isSlotBooked(roomId, i)) return true; }
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
      const startTime = timeSlots[lo];
      const endIdx = Math.min(hi + 1, timeSlots.length - 1);
      const endTime = timeSlots[endIdx];
      setBookingData({ room, startTime, endTime });
    }
    setDrag(null);
  };

  // Touch support
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
      const startTime = timeSlots[lo];
      const endIdx = Math.min(hi + 1, timeSlots.length - 1);
      const endTime = timeSlots[endIdx];
      setBookingData({ room, startTime, endTime });
    }
    setDrag(null);
  };

  // Cancel drag on mouse leave from container
  useEffect(() => {
    const onUp = () => { if (isDragging.current) { isDragging.current = false; setDrag(null); } };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const SLOT_W = 48; // px per slot column
  const ROW_H = 52; // px per room row
  const LEFT_W = 180; // room name column width

  const activeConflict = drag ? rangeHasConflict(drag.roomId, Math.min(drag.startIdx, drag.endIdx), Math.max(drag.startIdx, drag.endIdx)) : false;

  return (
    <div className="flex flex-col h-full" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 shrink-0">
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Kembali</span>
        </button>
        <div className="text-center flex-1">
          <div className="text-gray-800 text-sm sm:text-base" style={{ fontWeight: 600 }}>
            {dayName}, {selDate.getDate()} {MONTH_NAMES[selDate.getMonth()]} {selDate.getFullYear()}
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">Tahan & seret kolom waktu untuk memilih durasi booking</div>
        </div>
        <div className="w-20 shrink-0" />
      </div>

      {/* Drag hint (mobile) */}
      <div className="sm:hidden px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <Info size={13} className="text-blue-500 shrink-0" />
        <p className="text-xs text-blue-600">Tahan & seret kolom waktu untuk memilih durasi booking</p>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-4 text-xs text-gray-500 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0"><div className="w-4 h-3 rounded bg-blue-500" /><span>Sudah dipesan</span></div>
        <div className="flex items-center gap-1.5 shrink-0"><div className="w-4 h-3 rounded bg-green-100 border border-green-300" /><span>Tersedia</span></div>
        <div className="flex items-center gap-1.5 shrink-0"><div className="w-4 h-3 rounded bg-blue-200 border-2 border-blue-400" /><span>Pilihan Anda</span></div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto select-none">
        <div style={{ minWidth: `${LEFT_W + timeSlots.length * SLOT_W}px` }}>

          {/* Time header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm flex">
            <div className="shrink-0 border-r border-gray-200 bg-gray-50 flex items-end px-3 pb-2" style={{ width: LEFT_W }}>
              <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Ruangan</span>
            </div>
            {timeSlots.map((t, i) => (
              <div
                key={t}
                className={`shrink-0 border-r border-gray-100 last:border-r-0 flex items-end justify-center pb-1.5 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                style={{ width: SLOT_W }}
              >
                {i % 2 === 0 && (
                  <span className="text-xs text-gray-400 rotate-0" style={{ fontWeight: 500, fontSize: "10px" }}>{t}</span>
                )}
              </div>
            ))}
          </div>

          {/* Room rows */}
          {filteredRooms.map((room, ri) => {
            const maxCap = Math.max(...Object.values(room.capacity));
            const hasVC = room.facilities.videoConference > 0;

            return (
              <div
                key={room.id}
                className={`flex border-b border-gray-100 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                style={{ height: ROW_H }}
              >
                {/* Room info */}
                <div
                  className="shrink-0 border-r border-gray-200 px-3 flex flex-col justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{ width: LEFT_W }}
                  onClick={() => onNavigate("room-detail", { roomId: room.id })}
                >
                  <div className="text-sm text-gray-800 truncate" style={{ fontWeight: 600 }}>{room.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin size={10} />{room.floor.replace("Lantai ", "Lt.")}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <Users size={10} />{maxCap}
                    </span>
                    {hasVC && <span className="text-xs bg-green-100 text-green-600 rounded px-1" style={{ fontSize: "10px" }}>VC</span>}
                    {room.approvalType === "manual" && <span className="text-xs bg-amber-100 text-amber-600 rounded px-1" style={{ fontSize: "10px" }}>Approval</span>}
                  </div>
                </div>

                {/* Time slots */}
                {timeSlots.map((time, si) => {
                  const booked = isSlotBooked(room.id, si);
                  const booking = getSlotBooking(room.id, si);
                  const selected = isInSelection(room.id, si);
                  const isSelConflict = selected && activeConflict;

                  return (
                    <div
                      key={`${room.id}-${si}`}
                      data-room={room.id}
                      data-slot={si}
                      className={`shrink-0 border-r border-gray-100 last:border-r-0 relative transition-colors ${
                        booked
                          ? "cursor-not-allowed"
                          : selected
                          ? isSelConflict
                            ? "cursor-not-allowed bg-red-100"
                            : "cursor-crosshair bg-blue-200"
                          : "cursor-crosshair hover:bg-green-50"
                      }`}
                      style={{ width: SLOT_W, height: ROW_H }}
                      onMouseDown={() => !booked && handleMouseDown(room.id, si)}
                      onMouseEnter={() => handleMouseEnter(room.id, si)}
                      onMouseUp={() => handleMouseUp(room.id)}
                      onTouchStart={(e) => handleTouchStart(room.id, si, e)}
                    >
                      {booked && (
                        <div
                          className={`absolute inset-0.5 rounded flex items-center justify-center overflow-hidden ${booking ? "bg-blue-500" : "bg-blue-200"}`}
                        >
                          {booking && (
                            <span className="text-white truncate px-1" style={{ fontSize: "10px", fontWeight: 500, writingMode: "horizontal-tb" }}>
                              {booking.label}
                            </span>
                          )}
                        </div>
                      )}
                      {selected && !booked && (
                        <div className={`absolute inset-0.5 rounded border-2 flex items-center justify-center ${isSelConflict ? "border-red-400 bg-red-100" : "border-blue-400 bg-blue-200"}`}>
                          {si === (drag ? Math.min(drag.startIdx, drag.endIdx) : si) && (
                            <span className={`text-xs ${isSelConflict ? "text-red-600" : "text-blue-700"}`} style={{ fontSize: "9px", fontWeight: 600 }}>
                              {isSelConflict ? "✗" : "✓"}
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
      </div>

      {/* Drag tooltip */}
      {drag && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-4 py-2 rounded-full text-sm shadow-xl flex items-center gap-2 ${
            activeConflict
              ? "bg-red-600 text-white"
              : "bg-[#1E3A5F] text-white"
          }`} style={{ fontWeight: 600 }}>
            {activeConflict ? (
              <><span>✗</span> Slot ini sudah dipesan</>
            ) : (
              <>
                <span>⏱</span>
                {timeSlots[Math.min(drag.startIdx, drag.endIdx)]} –{" "}
                {timeSlots[Math.min(Math.max(drag.startIdx, drag.endIdx) + 1, timeSlots.length - 1)]}
                {" "}
                <span className="opacity-70">
                  ({Math.abs(drag.endIdx - drag.startIdx) + 1} × 30 menit)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Booking modal */}
      {bookingData && (
        <BookingModal
          room={bookingData.room}
          date={selectedDay}
          startTime={bookingData.startTime}
          endTime={bookingData.endTime}
          onClose={() => setBookingData(null)}
          onConfirm={() => setBookingData(null)}
        />
      )}
    </div>
  );
}

// ── Main CalendarView ──────────────────────────────────────────────────────────
export function CalendarView({ onNavigate, userRole }: CalendarViewProps) {
  const today = new Date(2025, 4, 18);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date(2025, 4, 1));
  const [weekMonday, setWeekMonday] = useState(getMondayOfWeek(today));

  const buildings = ["all", ...Array.from(new Set(mockRooms.map(r => r.building)))];
  const floors = ["all", ...Array.from(new Set(
    mockRooms.filter(r => filterBuilding === "all" || r.building === filterBuilding).map(r => r.floor)
  ))];
  const filteredRooms = mockRooms.filter(r => {
    if (r.status !== "active") return false;
    if (filterBuilding !== "all" && r.building !== filterBuilding) return false;
    if (filterFloor !== "all" && r.floor !== filterFloor) return false;
    return true;
  });

  const todayStr = formatDate(today);
  const monthGrid = getMonthGrid(monthDate.getFullYear(), monthDate.getMonth());
  const weekDays = getWeekDays(weekMonday);

  // ── Daily view ────────────────────────────────────────────────────────────
  if (selectedDay) {
    return (
      <DailyView
        selectedDay={selectedDay}
        filteredRooms={filteredRooms}
        onNavigate={onNavigate}
        onBack={() => setSelectedDay(null)}
      />
    );
  }

  // ── Filter panel ──────────────────────────────────────────────────────────
  const FilterPanel = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Gedung</label>
        <select value={filterBuilding} onChange={e => { setFilterBuilding(e.target.value); setFilterFloor("all"); }}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50">
          {buildings.map(b => <option key={b} value={b}>{b === "all" ? "Semua Gedung" : b}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Lantai</label>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50">
          {floors.map(f => <option key={f} value={f}>{f === "all" ? "Semua Lantai" : f}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button onClick={() => { setFilterBuilding("all"); setFilterFloor("all"); }}
          className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200">Reset</button>
      </div>
    </div>
  );

  // ── Day cell (shared between month and week) ──────────────────────────────
  const DayCell = ({ date, inCurrentMonth = true, compact = false }: { date: Date; inCurrentMonth?: boolean; compact?: boolean }) => {
    const dateStr = formatDate(date);
    const bookings = getBookingsForDate(dateStr);
    const isToday = dateStr === todayStr;
    const isPast = date < today && !isToday;

    return (
      <button
        onClick={() => setSelectedDay(dateStr)}
        className={`w-full text-left border-r border-b border-gray-100 last:border-r-0 transition-colors group ${
          compact ? "p-1 min-h-[70px]" : "p-2 sm:p-2.5 min-h-[80px] sm:min-h-[96px]"
        } ${isPast ? "bg-gray-50/70" : isToday ? "bg-blue-50" : "bg-white hover:bg-blue-50/40"}`}
      >
        <div className="flex items-start justify-between mb-1">
          <span className={`text-xs sm:text-sm w-6 h-6 flex items-center justify-center rounded-full transition-all group-hover:bg-blue-100 ${
            isToday ? "bg-blue-600 text-white group-hover:bg-blue-600" :
            !inCurrentMonth ? "text-gray-300" :
            isPast ? "text-gray-400" : "text-gray-700"
          }`} style={{ fontWeight: isToday ? 700 : 500 }}>
            {date.getDate()}
          </span>
          {bookings.length > 0 && !compact && (
            <span className="text-xs text-blue-500 hidden sm:block" style={{ fontWeight: 600 }}>{bookings.length}</span>
          )}
        </div>
        {!compact ? (
          <div className="space-y-0.5">
            {bookings.slice(0, 2).map((b, i) => (
              <div key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate hidden sm:block" style={{ fontSize: "11px" }}>
                {b.label}
              </div>
            ))}
            {bookings.length > 0 && (
              <div className="sm:hidden flex gap-0.5 mt-0.5 flex-wrap">
                {bookings.slice(0, 4).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />)}
              </div>
            )}
            {bookings.length > 2 && (
              <div className="text-xs text-gray-400 hidden sm:block" style={{ fontSize: "11px" }}>+{bookings.length - 2} lainnya</div>
            )}
          </div>
        ) : (
          bookings.length > 0 && (
            <div className="flex gap-0.5 flex-wrap mt-0.5">
              {bookings.slice(0, 3).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />)}
            </div>
          )
        )}
      </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Kalender Ruangan</h2>
          <p className="text-sm text-gray-500">Pilih tanggal untuk melihat jadwal & booking</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all self-start sm:self-auto ${showFilters ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
        >
          <Filter size={15} />
          Filter Ruangan
          {(filterBuilding !== "all" || filterFloor !== "all") && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: "10px" }}>!</span>
          )}
        </button>
      </div>

      {showFilters && <FilterPanel />}

      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <Info size={14} className="shrink-0" />
        Pilih tanggal → tahan & seret kolom waktu di baris ruangan untuk memilih durasi booking.
      </div>

      {/* ── DESKTOP: Monthly ───────────────────────────────────────────────── */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-800" style={{ fontWeight: 700 }}>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</span>
          <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_NAMES_SHORT.map(d => (
            <div key={d} className="py-2.5 text-center text-xs text-gray-400 border-r border-gray-100 last:border-r-0" style={{ fontWeight: 600 }}>{d}</div>
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

      {/* ── MOBILE: Weekly ─────────────────────────────────────────────────── */}
      <div className="lg:hidden bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={() => { const d = new Date(weekMonday); d.setDate(d.getDate() - 7); setWeekMonday(d); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>
              {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTH_NAMES[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
            </div>
            <div className="text-xs text-gray-400">Ketuk tanggal untuk detail jadwal</div>
          </div>
          <button onClick={() => { const d = new Date(weekMonday); d.setDate(d.getDate() + 7); setWeekMonday(d); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map((date, i) => {
            const isToday = formatDate(date) === todayStr;
            return (
              <div key={i} className="py-2 text-center border-r border-gray-100 last:border-r-0">
                <div className="text-xs text-gray-400 mb-0.5" style={{ fontWeight: 500 }}>{DAY_NAMES_SHORT[i]}</div>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto text-xs ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`} style={{ fontWeight: 600 }}>
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
        <div className="px-4 py-2.5 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span>Ada booking</span></div>
          <div className="flex items-center gap-1.5"><span className="text-gray-300 text-sm">—</span><span>Kosong</span></div>
        </div>
      </div>

      {/* Legend desktop */}
      <div className="hidden lg:flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /><span>Hari ini</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /><span>Ada booking</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-gray-200" /><span>Tersedia</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /><span>Sudah lewat</span></div>
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
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const endOptions = timeSlots.filter(t => t > startTime);

  const handleSubmit = () => {
    if (!form.agenda || !form.endTime) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 1000);
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>
            {room?.approvalType === "instant" ? "Booking Berhasil!" : "Permohonan Terkirim!"}
          </h3>
          <p className="text-sm text-gray-500 mb-1">{room?.name}</p>
          <p className="text-sm text-blue-600 mb-6" style={{ fontWeight: 500 }}>
            {date} · {startTime} – {form.endTime}
          </p>
          <button onClick={onConfirm} className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl text-sm">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-gray-800" style={{ fontWeight: 700 }}>Konfirmasi Booking</h3>
          <p className="text-sm text-gray-500 mt-0.5">{room?.name} · {room?.floor}</p>
        </div>

        {/* Summary bar */}
        <div className="mx-5 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Monitor size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-blue-900" style={{ fontWeight: 600 }}>{date}</div>
            <div className="text-xs text-blue-600">
              {startTime} – {form.endTime || "…"}
              {durationLabel() && <span className="ml-2 text-blue-400">({durationLabel()})</span>}
            </div>
          </div>
          {room?.approvalType === "manual" && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 shrink-0" style={{ fontWeight: 500 }}>Perlu Approval</span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Mulai</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700" style={{ fontWeight: 500 }}>{startTime}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Selesai <span className="text-red-500">*</span></label>
              <select
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50"
              >
                <option value="">Pilih waktu</option>
                {endOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Agenda Rapat <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.agenda}
              onChange={e => setForm({ ...form, agenda: e.target.value })}
              placeholder="Contoh: Rapat Koordinasi Q2"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Jumlah Peserta</label>
            <input
              type="number"
              value={form.participants}
              onChange={e => setForm({ ...form, participants: e.target.value })}
              placeholder={`Maks. ${Math.max(...Object.values(room?.capacity || { x: 10 }))} orang`}
              min={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Catatan <span className="text-gray-400 text-xs">(opsional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Kebutuhan tambahan, layout, dll."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 resize-none"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!form.agenda || !form.endTime || loading}
            className={`px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
              form.agenda && form.endTime && !loading
                ? "bg-[#1E3A5F] text-white hover:bg-[#0F2144]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            style={{ fontWeight: 500 }}
          >
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : "Konfirmasi Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
