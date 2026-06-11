import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminDashboard } from '@/app/components/admin/AdminDashboard';
import { statsService, userService } from '@/app/services/index';

vi.mock('@/app/services/index', () => ({
  statsService: { admin: vi.fn() },
  userService: { list: vi.fn() }
}));

describe('AdminDashboard Component (Skenario 4.7 & 4.8)', () => {
  beforeEach(() => {
    vi.mocked(userService.list).mockResolvedValue({
      data: [
        { id: 'admin-rapat-id', name: 'Admin Rapat 1', rawRole: 'ADMIN_RAPAT' },
        { id: 'admin-kerja-id', name: 'Admin Kerja 1', rawRole: 'ADMIN_KERJA' },
        { id: 'admin-gabungan-id', name: 'Admin Gabung 1', rawRole: 'ADMIN' },
      ]
    });
  });

  it('Skenario 4.7: renders only Meeting Room stats for ADMIN_RAPAT', async () => {
    vi.mocked(statsService.admin).mockResolvedValue({ success: true, data: { rawRole: 'ADMIN_RAPAT' } });
    render(<AdminDashboard onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Statistik Ruang Rapat')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Statistik Ruang Kerja')).not.toBeInTheDocument();
  });

  it('Skenario 4.7: renders only Workspace stats for ADMIN_KERJA', async () => {
    vi.mocked(statsService.admin).mockResolvedValue({ success: true, data: { rawRole: 'ADMIN_KERJA' } });
    render(<AdminDashboard onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Statistik Ruang Kerja')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Statistik Ruang Rapat')).not.toBeInTheDocument();
  });

  it('Skenario 4.7: renders both stats for ADMIN (Gabungan)', async () => {
    vi.mocked(statsService.admin).mockResolvedValue({ success: true, data: { rawRole: 'ADMIN' } });
    render(<AdminDashboard onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Statistik Ruang Rapat')).toBeInTheDocument();
      expect(screen.getByText('Statistik Ruang Kerja')).toBeInTheDocument();
    });
  });

  it('Skenario 4.8: filters data and updates UI dynamically for SUPERADMIN', async () => {
    vi.mocked(statsService.admin).mockImplementation((filter) => {
      if (filter === 'admin-kerja-id') return Promise.resolve({ success: true, data: { rawRole: 'ADMIN_KERJA' } });
      return Promise.resolve({ success: true, data: { rawRole: 'SUPERADMIN' } });
    });
    render(<AdminDashboard onNavigate={vi.fn()} isSuperAdmin={true} />);
    
    // Initially superadmin sees both
    await waitFor(() => {
      expect(screen.getByText('Statistik Ruang Rapat')).toBeInTheDocument();
      expect(screen.getByText('Statistik Ruang Kerja')).toBeInTheDocument();
      expect(screen.getByText('Admin Kerja 1')).toBeInTheDocument(); // from dropdown
    });

    // Skenario 4.8: Select Admin Kerja
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'admin-kerja-id' } });

    // The UI should dynamically re-render to ONLY show Workspace Stats
    await waitFor(() => {
      expect(screen.getByText('Statistik Ruang Kerja')).toBeInTheDocument();
      expect(screen.queryByText('Statistik Ruang Rapat')).not.toBeInTheDocument();
    });
  });
});
