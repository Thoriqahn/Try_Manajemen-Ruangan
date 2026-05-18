import { api } from './apiClient';

export interface Room {
  id: string;
  name: string;
  building_id: string;
  floor_id: string;
  admin_id?: string;
  description?: string;
  status: 'active' | 'inactive';
  approval_type: 'instant' | 'manual';
  restrict_hours: number;
  hours_start?: string;
  hours_end?: string;
  image_url?: string;
  building_name?: string;
  floor_name?: string;
  admin_name?: string;
  layouts?: { id: string; layout_type: string; capacity: number; photo_url?: string }[];
  facilities?: { id: string; facility_type: string; quantity: number }[];
}

export interface RoomFilter {
  building_id?: string;
  floor_id?: string;
  status?: string;
  search?: string;
  approval_type?: string;
}

export const roomService = {
  async list(filters?: RoomFilter) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    }
    return api.get<Room[]>(`/rooms?${params}`);
  },

  async get(id: string) {
    return api.get<Room>(`/rooms/${id}`);
  },

  async create(data: any) {
    return api.post<Room>('/rooms', data);
  },

  async update(id: string, data: any) {
    return api.put<Room>(`/rooms/${id}`, data);
  },

  async delete(id: string, force = false) {
    return api.delete(`/rooms/${id}${force ? '?force=true' : ''}`);
  },

  async getAvailability(id: string, week?: string) {
    const params = week ? `?week=${week}` : '';
    return api.get(`/rooms/${id}/availability${params}`);
  },

  async uploadPhoto(id: string, file: File) {
    const form = new FormData();
    form.append('photo', file);
    return api.upload(`/rooms/${id}/upload`, form);
  },
};
