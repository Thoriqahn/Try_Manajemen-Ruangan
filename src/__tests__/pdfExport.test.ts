import { describe, it, expect, vi } from 'vitest';
import { generateAttendancePDF } from '../app/utils/pdfExport';
import { Booking } from '../app/services/bookingService';

// Mock jsPDF
const mockSplitTextToSize = vi.fn().mockImplementation((text: string) => {
  if (text.length > 50) return [text.substring(0, 50), text.substring(50)];
  return [text];
});

const mockJsPDF = {
  addImage: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  splitTextToSize: mockSplitTextToSize,
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  save: vi.fn(),
  lastAutoTable: { finalY: 100 }
};

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return mockJsPDF;
    })
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn()
}));

describe('pdfExport Utility', () => {
  it('should call splitTextToSize for long agenda and room names', () => {
    const mockBooking: Booking = {
      id: '1',
      room_id: 'r1',
      user_id: 'u1',
      date: '2023-10-10',
      start_time: '10:00',
      end_time: '12:00',
      agenda: 'Ini adalah agenda rapat yang sangat sangat panjang sekali sehingga harus di-wrap oleh splitTextToSize agar tidak melebar ke samping.',
      status: 'completed',
      meeting_type: 'offline',
      participants: 10,
      created_at: '',
      room_name: 'Nama Ruangan yang Sangat Panjang Sekali Melebihi Batas Teks Normal di Dalam Kotak PDF'
    };

    const mockAttendees = [
      { id: 'a1', user_id: 'u1', booking_id: '1', check_in_time: '10:05', status: 'attending', is_guest_attendance: false, guest_name: 'Guest 1', guest_email: 'guest@test.com', guest_institution: 'OIKN', guest_position: 'Staff' }
    ];

    generateAttendancePDF(
      mockBooking.id,
      mockBooking.room_name || "Ruangan",
      mockBooking.agenda,
      mockBooking.date,
      `${mockBooking.start_time} - ${mockBooking.end_time}`,
      mockAttendees
    );

    // Verify splitTextToSize was called for the long texts
    expect(mockSplitTextToSize).toHaveBeenCalled();
    expect(mockJsPDF.save).toHaveBeenCalled();
  });
});
