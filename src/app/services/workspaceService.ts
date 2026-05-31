/**
 * @fileoverview Workspace Service — Manajemen Ruang Kerja (Seating Hoteling)
 *
 * Fitur ini memungkinkan pengguna untuk memilih meja kerja di ruangan WORKSPACE.
 * Alur: User pilih meja → submit request → Admin approve/reject → Meja ditandai OCCUPIED.
 */
import { api } from './apiClient';

/** Representasi satu meja dalam layout ruang kerja */
export interface DeskNode {
  desk_id: string;
  status: 'VACANT' | 'OCCUPIED' | 'DISABLED';
  name: string | null;
  avatar_url: string | null;
}

/** Response layout lengkap ruang kerja */
export interface WorkspaceLayoutResponse {
  success: boolean;
  room_name: string;
  room_photos?: string[];
  facilities?: { facility_type: string, quantity: number }[];
  desks: DeskNode[];
}

/** Permintaan penempatan meja dari seorang pengguna */
export interface SeatingRequest {
  id: string;
  room_id: string;
  desk_id: string;
  user_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  user_name: string;
  user_email: string;
  room_name: string;
  floor_name: string;
  building_name: string;
}

/** Informasi meja yang sudah ditetapkan ke pengguna */
export interface AssignedDesk {
  desk_id: string;
  status: string;
  room_id: string;
  room_name: string;
  floor_name: string;
  building_name: string;
  room_photo?: string;
}

/** Permintaan yang masih pending milik pengguna */
export interface PendingRequest {
  request_id: string;
  room_id: string;
  desk_id: string;
  status: string;
  created_at: string;
  room_name: string;
  floor_name: string;
  building_name: string;
  room_photo?: string;
}

/** Response GET /v1/workspaces/assignments/my-desk */
export interface MySeatingResponse {
  success: boolean;
  data: {
    assigned_desk: AssignedDesk | null;
    pending_request: PendingRequest | null;
    resolved_request: (PendingRequest & { rationale?: string }) | null;
  };
}

export const workspaceService = {
  /** Ambil layout ruang kerja beserta status setiap meja. */
  async getLayout(roomId: string) {
    return api.get<WorkspaceLayoutResponse>(`/v1/workspaces/${roomId}/layout`);
  },

  /** Ajukan permintaan penempatan meja. Hanya 1 request aktif yang diizinkan per waktu. */
  async submitRequest(roomId: string, deskId: string) {
    return api.post('/v1/workspaces/assignments/request', { room_id: roomId, desk_id: deskId });
  },

  /**
   * Ajukan relokasi meja — pindah dari meja yang sudah disetujui ke meja lain.
   * @param rationale - Alasan relokasi (min 10 karakter)
   */
  async relocate(currentDeskId: string, targetDeskId: string, rationale: string) {
    return api.post('/v1/workspaces/assignments/relocate', {
      current_desk_id: currentDeskId,
      target_desk_id: targetDeskId,
      rationale
    });
  },

  /** Ambil daftar semua permintaan penempatan (admin). Filter by admin_id jika superadmin. */
  async listRequests(admin_id?: string) {
    const params = new URLSearchParams();
    if (admin_id) params.append('admin_id', admin_id);
    return api.get<SeatingRequest[]>(`/v1/workspaces/assignments/requests?${params}`);
  },

  /** Setujui permintaan penempatan meja — meja berubah status OCCUPIED. */
  async approveRequest(id: string) {
    return api.post(`/v1/workspaces/assignments/requests/${id}/approve`);
  },

  /** Tolak permintaan penempatan meja dengan alasan opsional. */
  async rejectRequest(id: string, rationale?: string) {
    return api.post(`/v1/workspaces/assignments/requests/${id}/reject`, { rationale });
  },

  /** Ambil status penempatan meja pengguna yang sedang login (assigned/pending/resolved). */
  async getMySeating() {
    return api.get<MySeatingResponse>('/v1/workspaces/assignments/my-desk');
  }
};
