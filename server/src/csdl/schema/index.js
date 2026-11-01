'use strict';
const { tao_json_schema } = require('./tu_khai_bao');
const he_thong = require('./he_thong');

/** Validator (bộ lọc truy vấn) cho từng collection. nghi_phep thêm ràng buộc den_ngay ≥ tu_ngay. */
function tao_validator(collection) {
  switch (collection) {
    case 'nhan_su':
    case 'nghi_phep': {
      const js = { $jsonSchema: tao_json_schema(collection) };
      return collection === 'nghi_phep' ? { $and: [js, { $expr: { $gte: ['$den_ngay', '$tu_ngay'] } }] } : js;
    }
    case 'nguoi_dung':
    case 'nhat_ky':
    case 'cau_hinh':
    case 'luot_dang_nhap':
      return { $jsonSchema: he_thong[collection] };
    default:
      throw new Error(`Chưa có validator cho collection: ${collection}`);
  }
}

module.exports = { tao_validator };
