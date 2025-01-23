import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExportOptions {
  filename: string;
  headers: string[];
  data: (string | number)[][];
  title?: string;
  subtitle?: string;
}

export const exportToCSV = ({ filename, headers, data }: ExportOptions) => {
  const csv = [
    headers.join(';'),
    ...data.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
};

export const exportToPDF = ({ filename, headers, data, title, subtitle }: ExportOptions) => {
  const doc = new jsPDF();
  
  doc.setFont('helvetica');
  
  if (title) {
    doc.text(title, 14, 15);
  }
  
  if (subtitle) {
    doc.text(subtitle, 14, 22);
  } else {
    doc.text(`Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 14, 22);
  }

  (doc as any).autoTable({
    head: [headers],
    body: data,
    startY: subtitle ? 30 : 25,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] }
  });

  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
