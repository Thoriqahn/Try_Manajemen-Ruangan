import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoomManagement } from '@/app/components/admin/RoomManagement';

// Mock the services
vi.mock('../app/services/index', () => ({
  buildingService: {
    list: vi.fn().mockResolvedValue({ data: [] })
  },
  userService: {
    list: vi.fn().mockResolvedValue({ data: [] })
  }
}));

vi.mock('../app/services/roomService', () => ({
  roomService: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'room-1',
          name: 'Ruang Rapat Eksekutif',
          building_name: 'Gedung A',
          capacity: 20,
          room_type: 'physical',
          status: 'active'
        }
      ]
    }),
    delete: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('RoomManagement Component', () => {
  it('renders room list correctly', async () => {
    render(<RoomManagement />);

    // Wait for API to resolve and check if room is rendered
    await waitFor(() => {
      expect(screen.getByText('Ruang Rapat Eksekutif')).toBeInTheDocument();
    });
    expect(screen.getByText('Gedung A')).toBeInTheDocument();
  });

  it('shows confirmation dialog when toggle status is clicked', async () => {
    render(<RoomManagement />);

    // Wait for the list to render
    await waitFor(() => {
      expect(screen.getByText('Ruang Rapat Eksekutif')).toBeInTheDocument();
    });

    // Find and click the toggle status button
    const toggleButton = screen.getByTitle('Nonaktifkan');
    fireEvent.click(toggleButton);

    // Dialog should appear
    expect(await screen.findByText(/Nonaktifkan Ruangan\?/i)).toBeInTheDocument();
  });
});
