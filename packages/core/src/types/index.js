/**
 * JSDoc typedefs sentral untuk entitas SIPTU ULTRA.
 * Dipakai bersama antara apps/web dan apps/desktop.
 */

/**
 * @typedef {Object} Employee
 * @property {number} id
 * @property {string} nip
 * @property {string} name
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [position]
 * @property {string} [unit]
 * @property {string} [photo_url]
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} nip
 * @property {string} name
 * @property {string} [email]
 * @property {string|string[]} [roles]
 * @property {string} [base_role]
 * @property {string} [default_role]
 * @property {string} [photo_url]
 */

/**
 * @typedef {'draft'|'diajukan'|'disetujui'|'ditolak'|'selesai'} ServiceStatus
 */

/**
 * @typedef {Object} SuratTugas
 * @property {number} id
 * @property {string} nomor_surat
 * @property {string} tujuan
 * @property {string} tanggal_berangkat
 * @property {string} tanggal_kembali
 * @property {ServiceStatus} status
 * @property {string} [mak]
 * @property {string} [keterangan]
 * @property {Employee[]} [anggota]
 */

/**
 * @typedef {Object} KgbRecord
 * @property {number} id
 * @property {string} employee_nip
 * @property {string} employee_name
 * @property {string} pangkat
 * @property {string} golongan
 * @property {string} tmt_berkala
 * @property {string} [status]
 */

/**
 * @typedef {Object} BmnAsset
 * @property {number} id
 * @property {string} kode_barang
 * @property {string} nama_barang
 * @property {string} kategori
 * @property {string} satuan
 * @property {string} lokasi
 * @property {number} stok
 */

/**
 * @typedef {Object} ApiMeta
 * @property {number} total
 * @property {number} page
 * @property {number} last_page
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} data
 * @property {ApiMeta} meta
 */

export const TYPES = {}; // Runtime no-op — typedefs hanya untuk editor/intellisense.
