import { api } from './apiClient';

export interface DeskNode {
  desk_id: string;
  status: 'VACANT' | 'OCCUPIED' | 'DISABLED';
  name: string | null;
  avatar_url: string | null;
}

export interface WorkspaceLayoutResponse {
  success: boolean;
  room_name: string;
  desks: DeskNode[];
}

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

export const workspaceService = {
  async getLayout(roomId: string) {
    return api.get<WorkspaceLayoutResponse>(`/v1/workspaces/${roomId}/layout`);
  },

  async submitRequest(roomId: string, deskId: string) {
    return api.post('/v1/workspaces/assignments/request', { room_id: roomId, desk_id: deskId });
  },

  async relocate(currentDeskId: string, targetDeskId: string, rationale: string) {
    return api.post('/v1/workspaces/assignments/relocate', {
      current_desk_id: currentDeskId,
      target_desk_id: targetDeskId,
      rationale
    });
  },

  async listRequests() {
    return api.get<SeatingRequest[]>('/v1/workspaces/assignments/requests');
  },

  async approveRequest(id: string) {
    return api.post(`/v1/workspaces/assignments/requests/${id}/approve`);
  },

  async rejectRequest(id: string, rationale?: string) {
    return api.post(`/v1/workspaces/assignments/requests/${id}/reject`, { rationale });
  },

  async getMySeating() {
    return api.get<MySeatingResponse>('/v1/workspaces/assignments/my-desk');
  }
};

export interface AssignedDesk {
  desk_id: string;
  status: string;
  room_id: string;
  room_name: string;
  floor_name: string;
  building_name: string;
}

export interface PendingRequest {
  request_id: string;
  room_id: string;
  desk_id: string;
  status: string;
  created_at: string;
  room_name: string;
  floor_name: string;
  building_name: string;
}

export interface MySeatingResponse {
  success: boolean;
  data: {
    assigned_desk: AssignedDesk | null;
    pending_request: PendingRequest | null;
  };
}

