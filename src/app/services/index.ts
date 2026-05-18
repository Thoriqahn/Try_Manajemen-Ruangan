import { api } from './apiClient';

export const buildingService = {
  async list() {
    return api.get('/buildings');
  },
  async create(data: { name: string; address?: string; lat?: string; lng?: string; image_url?: string; total_floors?: number }) {
    return api.post('/buildings', data);
  },
  async update(id: string, data: { name: string; address?: string; lat?: string; lng?: string; image_url?: string; total_floors?: number }) {
    return api.put(`/buildings/${id}`, data);
  },
  async delete(id: string) {
    return api.delete(`/buildings/${id}`);
  },
  async listFloors(buildingId: string) {
    return api.get(`/buildings/${buildingId}/floors`);
  },
  async createFloor(buildingId: string, data: { name: string; level?: number }) {
    return api.post(`/buildings/${buildingId}/floors`, data);
  },
};

export const userService = {
  async list(filters?: { role?: string; status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    return api.get(`/users?${params}`);
  },
  async get(id: string) { return api.get(`/users/${id}`); },
  async updateRole(id: string, role: string) { return api.put(`/users/${id}/role`, { role }); },
  async updateStatus(id: string, status: string) { return api.put(`/users/${id}/status`, { status }); },
  async updateRoomAssignment(id: string, roomIds: string[]) { return api.put(`/users/${id}/room-assignment`, { roomIds }); },
};

export const policyService = {
  async get() { return api.get('/policy'); },
  async update(data: { max_duration_hours?: number; max_days_ahead?: number }) { return api.put('/policy', data); },
  async addBlackout(date: string, reason?: string) { return api.post('/policy/blackout', { date, reason }); },
  async removeBlackout(date: string) { return api.delete(`/policy/blackout/${date}`); },
};

export const tokenService = {
  async list() { return api.get('/tokens'); },
  async generate(name: string, access_level: 'read' | 'read-write') { return api.post('/tokens', { name, access_level }); },
  async revoke(id: string) { return api.delete(`/tokens/${id}`); },
  async getLogs() { return api.get('/tokens/logs'); },
};

export const auditService = {
  async list(filters?: { action?: string; actor?: string; search?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.append(k, String(v)); });
    return api.get(`/audit?${params}`);
  },
};

export const statsService = {
  async admin(adminId?: string) {
    const params = adminId ? `?admin_id=${adminId}` : '';
    return api.get(`/stats/admin${params}`);
  },
  async global() { return api.get('/stats/global'); },
};
