export const todayStr = () => new Date().toISOString().slice(0, 10);

export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export const formatQty = (value) => new Intl.NumberFormat('id-ID').format(Number(value) || 0);

export const sumBy = (items, key) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);

export const formatTanggal = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
