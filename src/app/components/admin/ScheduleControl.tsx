import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Calendar, MapPin, Clock, Users, RefreshCw, FileText, X } from "lucide-react";
import { bookingService, Booking } from "../../services/bookingService";
import { TokenStore } from "../../services/apiClient";

export function ScheduleControl({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceCancelModal, setForceCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedBookingView, setSelectedBookingView] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingService.list({ status: "confirmed,ongoing", limit: 50, admin_id: selectedAdminFilter || undefined, managed_only: "true" });
      setBookings(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      import("../../services/index").then(({ userService }) => {
        userService.list({ role: "admin" }).then(res => setAdminList(res.data || []));
      });
    }
  }, [isSuperAdmin]);

  useEffect(() => { load(); }, [selectedAdminFilter]);

  const handleForceCancel = async () => {
    if (confirmStep === 1) {
      setConfirmStep(2);
      return;
    }
    
    if (!forceCancelModal) return;
    
    setSubmitting(true);
    try {
      await bookingService.forceCancel(forceCancelModal, cancelReason);
      setForceCancelModal(null);
      setCancelReason("");
      setConfirmStep(1);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "Gagal membatalkan jadwal");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-blue-100 dark:bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-400",
    ongoing: "bg-green-100 dark:bg-green-500/20 dark:bg-green-500/30 text-green-700 dark:text-green-400",
  };

  const statusLabel: Record<string, string> = {
    confirmed: "Dikonfirmasi",
    ongoing: "Berlangsung",
  };

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Jadwal Aktif</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 transition-colors dark:text-slate-400">Pantau dan kelola jadwal booking aktif di area tugas Anda</p>
        </div>
        <button onClick={load} className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 bg-white/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-95 border border-slate-200/50 backdrop-blur-md dark:bg-slate-900 dark:text-indigo-400 dark:border-slate-700/50" title="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        {isSuperAdmin && (
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-slate-200 transition-colors dark:bg-slate-800/50 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2 transition-colors dark:text-slate-400">Filter Admin:</span>
            <select
              value={selectedAdminFilter}
              onChange={(e) => setSelectedAdminFilter(e.target.value)}
              className="px-4 py-2 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none focus:ring-0 min-w-[200px] transition-colors dark:text-slate-200"
            >
              <option value="" className="bg-white transition-colors duration-300 dark:bg-slate-800">Semua Admin Ruangan</option>
              {adminList.map((admin) => (
                <option key={admin.id} value={admin.id} className="bg-white transition-colors duration-300 dark:bg-slate-800">{admin.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200 rounded-2xl p-5 flex items-start gap-4 transition-colors shadow-sm dark:bg-amber-500/30 dark:border-amber-500/20">
        <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0 shadow-inner transition-colors dark:bg-amber-500/30">
          <AlertTriangle size={20} className="text-amber-600 transition-colors duration-300 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 tracking-tight transition-colors dark:text-amber-400">Pembatalan Paksa</p>
          <p className="text-xs font-medium text-amber-700 mt-1 leading-relaxed transition-colors dark:text-amber-300/70">Gunakan fitur pembatalan paksa hanya untuk situasi darurat. Pemohon akan mendapat notifikasi beserta alasan pembatalan.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin transition-colors dark:border-t-emerald-500" /></div>
      ) : (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl py-24 text-center shadow-sm transition-colors dark:bg-slate-900/90 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors dark:bg-slate-800"><Calendar size={24} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /></div>
              <p className="text-slate-800 font-bold text-lg mb-1 transition-colors dark:text-slate-100">Tidak ada jadwal aktif</p>
              <p className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">Belum ada booking yang sedang berlangsung atau akan datang.</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.id} onClick={() => setSelectedBookingView(booking)} className="bg-white/90 backdrop-blur-md border border-slate-200 p-5 rounded-2xl hover:border-indigo-300 dark:hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group dark:bg-slate-900/90 dark:border-indigo-500/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${booking.status === "ongoing" ? "bg-emerald-100/90 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-indigo-100/90 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"}`}>
                        {booking.status === "ongoing" && <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse transition-colors duration-300 dark:bg-emerald-400" />}
                        {statusLabel[booking.status] || booking.status}
                      </span>
                    </div>
                    <h4 className="text-slate-800 font-bold text-base transition-colors group-hover:text-indigo-600 dark:group-hover:text-emerald-400 dark:text-indigo-400">{booking.agenda}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2.5 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">
                      <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span className="truncate">{booking.room_name}</span></div>
                      <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{booking.date}</span></div>
                      <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{booking.start_time} – {booking.end_time}</span></div>
                      <div className="flex items-center gap-2"><Users size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{booking.user_name}</span></div>
                      {booking.participants && <div className="flex items-center gap-2"><Users size={14} className="text-slate-400 transition-colors duration-300 dark:text-slate-500" /><span>{booking.participants} peserta</span></div>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setForceCancelModal(booking.id); setConfirmStep(1); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all flex-shrink-0 shadow-sm active:scale-95 dark:bg-rose-500/20 dark:hover:bg-rose-500 dark:hover:text-white dark:text-rose-400">
                    <Trash2 size={16} /> Batalkan Paksa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {forceCancelModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 transition-colors dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shadow-inner transition-colors dark:bg-rose-500/30"><AlertTriangle size={24} className="text-rose-500 transition-colors duration-300 dark:text-rose-400" /></div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{confirmStep === 1 ? "Pembatalan Paksa" : "Konfirmasi Akhir"}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 transition-colors dark:text-slate-500">Langkah {confirmStep} dari 2</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {confirmStep === 1 ? (
                <>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed transition-colors dark:text-slate-400">Tindakan ini akan membatalkan booking, membebaskan slot, dan mengirim notifikasi email ke pemesan.</p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors dark:text-slate-300">Alasan Darurat <span className="text-rose-500 transition-colors duration-300 dark:text-rose-400">*</span></label>
                    <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Jelaskan alasan pembatalan paksa (min. 10 karakter)..." rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-rose-400 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/10 bg-slate-50 text-slate-800 resize-none transition-all shadow-sm dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-700" />
                    <p className={`text-xs mt-2 font-bold text-right transition-colors ${cancelReason.length >= 10 ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>{cancelReason.length}/10 min</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner transition-colors dark:bg-rose-500/30"><AlertTriangle size={32} className="text-rose-500 transition-colors duration-300 dark:text-rose-400" /></div>
                  <p className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Apakah Anda benar-benar yakin?</p>
                  <p className="text-sm font-medium text-slate-500 mt-2 transition-colors dark:text-slate-400">Tindakan ini tidak dapat diurungkan.</p>
                  <div className="mt-5 p-4 bg-slate-50 rounded-xl text-left border border-slate-100 transition-colors shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors dark:text-slate-500">Alasan:</p>
                    <p className="text-sm font-medium text-slate-700 italic transition-colors dark:text-slate-300">"{cancelReason}"</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 transition-colors dark:bg-slate-800/30 dark:border-slate-800">
              <button onClick={() => { setForceCancelModal(null); setCancelReason(""); setConfirmStep(1); }}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Batal</button>
              <button onClick={handleForceCancel} disabled={(confirmStep === 1 && cancelReason.length < 10) || submitting}
                className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-rose-500/20 active:scale-95 dark:bg-rose-600">
                {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memproses...</> : confirmStep === 1 ? "Lanjutkan" : "Batalkan Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Booking */}
      {selectedBookingView && (() => {
        const getNormalizedFacilities = (facs: any) => {
          if (!facs) return {};
          if (typeof facs === 'string') { try { facs = JSON.parse(facs); } catch(e) { return {}; } }
          if (Array.isArray(facs)) {
            const obj: Record<string, number> = {};
            for (const f of facs) { obj[f.facility_type || f.type || f.name] = f.quantity || f.qty || 0; }
            return obj;
          }
          return facs;
        };
        const getNormalizedSnacks = (snacks: any) => {
          if (!snacks) return [];
          if (typeof snacks === 'string') { try { return JSON.parse(snacks); } catch(e) { return []; } }
          if (Array.isArray(snacks)) return snacks;
          return [];
        };
        const normalizedFacilities = getNormalizedFacilities(selectedBookingView.facilities);
        const normalizedSnacks = getNormalizedSnacks(selectedBookingView.snacks);

        return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200" onClick={() => setSelectedBookingView(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 transition-colors flex flex-col max-h-[90vh] dark:bg-slate-900 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 transition-colors z-10 sticky top-0 dark:bg-slate-800/80 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">Detail Peminjaman Ruangan</h3>
              <button onClick={() => setSelectedBookingView(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors dark:text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight transition-colors dark:text-slate-100">{selectedBookingView.agenda}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${selectedBookingView.status === "ongoing" ? "bg-emerald-100/90 dark:bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-indigo-100/90 dark:bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"}`}>
                    {selectedBookingView.status === "ongoing" && <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse transition-colors duration-300 dark:bg-emerald-400" />}
                    {statusLabel[selectedBookingView.status] || selectedBookingView.status}
                  </span>
                  <span className="text-sm font-medium text-slate-500 transition-colors dark:text-slate-400">• {selectedBookingView.user_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 transition-colors shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest transition-colors dark:text-slate-500">Informasi Waktu & Tempat</h4>
                  <div className="space-y-3 text-sm font-medium text-slate-700 transition-colors dark:text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-100 rounded-lg transition-colors duration-300 dark:bg-indigo-500/30"><MapPin size={16} className="text-indigo-600 transition-colors duration-300 dark:text-indigo-400" /></div>
                      <span className="font-bold">{selectedBookingView.room_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-100 rounded-lg transition-colors duration-300 dark:bg-indigo-500/30"><Calendar size={16} className="text-indigo-600 transition-colors duration-300 dark:text-indigo-400" /></div>
                      <span>{selectedBookingView.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-100 rounded-lg transition-colors duration-300 dark:bg-indigo-500/30"><Clock size={16} className="text-indigo-600 transition-colors duration-300 dark:text-indigo-400" /></div>
                      <span>{selectedBookingView.start_time} - {selectedBookingView.end_time}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 transition-colors shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest transition-colors dark:text-slate-500">Kebutuhan Rapat</h4>
                  <div className="space-y-3 text-sm font-medium text-slate-700 transition-colors dark:text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-100 rounded-lg transition-colors duration-300 dark:bg-emerald-500/30"><Users size={16} className="text-emerald-600 transition-colors duration-300 dark:text-emerald-400" /></div>
                      <span className="font-bold">{selectedBookingView.participants || 0} Peserta</span>
                    </div>
                    <div className="flex items-center gap-3 pl-1">
                      <span className="text-emerald-500 font-bold transition-colors duration-300 dark:text-emerald-400">•</span>
                      <span>Layout: <span className="font-bold">{selectedBookingView.layout_type || "Standard"}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {normalizedFacilities && Object.keys(normalizedFacilities).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Tambahan Fasilitas</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(normalizedFacilities).map(([k, v]) => {
                      const formatted = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <span key={k} className="px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 shadow-sm transition-colors dark:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20">
                          {formatted} <span className="text-indigo-600 bg-white/80 px-1.5 py-0.5 rounded-md ml-1 text-xs transition-colors duration-300 dark:bg-emerald-500/30 dark:text-emerald-300/70">x{v as number}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FEATURE: Pesanan Konsumsi (Snacks) */}
              {normalizedSnacks && normalizedSnacks.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Pesanan Konsumsi</h4>
                  <div className="flex flex-col gap-2.5">
                    {normalizedSnacks.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-amber-50/80 border border-amber-100 rounded-xl shadow-sm transition-colors dark:bg-amber-500/30 dark:border-amber-500/20">
                        <span className="text-sm font-bold text-amber-900 transition-colors duration-300 dark:text-amber-400">{s.type === 'snack' ? 'Snack Box' : s.type === 'meal' ? 'Makan Siang' : 'Kopi/Teh'}</span>
                        <span className="text-xs px-2.5 py-1 bg-white/90 rounded-md text-amber-700 font-bold shadow-sm transition-colors duration-300 dark:bg-amber-500/30 dark:text-amber-300">{s.quantity} porsi</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBookingView.surat_terkait && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Dokumen Surat Terkait</h4>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-t-xl transition-colors dark:bg-slate-800/50 dark:border-slate-700">
                    <div className="p-1.5 bg-indigo-100 rounded-lg transition-colors duration-300 dark:bg-indigo-500/30"><FileText size={16} className="text-indigo-600 transition-colors duration-300 dark:text-indigo-400" /></div>
                    <span className="text-sm font-bold text-slate-700 truncate transition-colors duration-300 dark:text-slate-300">{selectedBookingView.surat_terkait}</span>
                  </div>
                  <div className="border border-t-0 border-slate-200 rounded-b-xl overflow-hidden h-[400px] transition-colors dark:border-slate-700">
                    <iframe 
                      src={selectedBookingView.surat_terkait.endsWith('.pdf') ? selectedBookingView.surat_terkait : '/dummy-surat.pdf'} 
                      className="w-full h-full bg-white transition-colors duration-300 dark:bg-slate-900"
                      title="PDF Reader"
                    />
                  </div>
                </div>
              )}

              {selectedBookingView.notes && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 transition-colors dark:text-slate-500 dark:border-slate-800">Catatan Tambahan</h4>
                  <div className="bg-amber-50/50 border-l-4 border-amber-400 p-4 rounded-r-xl transition-colors dark:bg-amber-500/5 dark:border-amber-500">
                    <p className="text-sm font-medium text-slate-700 italic transition-colors duration-300 dark:text-slate-300">
                      "{selectedBookingView.notes}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 transition-colors z-10 sticky bottom-0 dark:bg-slate-800/30 dark:border-slate-800">
              <button 
                onClick={() => setSelectedBookingView(null)} 
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                Tutup
              </button>
              <button 
                onClick={() => {
                  setForceCancelModal(selectedBookingView.id);
                  setConfirmStep(1);
                  setSelectedBookingView(null);
                }}
                className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 shadow-sm active:scale-95 dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white"
              >
                <Trash2 size={16} /> Batalkan Paksa
              </button>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}
