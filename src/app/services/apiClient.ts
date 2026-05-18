/**
 * Menara API Client
 * Central fetch wrapper with JWT auth, token refresh, and error handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ─── Token Storage ────────────────────────────────────────────────────────────
export const TokenStore = {
  get: () => localStorage.getItem('menara_access_token'),
  getRefresh: () => localStorage.getItem('menara_refresh_token'),
  set: (access: string, refresh: string) => {
    localStorage.setItem('menara_access_token', access);
    localStorage.setItem('menara_refresh_token', refresh);
  },
  clear: () => {
    localStorage.removeItem('menara_access_token');
    localStorage.removeItem('menara_refresh_token');
    localStorage.removeItem('menara_user');
  },
};

// ─── User Storage ─────────────────────────────────────────────────────────────
export const UserStore = {
  get: () => {
    try { return JSON.parse(localStorage.getItem('menara_user') || 'null'); } catch { return null; }
  },
  set: (user: any) => localStorage.setItem('menara_user', JSON.stringify(user)),
  clear: () => localStorage.removeItem('menara_user'),
};

// ─── Refresh token logic ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const doRefresh = async (): Promise<string | null> => {
  const refreshToken = TokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { TokenStore.clear(); return null; }
    const data = await res.json();
    TokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch { TokenStore.clear(); return null; }
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Remove Content-Type for FormData
  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (!skipAuth) {
    const token = TokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...fetchOptions, headers });

  // Handle token expiry — try refresh once
  if (response.status === 401 && !skipAuth) {
    const errData = await response.clone().json().catch(() => ({}));
    if (errData.code === 'TOKEN_EXPIRED') {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await doRefresh();
        isRefreshing = false;
        if (newToken) {
          refreshQueue.forEach(cb => cb(newToken));
          refreshQueue = [];
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, { ...fetchOptions, headers });
        } else {
          // Redirect to login
          window.dispatchEvent(new CustomEvent('menara:session-expired'));
          return { success: false, message: 'Sesi habis. Silakan login ulang.' };
        }
      } else {
        // Wait for ongoing refresh
        const newToken = await new Promise<string>((resolve) => refreshQueue.push(resolve));
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }
  }

  const data = await response.json().catch(() => ({ success: false, message: 'Server tidak merespons' }));

  if (!response.ok && !data.success) {
    throw new ApiError(data.message || 'Terjadi kesalahan', response.status, data);
  }

  return data;
}

// ─── API Error class ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ─── Convenience methods ──────────────────────────────────────────────────────
export const api = {
  get: <T = any>(url: string, opts?: RequestInit) => apiFetch<T>(url, { method: 'GET', ...opts }),
  post: <T = any>(url: string, body?: any, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: <T = any>(url: string, body?: any, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  delete: <T = any>(url: string, body?: any, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, ...opts }),
  upload: <T = any>(url: string, formData: FormData) =>
    apiFetch<T>(url, { method: 'POST', body: formData }),
};
