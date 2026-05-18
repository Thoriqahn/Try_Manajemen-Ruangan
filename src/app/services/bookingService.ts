import { api } from './apiClient';

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
}

export interface CreateBookingPayload {
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  agenda: string;
  participants?: number;
}

export interface BookingFilter {
  status?: string;
  room_id?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
}

export const bookingService = {
  async list(filters?: BookingFilter) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    }
    return api.get<Booking[]>(`/bookings?${params}`);
  },

  async get(id: string) {
    return api.get<Booking>(`/bookings/${id}`);
  },

  async create(data: CreateBookingPayload) {
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
};
