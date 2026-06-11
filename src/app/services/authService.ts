import { api, TokenStore, UserStore } from './apiClient';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }
export interface User { 
  id: string; 
  name: string; 
  email: string; 
  role: string; 
  rawRole?: string;
  status: string; 
  position?: string;
  work_unit?: string;
  organization_unit?: string;
  nip?: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const res = await api.post('/auth/login', payload);
    if (res.success && res.accessToken) {
      TokenStore.set(res.accessToken, res.refreshToken);
      UserStore.set(res.user);
    }
    return res;
  },

  async register(payload: RegisterPayload) {
    return api.post('/auth/register', payload);
  },

  async verifyOtp(userId: string, otp: string) {
    const res = await api.post('/auth/verify-otp', { userId, otp });
    if (res.success && res.accessToken) {
      TokenStore.set(res.accessToken, res.refreshToken);
      UserStore.set(res.user);
    }
    return res;
  },

  async resendOtp(userId: string) {
    return api.post('/auth/resend-otp', { userId });
  },

  async forgotPassword(email: string) {
    return api.post('/auth/forgot-password', { email });
  },

  async resetPassword(userId: string, otp: string, newPassword: string) {
    return api.post('/auth/reset-password', { userId, otp, newPassword });
  },

  async logout() {
    const refreshToken = TokenStore.getRefresh();
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    TokenStore.clear();
    UserStore.clear();
  },

  async me() {
    return api.get('/auth/me');
  },

  getCurrentUser(): User | null {
    return UserStore.get();
  },

  isAuthenticated(): boolean {
    return !!TokenStore.get();
  },
};
