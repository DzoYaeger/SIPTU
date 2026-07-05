export const formatRupiah = (value) => {
  console.log(`formatRupiah called with value: ${value} (placeholder)`);
  if (value === null || value === undefined) {
    return 'Rp0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};