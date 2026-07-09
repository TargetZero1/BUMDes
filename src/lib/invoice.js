import { jsPDF } from 'jspdf';
import { formatRupiah, formatTanggal } from './formatters';
import logoUrl from '../assets/logo.png';

const NAVY = [22, 51, 89];
const LIGHT_BLUE = [190, 214, 235];
const ORG = {
  line1: 'BADAN USAHA MILIK DESA (BUMDes)',
  line2: 'MULYO SEJAHTERA ABADI',
  address: 'Ampelgading, Mulyoarjo, Kec. Lawang, Kabupaten Malang, Jawa Timur 65216',
  email: 'mulyoarjolawang@gmail.com',
  phone: '089777778945',
};

let cachedLogoDataUrl;
async function getLogoDataUrl() {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    cachedLogoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    cachedLogoDataUrl = null;
  }
  return cachedLogoDataUrl;
}

let cachedWatermarkDataUrl;
async function getWatermarkDataUrl() {
  if (cachedWatermarkDataUrl !== undefined) return cachedWatermarkDataUrl;
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = logoUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
      const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      px[i] = gray;
      px[i + 1] = gray;
      px[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    cachedWatermarkDataUrl = canvas.toDataURL('image/png');
  } catch {
    cachedWatermarkDataUrl = null;
  }
  return cachedWatermarkDataUrl;
}

function drawWatermark(doc, watermarkDataUrl) {
  if (!watermarkDataUrl) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const size = 190;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.addImage(watermarkDataUrl, 'PNG', (pageWidth - size) / 2, (pageHeight - size) / 2, size, size);
  doc.restoreGraphicsState();
}

function drawHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(0, 8, pageWidth, 62, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(ORG.line1, 40, 32);
  doc.setFontSize(15);
  doc.text(ORG.line2, 40, 50);
  doc.setFontSize(24);
  doc.text(title, pageWidth - 40, 46, { align: 'right' });
}

function drawOrgContact(doc, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 92;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(ORG.address, 40, y);
  y += 13;
  doc.text(`Email: ${ORG.email}`, 40, y);
  y += 13;
  doc.text(`Telepon: ${ORG.phone}`, 40, y);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageWidth - 96, 76, 48, 48);
    } catch {
      // keep PDF generation resilient even if the logo fails to embed
    }
  }
  return y + 26;
}

function drawTwoColumnInfo(doc, y, leftLabel, leftLines, rightRows) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth / 2 + 30;
  let leftY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(leftLabel, 40, leftY);
  doc.setFont('helvetica', 'normal');
  leftLines.forEach((line) => {
    leftY += 14;
    doc.text(line, 40, leftY, { maxWidth: rightX - 60 });
  });

  let rightY = y;
  rightRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), pageWidth - 40, rightY, { align: 'right' });
    rightY += 14;
  });

  return Math.max(leftY, rightY) + 20;
}

function drawTable(doc, y, columns, rows) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const tableWidth = pageWidth - marginX * 2;
  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, tableWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  columns.forEach((col) => {
    doc.text(col.label, col.x, y + 15, { align: col.align || 'left' });
  });

  let rowY = y + 22;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  rows.forEach((row) => {
    rowY += 22;
    columns.forEach((col) => {
      doc.text(String(row[col.key] ?? ''), col.x, rowY - 6, { align: col.align || 'left' });
    });
  });

  return rowY + 4;
}

function drawTotalBar(doc, y, label, amount) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(marginX, y, pageWidth - marginX * 2, 26, 'F');
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(label, pageWidth / 2 + 20, y + 17);
  doc.text(formatRupiah(amount), pageWidth - 40, y + 17, { align: 'right' });
  return y + 26;
}

function drawSignature(doc, y, place, dateStr, roleLabel, name) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x = pageWidth - 220;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${place}, ${formatTanggal(dateStr)}`, x, y);
  doc.text(roleLabel, x, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(name || '-', x, y + 66);
  return y + 80;
}

function drawFooterBar(doc, y, text) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(marginX, y, pageWidth - marginX * 2, 22, 'F');
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(text, marginX + 8, y + 14, { maxWidth: pageWidth - marginX * 2 - 16 });
}

export async function generateTransferInvoicePDF(transfer, unitName, issuerName) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoDataUrl = await getLogoDataUrl();
  drawWatermark(doc, await getWatermarkDataUrl());

  drawHeader(doc, 'INVOICE');
  let y = drawOrgContact(doc, logoDataUrl);

  const invoiceNo = `TRF/${(transfer.id || '').slice(0, 8).toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`No: ${invoiceNo}`, 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`Perihal: Transfer Dana ke Unit ${unitName}`, 40, y);
  y += 26;

  y = drawTwoColumnInfo(
    doc,
    y,
    'Kepada:',
    [unitName, transfer.bank_name ? `Bank: ${transfer.bank_name}` : null, transfer.account_number ? `No. Rekening: ${transfer.account_number}` : null].filter(Boolean),
    [
      ['Tanggal Transfer:', formatTanggal(transfer.tanggal)],
      ['Diterbitkan Oleh:', issuerName || '-'],
      ['Status:', 'TERKIRIM'],
    ]
  );

  const columns = [
    { key: 'deskripsi', label: 'DESKRIPSI', x: 48 },
    { key: 'jumlah', label: 'JUMLAH', x: 340, align: 'center' },
    { key: 'harga', label: 'HARGA', x: 460, align: 'right' },
    { key: 'total', label: 'TOTAL', x: 555, align: 'right' },
  ];
  y = drawTable(doc, y, columns, [
    {
      deskripsi: transfer.description || 'Transfer Dana ke Unit',
      jumlah: '1',
      harga: formatRupiah(transfer.amount),
      total: formatRupiah(transfer.amount),
    },
  ]);

  y += 30;
  y = drawTotalBar(doc, y, 'TOTAL', transfer.amount);

  y += 40;
  y = drawSignature(doc, y, 'Malang', transfer.tanggal, 'Operator BUMDes,', issuerName);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Keterangan:', 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(transfer.description || '-', 40, y, { maxWidth: 400 });

  const bankNote = transfer.bank_name
    ? `Dana ditransfer ke rek. ${transfer.bank_name} No.${transfer.account_number || '-'} a.n Unit ${unitName}`
    : `Dana ditransfer ke Unit ${unitName}`;
  drawFooterBar(doc, Math.max(y + 30, 760), bankNote);

  doc.save(`invoice-transfer-${transfer.id}.pdf`);
}

export async function generateUnitOverviewPDF(unit, issuerName) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoDataUrl = await getLogoDataUrl();
  drawWatermark(doc, await getWatermarkDataUrl());

  drawHeader(doc, 'LAPORAN');
  let y = drawOrgContact(doc, logoDataUrl);

  const reportNo = `LAP/${(unit.unit_id || '').slice(0, 8).toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`No: ${reportNo}`, 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`Perihal: Laporan Keuangan Unit ${unit.unit_name}`, 40, y);
  y += 26;

  const today = new Date().toISOString().slice(0, 10);
  y = drawTwoColumnInfo(
    doc,
    y,
    'Unit:',
    [unit.unit_name, unit.unit_type ? `Tipe: ${unit.unit_type}` : null].filter(Boolean),
    [
      ['Tanggal Laporan:', formatTanggal(today)],
      ['Update Terakhir:', unit.last_updated ? formatTanggal(unit.last_updated) : '-'],
      ['Status:', unit.is_toko ? 'Toko Bumdes' : 'Unit Aktif'],
    ]
  );

  const bersihKas = (unit.pemasukan_unit || 0) - (unit.pengeluaran_unit || 0);
  const columns = [
    { key: 'deskripsi', label: 'KETERANGAN', x: 48 },
    { key: 'total', label: 'NILAI (Rp)', x: 555, align: 'right' },
  ];
  y = drawTable(doc, y, columns, [
    { deskripsi: 'Pemasukan Kas Unit', total: formatRupiah(unit.pemasukan_unit) },
    { deskripsi: 'Pengeluaran Kas Unit', total: formatRupiah(unit.pengeluaran_unit) },
    { deskripsi: 'Saldo Kas Unit', total: formatRupiah(bersihKas) },
    { deskripsi: 'Nilai Stok Gudang', total: formatRupiah(unit.nilai_gudang) },
  ]);

  y += 30;
  y = drawTotalBar(doc, y, 'TOTAL ASET', bersihKas + (unit.nilai_gudang || 0));

  y += 40;
  y = drawSignature(doc, y, 'Malang', today, 'Operator BUMDes,', issuerName);

  drawFooterBar(doc, Math.max(y + 30, 760), 'Laporan ini dibuat otomatis oleh sistem Buku Kas BUMDes Mulyoarjo.');

  doc.save(`laporan-${(unit.unit_name || 'unit').toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
