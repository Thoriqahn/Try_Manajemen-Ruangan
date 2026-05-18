import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Calendar, MapPin, Clock, Users, RefreshCw } from "lucide-react";
import { bookingService, Booking } from "../../services/bookingService";
import { TokenStore } from "../../services/apiClient";

export function ScheduleControl() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceCancelModal, setForceCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingService.list({ status: "confirmed,ongoing", limit: 50 });
      setBookings(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleForceCancel = async () => {
    if (confirmStep === 1) { setConfirmStep(2); return; }
    if (!forceCancelModal || cancelReason.length < 10) return;
    setSubmitting(true);
    try {
      await bookingService.forceCancel(forceCancelModal, cancelReason);
      setBookings(prev => prev.filter(b => b.id !== forceCancelModal));
    } catch (e: any) { alert(e.message || "Gagal membatalkan"); }
    setSubmitting(false);
    setForceCancelModal(null);
    setCancelReason("");
    setConfirmStep(1);
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-700",
    ongoing: "bg-green-100 text-green-700",
  };

  const statusLabel: Record<string, string> = {
    confirmed: "Dikonfirmasi",
    ongoing: "Berlangsung",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Jadwal Aktif</h2>
          <p className="text-sm text-gray-500">Pantau dan kelola jadwal booking aktif di area tugas Anda</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-800" style={{ fontWeight: 500 }}>Pembatalan Paksa</p>
          <p className="text-xs text-amber-600 mt-0.5">Gunakan fitur pembatalan paksa hanya untuk situasi darurat. Pemohon akan mendapat notifikasi beserta alasan pembatalan.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
              <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada jadwal aktif saat ini</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${statusColor[booking.status] || "bg-gray-100 text-gray-600"}`} style={{ fontWeight: 500 }}>
                        {booking.status === "ongoing" && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />}
                        {statusLabel[booking.status] || booking.status}
                      </span>
                    </div>
                    <h4 className="text-gray-800 mb-1.5" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{booking.agenda}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-400" /><span className="truncate">{booking.room_name}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /><span>{booking.date}</span></div>
                      <div className="flex items-center gap-1.5"><Clock size={12} className="text-gray-400" /><span>{booking.start_time} – {booking.end_time}</span></div>
                      <div className="flex items-center gap-1.5"><Users size={12} className="text-gray-400" /><span>{booking.user_name}</span></div>
                      {booking.participants && <div className="flex items-center gap-1.5"><Users size={12} className="text-gray-400" /><span>{booking.participants} peserta</span></div>}
                    </div>
                  </div>
                  <button onClick={() => { setForceCancelModal(booking.id); setConfirmStep(1); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex-shrink-0">
                    <Trash2 size={14} /> Batalkan Paksa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {forceCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle size={20} className="text-red-500" /></div>
                <div>
                  <h3 className="text-gray-800" style={{ fontWeight: 700 }}>{confirmStep === 1 ? "Pembatalan Paksa" : "Konfirmasi Akhir"}</h3>
                  <p className="text-xs text-gray-400">Langkah {confirmStep} dari 2</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {confirmStep === 1 ? (
                <>
                  <p className="text-sm text-gray-600">Tindakan ini akan membatalkan booking, membebaskan slot, dan mengirim notifikasi email ke pemesan.</p>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Alasan Darurat <span className="text-red-500">*</span></label>
                    <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Jelaskan alasan pembatalan paksa (min. 10 karakter)..." rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 bg-gray-50 resize-none" />
                    <p className={`text-xs mt-1 text-right ${cancelReason.length >= 10 ? "text-green-600" : "text-gray-400"}`}>{cancelReason.length}/10 min</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle size={28} className="text-red-500" /></div>
                  <p className="text-gray-700" style={{ fontWeight: 600 }}>Apakah Anda benar-benar yakin?</p>
                  <p className="text-sm text-gray-500 mt-2">Tindakan ini tidak dapat diurungkan.</p>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left">
                    <p className="text-xs text-gray-500">Alasan: <span className="text-gray-700" style={{ fontWeight: 500 }}>{cancelReason}</span></p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setForceCancelModal(null); setCancelReason(""); setConfirmStep(1); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleForceCancel} disabled={(confirmStep === 1 && cancelReason.length < 10) || submitting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : confirmStep === 1 ? "Lanjutkan →" : "Batalkan Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
