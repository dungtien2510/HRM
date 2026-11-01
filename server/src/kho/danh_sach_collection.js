'use strict';
/**
 * Đặc quyền TỐI THIỂU của user MongoDB dùng cho API (vai trò vai_tro_hrm_ung_dung) trên đúng MỘT CSDL.
 *  - Không có createCollection / createIndex / collMod / dropCollection: cấu trúc, chỉ mục, validator do script
 *    nâng cấp (chạy bằng user quản trị MongoDB) quản lý; API không tự sửa hay gỡ validator được.
 *  - nhat_ky: chỉ find + insert (chỉ ghi thêm — không update, không remove).
 *  - cau_hinh: không remove (cấu hình hệ thống không bị xóa qua API).
 * Thêm collection mới: bổ sung ở đây rồi chạy lại `npm run nang_cap_csdl` (cập nhật vai trò) .
 */
const VAI_TRO_UNG_DUNG = 'vai_tro_hrm_ung_dung';

const QUYEN_DOC_GHI_XOA = Object.freeze(['find', 'insert', 'update', 'remove', 'killCursors']);
const QUYEN_DOC_GHI = Object.freeze(['find', 'insert', 'update', 'killCursors']);
const QUYEN_DOC_XOA_THEM = Object.freeze(['find', 'insert', 'remove', 'killCursors']);
const QUYEN_CHI_THEM = Object.freeze(['find', 'insert', 'killCursors']);

/** collection → danh sách hành động. */
const QUYEN_THEO_COLLECTION = Object.freeze({
  nhan_su: QUYEN_DOC_GHI_XOA,
  nghi_phep: QUYEN_DOC_GHI_XOA,
  nguoi_dung: QUYEN_DOC_GHI_XOA,
  cau_hinh: QUYEN_DOC_GHI,
  luot_dang_nhap: QUYEN_DOC_XOA_THEM,
  nhat_ky: QUYEN_CHI_THEM,
});

function tao_dac_quyen(csdl) {
  return Object.entries(QUYEN_THEO_COLLECTION).map(([collection, actions]) => ({
    resource: { db: csdl, collection },
    actions: [...actions],
  }));
}

module.exports = { VAI_TRO_UNG_DUNG, QUYEN_THEO_COLLECTION, tao_dac_quyen };
