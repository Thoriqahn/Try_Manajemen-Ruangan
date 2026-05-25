import { useState, useEffect } from "react";
import { HelpCircle, ShieldCheck, Calendar, Check, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { policyService } from "../../services/index";

export function GlobalPolicy() {
  const [maxDuration, setMaxDuration] = useState(6);
  const [maxDaysAhead, setMaxDaysAhead] = useState(30);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Blackout Modal States
  const [blackoutModal, setBlackoutModal] = useState<{ isOpen: boolean; date: string; reason: string }>({ isOpen: false, date: "", reason: "" });

  useEffect(() => {
    policyService.get().then((res: any) => {
      const data = res.data || {};
      setMaxDuration(data.max_duration_hours || 6);
      setMaxDaysAhead(data.max_days_ahead || 30);
      setBlackoutDates((data.blackoutDates || []).map((d: any) => d.date || d));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await policyService.update({ max_duration_hours: maxDuration, max_days_ahead: maxDaysAhead });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message || "Gagal menyimpan"); }
    setSaving(false);
  };

  const toggleBlackout = async (date: string) => {
    if (blackoutDates.includes(date)) {
      setBlackoutDates(prev => prev.filter(d => d !== date));
      try { await policyService.removeBlackout(date); } catch (e: any) { alert(e.message); setBlackoutDates(prev => [...prev, date]); }
    } else {
      setBlackoutModal({ isOpen: true, date, reason: "" });
    }
  };

  const handleConfirmBlackout = async () => {
    const { date, reason } = blackoutModal;
    if (!reason.trim()) {
      alert("Alasan penutupan harus diisi.");
      return;
    }
    setBlackoutModal({ isOpen: false, date: "", reason: "" });
    setBlackoutDates(prev => [...prev, date]);
    try { 
      await policyService.addBlackout(date, reason); 
    } catch (e: any) { 
      alert(e.message); 
      setBlackoutDates(prev => prev.filter(d => d !== date)); 
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    return { firstDay: firstDay === 0 ? 6 : firstDay - 1, daysInMonth: new Date(year, month + 1, 0).getDate(), year, month };
  };
  const formatDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  const TooltipWrapper = ({ text, children }: { text: string; children: React.ReactNode }) => (
    <div className="relative group inline-flex items-center gap-1">
      {children}
      <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 text-white text-xs rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg transition-all duration-300">{text}</div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-800 transition-colors duration-300 dark:text-slate-100" style={{ fontWeight: 700 }}>Kebijakan Global</h2>
        <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Aturan yang berlaku untuk seluruh sistem</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-700 text-sm transition-colors duration-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50">
          <Check size={16} /> Kebijakan berhasil diterapkan ke seluruh sistem!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white backdrop-blur-md border border-gray-200 rounded-2xl p-5 transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="text-gray-700 transition-colors duration-300 dark:text-slate-200" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Batasan Booking</h3>
          </div>
          <div className="space-y-5">
            <div>
              <TooltipWrapper text="Batas maksimum durasi yang dapat dipesan dalam satu sesi booking.">
                <label className="text-sm text-gray-700 transition-colors duration-300 dark:text-slate-200" style={{ fontWeight: 500 }}>Durasi Maksimal per Booking</label>
                <HelpCircle size={14} className="text-gray-400 cursor-help transition-colors duration-300 dark:text-slate-500" />
              </TooltipWrapper>
              <div className="flex items-center gap-3 mt-2">
                <input type="range" min={1} max={12} value={maxDuration} onChange={e => setMaxDuration(Number(e.target.value))} className="flex-1 h-2 rounded-full cursor-pointer accent-blue-600" />
                <div className="w-20 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center transition-colors duration-300 dark:bg-blue-900/20 dark:border-blue-800/50">
                  <span className="text-blue-700 transition-colors duration-300 dark:text-blue-300" style={{ fontWeight: 700 }}>{maxDuration}</span>
                  <span className="text-blue-600 text-xs ml-1 transition-colors duration-300 dark:text-blue-400">jam</span>
                </div>
              </div>
            </div>
            <div>
              <TooltipWrapper text="Rentang hari ke depan yang boleh dipesan pengguna biasa.">
                <label className="text-sm text-gray-700 transition-colors duration-300 dark:text-slate-200" style={{ fontWeight: 500 }}>Batas Hari Pemesanan ke Depan</label>
                <HelpCircle size={14} className="text-gray-400 cursor-help transition-colors duration-300 dark:text-slate-500" />
              </TooltipWrapper>
              <div className="flex items-center gap-3 mt-2">
                <input type="range" min={1} max={90} value={maxDaysAhead} onChange={e => setMaxDaysAhead(Number(e.target.value))} className="flex-1 h-2 rounded-full cursor-pointer accent-blue-600" />
                <div className="w-20 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center transition-colors duration-300 dark:bg-blue-900/20 dark:border-blue-800/50">
                  <span className="text-blue-700 transition-colors duration-300 dark:text-blue-300" style={{ fontWeight: 700 }}>{maxDaysAhead}</span>
                  <span className="text-blue-600 text-xs ml-1 transition-colors duration-300 dark:text-blue-400">hari</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 transition-colors duration-300 dark:border-slate-800/50">
              <p className="text-xs text-gray-400 transition-colors duration-300 dark:text-slate-500">Kebijakan ini berlaku untuk seluruh pengguna biasa. Admin & Super Admin tidak terikat batasan ini.</p>
            </div>
          </div>
        </div>

        <div className="bg-white backdrop-blur-md border border-gray-200 rounded-2xl p-5 transition-colors duration-300 dark:bg-slate-900/90 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-red-500" />
            <h3 className="text-gray-700 transition-colors duration-300 dark:text-slate-200" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Blackout Dates</h3>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded-xl transition-all duration-300 dark:bg-slate-800"><ChevronLeft size={16} className="text-gray-500 transition-colors duration-300 dark:text-slate-400" /></button>
              <span className="text-sm text-gray-700 transition-colors duration-300 dark:text-slate-200" style={{ fontWeight: 600 }}>{monthNames[month]} {year}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded-xl transition-all duration-300 dark:bg-slate-800"><ChevronRight size={16} className="text-gray-500 transition-colors duration-300 dark:text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d => <div key={d} className="text-center text-xs text-gray-400 py-1 transition-colors duration-300 dark:text-slate-500" style={{ fontWeight: 500 }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(year, month, day);
                const isBlackout = blackoutDates.includes(dateStr);
                const isWeekend = (firstDay + i) % 7 >= 5;
                return (
                  <button key={day} onClick={() => !isWeekend && toggleBlackout(dateStr)} onMouseEnter={() => {}} disabled={isWeekend}
                    className={`aspect-square flex items-center justify-center text-xs rounded-xl transition-all ${isBlackout ? "bg-red-50 dark:bg-red-500/20 text-white" : isWeekend ? "text-gray-300 cursor-default" : "hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 text-gray-600 dark:text-slate-300 cursor-pointer"}`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          {blackoutDates.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 transition-colors duration-300 dark:border-slate-800/50">
              <p className="text-xs text-gray-500 mb-2 transition-colors duration-300 dark:text-slate-400" style={{ fontWeight: 500 }}>Tanggal yang diblokir ({blackoutDates.length}):</p>
              <div className="flex flex-wrap gap-1">
                {[...blackoutDates].sort().map(date => (
                  <button key={date} onClick={() => toggleBlackout(date)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 hover:bg-red-100 dark:hover:bg-red-500/40 transition-all duration-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                    {date}<span className="text-red-400">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-2xl hover:bg-[#0F2144] disabled:opacity-50 transition-all shadow-md">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menerapkan...</> : "Terapkan Kebijakan"}
        </button>
      </div>

      {/* Blackout Reason Modal */}
      {blackoutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 transition-colors dark:bg-red-500/20 dark:text-red-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 transition-colors dark:text-slate-100">Tutup Tanggal {blackoutModal.date}</h3>
                  <p className="text-xs text-slate-500 transition-colors dark:text-slate-400">Masukkan alasan penutupan global (akan dikirim ke user)</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider transition-colors dark:text-slate-300">Alasan Penutupan</label>
                  <textarea
                    value={blackoutModal.reason}
                    onChange={(e) => setBlackoutModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Contoh: Libur Nasional / Maintenance Gedung"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    rows={3}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 transition-colors dark:bg-slate-900 dark:border-slate-800">
              <button 
                onClick={() => setBlackoutModal({ isOpen: false, date: "", reason: "" })}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmBlackout}
                disabled={!blackoutModal.reason.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Terapkan Penutupan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
