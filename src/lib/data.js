export function emptyData() {
  return {
    kasUmum: { debit: [], kredit: [] },
    kasPetelur: { debit: [], kredit: [] },
    gudang: [],
  };
}

export function rowToEntry(row) {
  return {
    id: row.id,
    tanggal: row.tanggal,
    uraian: row.uraian,
    sumber: row.sumber,
    kategori: row.kategori,
    jumlah: Number(row.jumlah) || 0,
  };
}

export function rowToGudang(row) {
  return {
    id: row.id,
    tanggal: row.tanggal,
    namaBarang: row.nama_barang,
    satuan: row.satuan,
    uraian: row.uraian,
    masuk: Number(row.masuk) || 0,
    keluar: Number(row.keluar) || 0,
  };
}
