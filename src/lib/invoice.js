import { jsPDF } from 'jspdf';
import { formatRupiah, formatTanggal } from './formatters';

export function generateTransferInvoicePDF(transfer, unitName, issuerName) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 64;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(6, 78, 59);
  doc.text('BUMDes Mulyoarjo', marginX, y);

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  y += 18;
  doc.text('Invoice Transfer Dana Kas Umum BUMDes ke Unit', marginX, y);

  y += 32;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1.5);
  doc.line(marginX, y, 548, y);

  y += 32;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);

  const rows = [
    ['No. Invoice', transfer.id],
    ['Tanggal', formatTanggal(transfer.tanggal)],
    ['Unit Penerima', unitName || '-'],
    ['Diterbitkan Oleh', issuerName || '-'],
    ['Keterangan', transfer.description || '-'],
    ['Bank Tujuan', transfer.bank_name || '-'],
    ['Nomor Rekening', transfer.account_number || '-'],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}`, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value ?? '-'), marginX + 150, y, { maxWidth: 350 });
    y += 22;
  });

  y += 20;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(marginX, y, 500, 60, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);
  doc.text('Jumlah Transfer', marginX + 20, y + 24);
  doc.setFontSize(18);
  doc.text(formatRupiah(transfer.amount), marginX + 20, y + 46);

  y += 100;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('Dokumen ini dibuat otomatis oleh sistem Buku Kas BUMDes Mulyoarjo.', marginX, y);

  doc.save(`invoice-transfer-${transfer.id}.pdf`);
}
