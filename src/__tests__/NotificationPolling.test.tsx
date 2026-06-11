import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { api } from '@/app/services/apiClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('../../services/index', () => ({
  authService: {
    logout: vi.fn(),
    getToken: vi.fn().mockReturnValue('dummy-token')
  },
  workspaceService: {
    getMySeating: vi.fn().mockResolvedValue({ data: null })
  }
}));

describe('MainLayout Component (Skenario 4.9: Notification Polling)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(api, 'get').mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Skenario 4.9: polls /notifications and renders without API prefix duplication', async () => {
    const apiGetSpy = vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
          success: true,
          data: [{ id: 1, title: 'Test Notif', message: 'Test', created_at: new Date().toISOString(), is_read: false }]
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(
      <MainLayout 
        role="user" 
        currentUser={{ name: 'Test User', email: 'test@example.com' }} 
        currentPage="dashboard" 
        onNavigate={vi.fn()} 
        onLogout={vi.fn()} 
      >
        <div>Content</div>
      </MainLayout>
    );

    // Initial render fetches notifications
    await waitFor(() => {
      expect(apiGetSpy).toHaveBeenCalledWith('/notifications');
    });

    apiGetSpy.mockClear();
    vi.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(apiGetSpy).toHaveBeenCalledWith('/notifications');
    });
    expect(apiGetSpy).not.toHaveBeenCalledWith('/api/notifications');
  });
});
