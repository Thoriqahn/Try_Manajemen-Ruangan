import { api } from './apiClient';

export type MeetingType = 'offline' | 'online' | 'hybrid';

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
  // New fields
  surat_terkait?: string;
  meeting_type?: MeetingType;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_passcode?: string;
  zoom_host_email?: string;
}

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

export interface BookingFilter {
  status?: string;
  room_id?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  limit?: number;
  admin_id?: string;
}

export interface Attendee {
  id: string;
  user_id: string;
  user_name: string;
  scanned_at: string;
}

export const bookingService = {
  async list(filters?: BookingFilter) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    }
    return api.get<Booking[]>(`/bookings?${params}`);
  },

  async get(id: string) {
    return api.get<Booking>(`/bookings/${id}`);
  },

  async create(data: CreateBookingPayload & Record<string, any>) {
    return api.post<Booking>('/bookings', data);
  },

  async update(id: string, data: Partial<CreateBookingPayload>) {
    return api.put<Booking>(`/bookings/${id}`, data);
  },

  async cancel(id: string, reason?: string) {
    return api.delete(`/bookings/${id}`, { reason });
  },

  async approve(id: string) {
    return api.post(`/bookings/${id}/approve`);
  },

  async reject(id: string, reason: string) {
    return api.post(`/bookings/${id}/reject`, { reason });
  },

  async forceCancel(id: string, reason: string) {
    return api.post(`/bookings/${id}/force-cancel`, { reason });
  },

  async checkIn(roomId: string | undefined, scannedQrToken: string, simulateUserId?: string) {
    return api.post('/bookings/check-in', { room_id: roomId, scanned_qr_token: scannedQrToken, simulate_user_id: simulateUserId });
  },

  async getAttendees(bookingId: string) {
    return api.get<Attendee[]>(`/bookings/${bookingId}/attendees`);
  },

  async logZoomJoin(bookingId: string) {
    return api.post(`/bookings/${bookingId}/zoom-join`);
  },

  async logZoomLeave(bookingId: string) {
    return api.post(`/bookings/${bookingId}/zoom-leave`);
  },

  async getMyAttendances() {
    return api.get<Booking[]>('/bookings/attendances/mine');
  },
};

