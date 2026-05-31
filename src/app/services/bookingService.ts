import { api } from './apiClient';

/** Tipe rapat yang didukung sistem */
export type MeetingType = 'offline' | 'online' | 'hybrid';

/** Data booking lengkap dari API */
export interface Booking {
  id: string;
  room_id: string;
  room_name?: string;
  building_name?: string;
  floor_name?: string;
  user_id: string;
  user_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  agenda: string;
  participants: number;
  status: 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'rejected';
  rejection_reason?: string;
  cancel_reason?: string;
  created_at?: number;
  admin_names?: string;
  // Bidang Zoom & meeting
  surat_terkait?: string;
  meeting_type?: MeetingType;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_passcode?: string;
  zoom_host_email?: string;
}

/** Payload untuk membuat atau memperbarui booking */
export interface CreateBookingPayload {
  room_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  agenda: string;
  participants?: number;
  surat_terkait?: string;
  meeting_type?: MeetingType;
}

/** Filter untuk endpoint list bookings */
export interface BookingFilter {
  status?: string;
  room_id?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  limit?: number;
  admin_id?: string;
  own_only?: string;
}

/** Data peserta rapat (dari QR scan atau presensi publik) */
export interface Attendee {
  id: string;
  user_id: string;
  user_name: string;
  email?: string;
  institution?: string;
  position?: string;
  signature?: string;
  attendance_type?: string;
  scanned_at: string;
}

export const bookingService = {
  /**
   * Ambil daftar booking dengan filter opsional.
   * @param filters - Filter query (status, room_id, date range, dll.)
   */
  async list(filters?: BookingFilter) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    }
    return api.get<Booking[]>(`/bookings?${params}`);
  },

  /**
   * Ambil detail satu booking berdasarkan ID.
   * Pengguna yang bukan pemilik bisa mengakses jika sudah check-in sebagai peserta.
   */
  async get(id: string) {
    return api.get<Booking>(`/bookings/${id}`);
  },

  /** Buat booking baru. Zoom meeting otomatis dibuat untuk tipe 'online'/'hybrid'. */
  async create(data: CreateBookingPayload & Record<string, any>) {
    return api.post<Booking>('/bookings', data);
  },

  /** Perbarui/reschedule booking yang sudah ada. */
  async update(id: string, data: Partial<CreateBookingPayload>) {
    return api.put<Booking>(`/bookings/${id}`, data);
  },

  /** Batalkan booking. Zoom meeting otomatis dihapus jika ada. */
  async cancel(id: string, reason?: string) {
    return api.delete(`/bookings/${id}`, { reason });
  },

  /** Setujui booking (admin/superadmin). */
  async approve(id: string) {
    return api.post(`/bookings/${id}/approve`);
  },

  /** Tolak booking dengan alasan penolakan (admin/superadmin). */
  async reject(id: string, reason: string) {
    return api.post(`/bookings/${id}/reject`, { reason });
  },

  /** Batalkan paksa booking yang sedang berjalan (admin/superadmin). */
  async forceCancel(id: string, reason: string) {
    return api.post(`/bookings/${id}/force-cancel`, { reason });
  },

  /**
   * Check-in / presensi dengan QR code.
   * - Pemilik booking: klaim ruangan (status → ongoing)
   * - Peserta lain: catat kehadiran (setelah klaim)
   */
  async checkIn(
    roomId: string | undefined,
    scannedQrToken: string,
    simulateUserId?: string,
    signature?: string,
    email?: string,
    institution?: string,
    position?: string
  ) {
    return api.post('/bookings/check-in', {
      room_id: roomId,
      scanned_qr_token: scannedQrToken,
      simulate_user_id: simulateUserId,
      signature,
      email,
      institution,
      position
    });
  },

  /** Ambil daftar peserta suatu booking. */
  async getAttendees(bookingId: string) {
    return api.get<Attendee[]>(`/bookings/${bookingId}/attendees`);
  },

  /** Catat log join Zoom (untuk tracking kehadiran online). */
  async logZoomJoin(bookingId: string) {
    return api.post(`/bookings/${bookingId}/zoom-join`);
  },

  /** Catat log leave Zoom. */
  async logZoomLeave(bookingId: string) {
    return api.post(`/bookings/${bookingId}/zoom-leave`);
  },

  /**
   * Ambil riwayat kehadiran user saat ini sebagai peserta (bukan pemilik booking).
   * Digunakan untuk tab "Riwayat" di halaman MyBookings.
   */
  async getMyAttendances() {
    return api.get<Booking[]>('/bookings/attendances/mine');
  },

  /**
   * Akhiri rapat lebih awal dari jadwal.
   * Hanya pemilik booking atau admin yang bisa memanggil ini.
   * end_time akan diperbarui ke waktu saat ini jika rapat berakhir lebih awal.
   */
  async endBooking(id: string) {
    return api.post(`/bookings/${id}/end`);
  },
};

// Catatan: Export daftar hadir (presensi) kini menggunakan PDF.
// Lihat: src/app/utils/pdfExport.ts → generateAttendancePDF()
