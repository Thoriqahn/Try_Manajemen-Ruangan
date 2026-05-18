import { useState } from "react";
import { HelpCircle, ShieldCheck, Calendar, Check, ChevronLeft, ChevronRight } from "lucide-react";

export function GlobalPolicy() {
  const [maxDuration, setMaxDuration] = useState(6);
  const [maxDaysAhead, setMaxDaysAhead] = useState(30);
  const [blackoutDates, setBlackoutDates] = useState<string[]>(["2025-06-01", "2025-06-02", "2025-08-17"]);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 4)); // May 2025

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 1000);
  };

  const toggleBlackout = (date: string) => {
    setBlackoutDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay: firstDay === 0 ? 6 : firstDay - 1, daysInMonth, year, month };
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const TooltipWrapper = ({ text, children }: { text: string; children: React.ReactNode }) => (
    <div className="relative group inline-flex items-center gap-1">
      {children}
      <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
        {text}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Kebijakan Global</h2>
        <p className="text-sm text-gray-500">Aturan yang berlaku untuk seluruh sistem dan semua aplikasi terintegrasi</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
          <Check size={16} />
          Kebijakan berhasil diterapkan ke seluruh sistem!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Thresholds */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Batasan Booking</h3>
          </div>
          <div className="space-y-5">
            <div>
              <TooltipWrapper text="Batas maksimum durasi yang dapat dipesan dalam satu sesi booking. Mencegah monopoli ruangan.">
                <label className="text-sm text-gray-700" style={{ fontWeight: 500 }}>Durasi Maksimal per Booking</label>
                <HelpCircle size={14} className="text-gray-400 cursor-help" />
              </TooltipWrapper>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={maxDuration}
                  onChange={e => setMaxDuration(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full cursor-pointer accent-blue-600"
                />
                <div className="w-20 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <span className="text-blue-700" style={{ fontWeight: 700 }}>{maxDuration}</span>
                  <span className="text-blue-600 text-xs ml-1">jam</span>
                </div>
              </div>
            </div>

            <div>
              <TooltipWrapper text="Rentang hari ke depan yang boleh dipesan oleh pengguna biasa. Admin tidak terbatas oleh aturan ini.">
                <label className="text-sm text-gray-700" style={{ fontWeight: 500 }}>Batas Hari Pemesanan ke Depan</label>
                <HelpCircle size={14} className="text-gray-400 cursor-help" />
              </TooltipWrapper>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={1}
                  max={90}
                  value={maxDaysAhead}
                  onChange={e => setMaxDaysAhead(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full cursor-pointer accent-blue-600"
                />
                <div className="w-20 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <span className="text-blue-700" style={{ fontWeight: 700 }}>{maxDaysAhead}</span>
                  <span className="text-blue-600 text-xs ml-1">hari</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Kebijakan ini berlaku untuk seluruh pengguna biasa. Admin Ruangan dan Super Admin tidak terikat batasan ini.</p>
            </div>
          </div>
        </div>

        {/* Calendar blackout */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-red-500" />
            <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Blackout Dates</h3>
          </div>

          {/* Mini calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
                {monthNames[month]} {year}
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 py-1" style={{ fontWeight: 500 }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(year, month, day);
                const isBlackout = blackoutDates.includes(dateStr);
                const isWeekend = (firstDay + i) % 7 >= 5;

                return (
                  <button
                    key={day}
                    onClick={() => !isWeekend && toggleBlackout(dateStr)}
                    onMouseEnter={() => setHoverDate(dateStr)}
                    onMouseLeave={() => setHoverDate(null)}
                    disabled={isWeekend}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                      isBlackout ? "bg-red-500 text-white" :
                      isWeekend ? "text-gray-300 cursor-default" :
                      "hover:bg-red-50 hover:text-red-600 text-gray-600 cursor-pointer"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {blackoutDates.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Tanggal yang diblokir ({blackoutDates.length}):</p>
              <div className="flex flex-wrap gap-1">
                {blackoutDates.sort().map(date => (
                  <button
                    key={date}
                    onClick={() => toggleBlackout(date)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    {date}
                    <span className="text-red-400">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-xl hover:bg-[#0F2144] disabled:opacity-50 transition-all shadow-md"
        >
          {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menerapkan...</> : "Terapkan Kebijakan"}
        </button>
      </div>
    </div>
  );
}
