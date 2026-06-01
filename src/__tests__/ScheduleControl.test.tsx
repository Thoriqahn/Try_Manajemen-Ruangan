import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleControl } from '../app/components/admin/ScheduleControl';
import { bookingService } from '../app/services/bookingService';
import { generateAttendancePDF } from '../app/utils/pdfExport';
import { toast } from 'sonner';

// Mock dependensi
vi.mock('../app/services/bookingService', () => ({
  bookingService: {
    list: vi.fn(),
    getAttendees: vi.fn(),
    forceCancel: vi.fn(),
    endBooking: vi.fn()
  }
}));

vi.mock('../app/utils/pdfExport', () => ({
  generateAttendancePDF: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockCompletedBooking = {
  id: 'b-123',
  room_name: 'Ruang Rapat Utama',
  agenda: 'Rapat Evaluasi Tahunan',
  date: '2023-12-01',
  start_time: '10:00',
  end_time: '12:00',
  status: 'completed',
  meeting_type: 'offline'
};

const mockAttendees = [
  { id: 'a-1', user_name: 'Budi Santoso', status: 'attending', check_in_time: '09:55' },
  { id: 'a-2', guest_name: 'John Doe', is_guest_attendance: true, status: 'attending', check_in_time: '09:50' }
];

describe('ScheduleControl (Admin & Superadmin Dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render PDF download button for completed bookings and trigger PDF generation', async () => {
    // Setup mock responses
    (bookingService.list as any).mockResolvedValue({
      success: true,
      data: [mockCompletedBooking]
    });
    
    (bookingService.getAttendees as any).mockResolvedValue({
      success: true,
      data: mockAttendees
    });

    // Render the component
    render(<ScheduleControl />);

    // Wait for the booking to be displayed
    await waitFor(() => {
      expect(screen.getByText('Rapat Evaluasi Tahunan')).toBeInTheDocument();
    });

    // Find the 'Cetak PDF Presensi' button
    const pdfButton = screen.getByText('Cetak PDF Presensi');
    expect(pdfButton).toBeInTheDocument();

    // Click the button
    fireEvent.click(pdfButton);

    // Verify it fetches attendees and generates PDF
    await waitFor(() => {
      expect(bookingService.getAttendees).toHaveBeenCalledWith('b-123');
    });

    await waitFor(() => {
      expect(generateAttendancePDF).toHaveBeenCalledWith(
        'b-123',
        'Ruang Rapat Utama',
        'Rapat Evaluasi Tahunan',
        '2023-12-01',
        '10:00 - 12:00',
        mockAttendees
      );
      expect(toast.success).toHaveBeenCalledWith('PDF berhasil diunduh');
    });
  });

  it('should show an error toast if attendee list is empty', async () => {
    (bookingService.list as any).mockResolvedValue({ success: true, data: [mockCompletedBooking] });
    
    // Return empty attendees
    (bookingService.getAttendees as any).mockResolvedValue({ success: true, data: [] });

    render(<ScheduleControl />);

    await waitFor(() => {
      expect(screen.getByText('Rapat Evaluasi Tahunan')).toBeInTheDocument();
    });

    const pdfButton = screen.getByText('Cetak PDF Presensi');
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Belum ada daftar hadir untuk jadwal ini.');
      expect(generateAttendancePDF).not.toHaveBeenCalled();
    });
  });
});
