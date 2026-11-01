'use strict';
const { ten_cac_collection } = require('../cau_truc');

/** Các collection mà cấu trúc Bước 1 (chưa có schema_version) có. Thấy một trong số này → coi là phiên bản 1. */
const COLLECTION_BUOC_1 = Object.freeze(['tai_khoan', 'nhat_ky', 'cau_hinh', 'luot_dang_nhap']);

/**
 * Xác định CSDL đang ở phiên bản cấu trúc nào:
 *  - cau_hinh.he_thong.schema_version nếu có;
 *  - không có nhưng đã có collection của Bước 1 → 1;
 *  - hoàn toàn trống → 0.
 */
async function doc_trang_thai(db) {
  const ten_co = await ten_cac_collection(db);
  let cau_hinh = null;
  if (ten_co.has('cau_hinh')) cau_hinh = await db.collection('cau_hinh').findOne({ _id: 'he_thong' });
  let hien_tai = 0;
  if (cau_hinh && Number.isInteger(cau_hinh.schema_version)) hien_tai = cau_hinh.schema_version;
  else if (COLLECTION_BUOC_1.some((c) => ten_co.has(c))) hien_tai = 1;
  return { ten_co, cau_hinh, hien_tai };
}

module.exports = { doc_trang_thai, COLLECTION_BUOC_1 };
