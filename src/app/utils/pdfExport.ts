import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateAttendancePDF = (booking: any, attendees: any[]) => {
  const doc = new jsPDF();
  
  // === HEADER ===
  // Add a simple logo / branding rectangle
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MENARA OIKN", 14, 16);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Sistem Manajemen Ruangan Terpadu", 140, 16);

  // === DOCUMENT TITLE ===
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DAFTAR HADIR RAPAT", 105, 40, { align: "center" });

  // === BOOKING INFO ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Left side info
  doc.text("Agenda", 14, 55);
  doc.text(`: ${booking.agenda}`, 45, 55);
  doc.text("Tanggal", 14, 62);
  doc.text(`: ${booking.date}`, 45, 62);
  
  // Right side info
  doc.text("Waktu", 120, 55);
  doc.text(`: ${booking.start_time} - ${booking.end_time}`, 145, 55);
  doc.text("Ruangan", 120, 62);
  doc.text(`: ${booking.room_name || booking.room_id}`, 145, 62);
  
  // Separator Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, 68, 196, 68);

  // === TABLE DATA ===
  const tableBody = attendees.map((att, idx) => [
      idx + 1,
      att.user_name || '-',
      att.institution || '-',
      att.position || '-',
      new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      '' // Empty cell for signature
  ]);

  autoTable(doc, {
      startY: 75,
      head: [['No', 'Nama', 'Instansi', 'Jabatan', 'Waktu', 'Tanda Tangan']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 58, 138], // Blue 900
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 }, // No
        1: { cellWidth: 45 }, // Nama
        2: { cellWidth: 40 }, // Instansi
        3: { cellWidth: 40 }, // Jabatan
        4: { halign: 'center', cellWidth: 20 }, // Waktu
        5: { halign: 'center', cellWidth: 33 } // Tanda Tangan
      },
      styles: { 
        minCellHeight: 20, 
        valign: 'middle',
        fontSize: 9,
        lineColor: [226, 232, 240], // Slate 200
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50
      },
      didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
              const att = attendees[data.row.index];
              if (att && att.signature) {
                  try {
                      if (att.signature.startsWith('data:image')) {
                          // Center the image in the cell
                          const imgWidth = 26;
                          const imgHeight = 12;
                          const x = data.cell.x + (data.cell.width - imgWidth) / 2;
                          const y = data.cell.y + (data.cell.height - imgHeight) / 2;
                          doc.addImage(att.signature, 'PNG', x, y, imgWidth, imgHeight);
                      }
                  } catch(e) {
                    console.error("Failed to add image to PDF", e);
                  }
              }
          }
      }
  });

  // === FOOTER ===
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer line
    doc.line(14, 285, 196, 285);
    // Left text
    doc.text(`Dicetak dari Menara OIKN pada ${new Date().toLocaleString('id-ID')}`, 14, 290);
    // Right text
    doc.text(`Halaman ${i} dari ${pageCount}`, 196, 290, { align: 'right' });
  }

  // Save the document
  const safeTitle = booking.agenda.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Presensi_${booking.date}_${safeTitle}.pdf`);
};
