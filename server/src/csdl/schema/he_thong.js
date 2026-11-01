'use strict';
/** JSON Schema của các collection hệ thống (không nằm trong ánh xạ mục quyền, chỉ admin/API nội bộ chạm tới). */
const { DANH_SACH_LOAI_TAI_KHOAN, MA_MUC_QUYEN } = require('@hrm/shared');

const ngay = { bsonType: 'date' };
const ngay_hoac_null = { bsonType: ['date', 'null'] };
const chuoi_hoac_null = (toi_da) => ({ bsonType: ['string', 'null'], minLength: 1, maxLength: toi_da });

const nguoi_dung = {
  bsonType: 'object',
  required: ['ten_dang_nhap', 'mat_khau_bam', 'loai', 'muc_duoc_xem', 'khoa', 'buoc_doi_mat_khau', 'so_lan_sai', 'so_phien_token', 'created_at', 'updated_at'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    ten_dang_nhap: { bsonType: 'string', pattern: '^[a-z0-9._-]{3,32}$' },
    ten_hien_thi: { bsonType: 'string', minLength: 1, maxLength: 80 },
    mat_khau_bam: { bsonType: 'string', pattern: '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' }, // chỉ nhận băm bcrypt
    loai: { bsonType: 'string', enum: [...DANH_SACH_LOAI_TAI_KHOAN] },
    muc_duoc_xem: { bsonType: 'array', uniqueItems: true, maxItems: MA_MUC_QUYEN.length, items: { bsonType: 'string', enum: [...MA_MUC_QUYEN] } },
    khoa: { bsonType: 'bool' },
    buoc_doi_mat_khau: { bsonType: 'bool' },
    so_lan_sai: { bsonType: 'int', minimum: 0 },
    lan_sai_cuoi: ngay_hoac_null,
    dang_nhap_cuoi: ngay_hoac_null,
    so_phien_token: { bsonType: 'int', minimum: 1 },
    la_mau: { bsonType: 'bool' },
    created_at: ngay,
    updated_at: ngay,
  },
};

const nhat_ky = {
  bsonType: 'object',
  required: ['thoi_diem', 'hanh_dong', 'ket_qua', 'may'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    thoi_diem: ngay,
    hanh_dong: { bsonType: 'string', pattern: '^[a-z_]{3,40}$' },
    ket_qua: { bsonType: 'string', enum: ['thanh_cong', 'that_bai', 'tu_choi'] },
    tai_khoan: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      properties: { id: chuoi_hoac_null(40), ten: chuoi_hoac_null(64), tham_chieu: { bsonType: 'string', maxLength: 80 } },
    },
    may: {
      bsonType: 'object',
      required: ['ip'],
      additionalProperties: false,
      properties: { ten: chuoi_hoac_null(63), ip: { bsonType: 'string', minLength: 1, maxLength: 64 } },
    },
    phien_ban_ung_dung: chuoi_hoac_null(64), // đủ cho x.y.z-<32 ký tự tiền phát hành> (tối đa 53)
    chi_tiet: { bsonType: ['object', 'null'] },
  },
};

const cau_hinh = {
  bsonType: 'object',
  required: ['ten_don_vi', 'schema_version', 'phien_ban_toi_thieu', 'cai_dat_sao_luu', 'created_at', 'updated_at'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'string', enum: ['he_thong'] },
    ten_don_vi: { bsonType: 'string', minLength: 1, maxLength: 200 },
    schema_version: { bsonType: 'int', minimum: 0 },
    phien_ban_toi_thieu: { bsonType: 'string', pattern: '^[0-9]{1,6}\\.[0-9]{1,6}\\.[0-9]{1,6}(-[0-9A-Za-z.-]{1,32})?$' },
    cai_dat_sao_luu: {
      bsonType: 'object',
      required: ['bat', 'giu_toi_da_ban'],
      additionalProperties: false,
      properties: {
        bat: { bsonType: 'bool' },
        thu_muc: chuoi_hoac_null(260),
        gio: { bsonType: ['string', 'null'], pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
        giu_toi_da_ban: { bsonType: 'int', minimum: 1, maximum: 365 },
        lan_cuoi: ngay_hoac_null,
        ket_qua_lan_cuoi: chuoi_hoac_null(300),
      },
    },
    created_at: ngay,
    updated_at: ngay,
  },
};

/** Bộ đếm đăng nhập sai (TTL) — collection vận hành, không chứa dữ liệu nhân sự. */
const luot_dang_nhap = {
  bsonType: 'object',
  required: ['khoa', 'luc', 'het_han'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    khoa: { bsonType: 'string', minLength: 4, maxLength: 120 },
    luc: ngay,
    het_han: ngay,
  },
};

module.exports = { nguoi_dung, nhat_ky, cau_hinh, luot_dang_nhap };
