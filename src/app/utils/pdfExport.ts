import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendee } from '../services/bookingService';

export const generateAttendancePDF = (
  bookingId: string, 
  roomName: string, 
  agenda: string, 
  date: string, 
  time: string, 
  attendees: Attendee[]
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Presensi Rapat", 14, 22);
  
  // Meeting Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Agenda: ${agenda}`, 14, 32);
  doc.text(`Ruangan: ${roomName}`, 14, 38);
  doc.text(`Waktu: ${date} (${time})`, 14, 44);
  doc.text(`Total Hadir: ${attendees.length} Peserta`, 14, 50);

  // Table Data
  const tableColumn = ["No", "Nama Peserta", "Instansi", "Jabatan", "Waktu Check-In", "Tipe", "TTD"];
  const tableRows: any[][] = [];

  attendees.forEach((att, index) => {
    const rowData = [
      index + 1,
      att.user_name || "Unknown",
      att.institution || "-",
      att.position || "-",
      att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID') : "-",
      att.attendance_type || "Offline",
      att.signature ? "Tersedia" : "-"
    ];
    tableRows.push(rowData);
  });

  // @ts-ignore
  doc.autoTable({
    startY: 55,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [42, 78, 133], textColor: 255 }
  });

  // Save the PDF
  doc.save(`Presensi_${bookingId}.pdf`);
};
