import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  
  // Warna Utama (Biru OIKN)
  const primaryColor: [number, number, number] = [30, 58, 138];
  
  // --- Header Desain ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DAFTAR HADIR RAPAT", 14, 16);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Otorita Ibu Kota Nusantara (OIKN)", 14, 23);
  
  // --- Detail Rapat (Kotak Info) ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const splitAgenda = doc.splitTextToSize(agenda || '-', 70);
  const agendaLines = splitAgenda.length;
  const agendaHeight = agendaLines * 4.5;
  
  const splitRoom = doc.splitTextToSize(roomName || '-', 70);
  const roomLines = splitRoom.length;
  const roomHeight = roomLines * 4.5;
  
  const boxHeight = 18 + agendaHeight + roomHeight; 

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, boxHeight, 3, 3, 'FD');
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Detail Agenda", 18, 46);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  // Info Kiri
  doc.text(`Agenda:`, 18, 54);
  doc.setFont("helvetica", "bold");
  doc.text(splitAgenda, 35, 54);
  
  const ruanganY = 54 + agendaHeight + 1;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Ruangan:`, 18, ruanganY);
  doc.setFont("helvetica", "bold");
  doc.text(splitRoom, 35, ruanganY);
  
  // Info Kanan
  doc.setFont("helvetica", "normal");
  doc.text(`Waktu:`, 110, 54);
  doc.setFont("helvetica", "bold");
  doc.text(`${date || '-'} (${time || '-'})`, 125, 54);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Peserta:`, 110, ruanganY);
  doc.setFont("helvetica", "bold");
  doc.text(`${attendees.length} Orang Hadir`, 125, ruanganY);

  const tableStartY = 38 + boxHeight + 8;

  // --- Tabel Data ---
  const tableColumn = ["No", "Nama Peserta", "Instansi", "Jabatan", "Check-In", "Tipe", "Tanda Tangan"];
  const tableRows: any[][] = [];

  attendees.forEach((att, index) => {
    // Logika untuk pegawai internal (ditandai dengan adanya user_id)
    const isInternal = !!att.user_id;
    const institution = att.institution || (isInternal ? "Otorita Ibu Kota Nusantara" : "-");
    const position = att.position || (isInternal ? "Pegawai Internal" : "-");
    
    // Untuk signature, jika internal dan tidak ada tanda tangan fisik/canvas
    let sigText = "-";
    if (att.signature) {
      sigText = ""; // Tempat untuk dirender gambar
    } else if (isInternal) {
      sigText = "TTD Digital";
    }

    const rowData = [
      index + 1,
      att.user_name || "Unknown",
      institution,
      position,
      att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-",
      att.attendance_type || "Offline",
      sigText
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, valign: 'middle', textColor: [60, 60, 60], font: 'helvetica' },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { cellWidth: 25, halign: 'center', minCellHeight: 14 }
    },
    didDrawCell: function (data) {
      if (data.column.index === 6 && data.cell.section === 'body') {
        const attendee = attendees[data.row.index];
        if (attendee && attendee.signature) {
          try {
            const imgData = attendee.signature;
            const imgWidth = 20;
            const imgHeight = 10;
            const x = data.cell.x + (data.cell.width - imgWidth) / 2;
            const y = data.cell.y + (data.cell.height - imgHeight) / 2;
            
            doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
          } catch (e) {
            console.error("Gagal merender tanda tangan:", e);
          }
        }
      }
    }
  });

  // Save the PDF
  doc.save(`Presensi_${bookingId}.pdf`);
};
