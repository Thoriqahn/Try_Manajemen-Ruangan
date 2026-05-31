/**
 * @fileoverview Zoom Service — Manajemen Integrasi Zoom
 * Mengelola konfigurasi OAuth Server-to-Server, pool akun Zoom,
 * dan verifikasi lisensi akun.
 */
import { api } from './apiClient';

/** Kredensial Zoom Server-to-Server OAuth */
export interface ZoomConfig {
  client_id: string;
  client_secret: string;
  account_id: string;
}

/** Akun Zoom dalam pool yang tersedia untuk dijadikan host meeting */
export interface ZoomAccount {
  id: string;
  email: string;
  label?: string;
  is_active: boolean;
  license_type?: string;
  created_at?: string;
}

/** Hasil test koneksi ke Zoom API */
export interface ZoomConnectionTest {
  success: boolean;
  message: string;
  user_email?: string;
  license?: string;
}

export const zoomService = {
  // ─── Konfigurasi OAuth ────────────────────────────────────────────────────

  /** Ambil konfigurasi Zoom aktif (tanpa client_secret). */
  async getConfig() {
    return api.get<ZoomConfig>('/zoom/config');
  },

  /**
   * Simpan/perbarui kredensial Zoom Server-to-Server OAuth.
   * Hanya superadmin yang bisa mengakses endpoint ini.
   */
  async saveConfig(data: ZoomConfig) {
    return api.put<{ success: boolean }>('/zoom/config', data);
  },

  /** Test koneksi ke Zoom API dengan kredensial yang tersimpan saat ini. */
  async testConnection() {
    return api.post<ZoomConnectionTest>('/zoom/test-connection');
  },

  // ─── Pool Akun Zoom ───────────────────────────────────────────────────────

  /** Ambil daftar semua akun Zoom yang terdaftar di pool host. */
  async listAccounts() {
    return api.get<ZoomAccount[]>('/zoom/accounts');
  },

  /**
   * Tambah akun Zoom ke pool.
   * Akun harus memiliki lisensi Zoom Pro/Business agar bisa jadi host meeting.
   */
  async addAccount(email: string, label?: string) {
    return api.post<ZoomAccount>('/zoom/accounts', { email, label });
  },

  /** Hapus akun Zoom dari pool (soft delete). */
  async removeAccount(id: string) {
    return api.delete(`/zoom/accounts/${id}`);
  },

  /**
   * Verifikasi status lisensi akun Zoom via Zoom API.
   * Update is_verified dan license_type di DB.
   */
  async verifyAccount(id: string) {
    return api.post<{ success: boolean; license_type?: string; message?: string }>(`/zoom/accounts/${id}/verify`);
  },
};
