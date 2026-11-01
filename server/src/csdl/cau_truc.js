'use strict';
/**
 * Tạo và "ép" cấu trúc CSDL về đúng thiết kế hiện hành. MỌI hàm ở đây chạy lại nhiều lần không hỏng (idempotent):
 * thứ đã đúng thì bỏ qua, thứ lệch thì sửa, thứ thiếu thì tạo.
 */
const { tao_validator } = require('./schema');
const { CHI_MUC, DANH_SACH_COLLECTION } = require('./chi_muc');
const { VAI_TRO_UNG_DUNG, tao_dac_quyen } = require('../kho/danh_sach_collection');

/** Phiên bản cấu trúc dữ liệu hiện hành. Tăng khi có thay đổi cần chuyển đổi dữ liệu (thêm bước ở nang_cap/). */
const PHIEN_BAN_SCHEMA = 2;
const TUY_CHON_VALIDATOR = Object.freeze({ validationLevel: 'strict', validationAction: 'error' });

function chuan_json(gia_tri) {
  if (Array.isArray(gia_tri)) return `[${gia_tri.map(chuan_json).join(',')}]`;
  if (gia_tri instanceof Date) return JSON.stringify(gia_tri.toISOString());
  if (gia_tri && typeof gia_tri === 'object') {
    return `{${Object.keys(gia_tri).sort().map((k) => `${JSON.stringify(k)}:${chuan_json(gia_tri[k])}`).join(',')}}`;
  }
  return JSON.stringify(gia_tri === undefined ? null : gia_tri);
}

async function ten_cac_collection(db) {
  return new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
}

/** Tạo collection kèm validator, hoặc cập nhật validator nếu đã có nhưng khác. Trả về 'tao' | 'cap_nhat' | 'giu'. */
async function dam_bao_collection(db, ten) {
  const validator = tao_validator(ten);
  const ds = await db.listCollections({ name: ten }).toArray();
  if (ds.length === 0) {
    await db.createCollection(ten, { validator, ...TUY_CHON_VALIDATOR });
    return 'tao';
  }
  const tuy_chon = ds[0].options || {};
  const giong = chuan_json(tuy_chon.validator || null) === chuan_json(validator)
    && tuy_chon.validationLevel === TUY_CHON_VALIDATOR.validationLevel
    && tuy_chon.validationAction === TUY_CHON_VALIDATOR.validationAction;
  if (giong) return 'giu';
  await db.command({ collMod: ten, validator, ...TUY_CHON_VALIDATOR });
  return 'cap_nhat';
}

function khoa_giong(a, b) {
  return JSON.stringify(Object.entries(a)) === JSON.stringify(Object.entries(b));
}

function chi_muc_giong(hien_co, spec) {
  const t = spec.tuy_chon || {};
  return khoa_giong(hien_co.key, spec.khoa)
    && Boolean(hien_co.unique) === Boolean(t.unique)
    && chuan_json(hien_co.partialFilterExpression || null) === chuan_json(t.partialFilterExpression || null)
    && (hien_co.expireAfterSeconds ?? null) === (t.expireAfterSeconds ?? null);
}

/** Tạo các chỉ mục còn thiếu; chỉ mục cùng tên nhưng khác định nghĩa (hoặc cùng khóa khác tên) thì xóa và tạo lại. */
async function dam_bao_chi_muc(db, ten) {
  const bao_cao = { tao: [], giu: [], tao_lai: [] };
  const col = db.collection(ten);
  for (const spec of CHI_MUC[ten] || []) {
    const hien_co = await col.indexes();
    const cung_ten = hien_co.find((c) => c.name === spec.ten);
    if (cung_ten && chi_muc_giong(cung_ten, spec)) { bao_cao.giu.push(spec.ten); continue; }
    let tao_lai = false;
    if (cung_ten) { await col.dropIndex(spec.ten); tao_lai = true; }
    const cung_khoa = hien_co.find((c) => c.name !== spec.ten && c.name !== '_id_' && khoa_giong(c.key, spec.khoa));
    if (cung_khoa) { await col.dropIndex(cung_khoa.name); tao_lai = true; }
    await col.createIndex(spec.khoa, { name: spec.ten, ...(spec.tuy_chon || {}) });
    (tao_lai ? bao_cao.tao_lai : bao_cao.tao).push(spec.ten);
  }
  return bao_cao;
}

/** Số tài liệu ĐANG có mà không đạt validator hiện hành (validator chỉ kiểm khi ghi, nên cần đếm riêng). */
async function dem_vi_pham(db, ten) {
  return db.collection(ten).countDocuments({ $nor: [tao_validator(ten)] });
}

/** Tạo/ép cả sáu collection (validator + chỉ mục). */
async function dam_bao_cau_truc(db, { ghi = () => {} } = {}) {
  const bao_cao = {};
  for (const ten of DANH_SACH_COLLECTION) {
    const collection = await dam_bao_collection(db, ten);
    const chi_muc = await dam_bao_chi_muc(db, ten);
    bao_cao[ten] = { collection, chi_muc };
    ghi('thong_tin', `${ten}: collection ${collection}; chỉ mục tạo ${chi_muc.tao.length}, tạo lại ${chi_muc.tao_lai.length}, giữ ${chi_muc.giu.length}`);
  }
  return bao_cao;
}

function cai_dat_sao_luu_mac_dinh() {
  return { bat: false, thu_muc: null, gio: null, giu_toi_da_ban: 14, lan_cuoi: null, ket_qua_lan_cuoi: null };
}

/** Tài liệu cấu hình hệ thống mặc định (chỉ chèn nếu chưa có — không ghi đè cấu hình đang dùng). */
function tao_cau_hinh_mac_dinh({ bay_gio, schema_version = 0, phien_ban_toi_thieu = '0.1.0', ten_don_vi = 'Chưa đặt tên đơn vị' }) {
  return {
    ten_don_vi, schema_version, phien_ban_toi_thieu, cai_dat_sao_luu: cai_dat_sao_luu_mac_dinh(), created_at: bay_gio, updated_at: bay_gio,
  };
}

async function gieo_cau_hinh(db, tuy_chon) {
  const { _id, ...phan_con_lai } = { _id: 'he_thong', ...tao_cau_hinh_mac_dinh(tuy_chon) };
  await db.collection('cau_hinh').updateOne({ _id }, { $setOnInsert: phan_con_lai }, { upsert: true });
}

/** Cập nhật đặc quyền của vai trò ứng dụng (cần quyền userAdmin). Trả về 'cap_nhat' | 'chua_co_vai_tro'. */
async function dam_bao_vai_tro(db, csdl) {
  const kq = await db.command({ rolesInfo: VAI_TRO_UNG_DUNG });
  if (!kq.roles || kq.roles.length === 0) return 'chua_co_vai_tro';
  await db.command({ updateRole: VAI_TRO_UNG_DUNG, privileges: tao_dac_quyen(csdl), roles: [] });
  return 'cap_nhat';
}

/** Dùng khi API khởi động: từ chối chạy nếu cấu trúc CSDL không đúng phiên bản. API KHÔNG tự tạo/sửa cấu trúc. */
async function kiem_tra_phien_ban_schema(db) {
  let doc = null;
  try { doc = await db.collection('cau_hinh').findOne({ _id: 'he_thong' }); } catch { doc = null; }
  const hien_tai = doc && Number.isInteger(doc.schema_version) ? doc.schema_version : null;
  if (hien_tai !== PHIEN_BAN_SCHEMA) {
    throw new Error(`Cấu trúc CSDL chưa đúng phiên bản (CSDL: ${hien_tai === null ? 'chưa khởi tạo' : hien_tai}, mã nguồn cần: ${PHIEN_BAN_SCHEMA}). `
      + 'Hãy chạy "npm run nang_cap_csdl" bằng user quản trị MongoDB rồi khởi động lại dịch vụ.');
  }
  return hien_tai;
}

module.exports = {
  PHIEN_BAN_SCHEMA, TUY_CHON_VALIDATOR, chuan_json, ten_cac_collection,
  dam_bao_collection, dam_bao_chi_muc, dam_bao_cau_truc, dem_vi_pham,
  tao_cau_hinh_mac_dinh, gieo_cau_hinh, dam_bao_vai_tro, kiem_tra_phien_ban_schema,
};
