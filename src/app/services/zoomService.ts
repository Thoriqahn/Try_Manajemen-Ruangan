import { api } from './apiClient';

export interface ZoomConfig {
  client_id: string;
  client_secret: string;
  account_id: string;
}

export interface ZoomAccount {
  id: string;
  email: string;
  label?: string;
  is_active: boolean;
  license_type?: string;
  created_at?: string;
}

export interface ZoomConnectionTest {
  success: boolean;
  message: string;
  user_email?: string;
  license?: string;
}

export const zoomService = {
  // Config
  async getConfig() {
    return api.get<ZoomConfig>('/zoom/config');
  },

  async saveConfig(data: ZoomConfig) {
    return api.put<{ success: boolean }>('/zoom/config', data);
  },

  async testConnection() {
    return api.post<ZoomConnectionTest>('/zoom/test-connection');
  },

  // Accounts pool
  async listAccounts() {
    return api.get<ZoomAccount[]>('/zoom/accounts');
  },

  async addAccount(email: string, label?: string) {
    return api.post<ZoomAccount>('/zoom/accounts', { email, label });
  },

  async removeAccount(id: string) {
    return api.delete(`/zoom/accounts/${id}`);
  },

  async verifyAccount(id: string) {
    return api.post<{ success: boolean; license_type?: string; message?: string }>(`/zoom/accounts/${id}/verify`);
  },
};
