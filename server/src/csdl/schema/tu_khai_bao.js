'use strict';
/**
 * Sinh JSON Schema (dạng MongoDB $jsonSchema) từ bảng khai báo trường trong @hrm/shared.
 * Chỉ dùng các từ khóa MongoDB hỗ trợ: bsonType, enum, pattern, minimum/maximum, minLength/maxLength,
 * required, properties, additionalProperties, items, minItems/maxItems, uniqueItems, anyOf.
 * (MongoDB KHÔNG hỗ trợ $ref, format, default, "integer".)
 */
const { BANG_TRUONG } = require('@hrm/shared');

const gioi_han_nam = { minimum: 1900, maximum: 2100 };

/** Ngày không đủ: 3 dạng (đủ ngày / tháng-năm / chỉ năm); do_chinh_xac phải khớp với các thành phần có mặt. */
function bien_the_ngay(do_chinh_xac, co_thang, co_ngay) {
  const properties = {
    nam: { bsonType: 'int', ...gioi_han_nam },
    ngay_chuan_hoa: { bsonType: 'date' },
    do_chinh_xac: { bsonType: 'string', enum: [do_chinh_xac] },
  };
  const required = ['nam', 'ngay_chuan_hoa', 'do_chinh_xac'];
  if (co_thang) { properties.thang = { bsonType: 'int', minimum: 1, maximum: 12 }; required.push('thang'); }
  if (co_ngay) { properties.ngay = { bsonType: 'int', minimum: 1, maximum: 31 }; required.push('ngay'); }
  return { bsonType: 'object', required, additionalProperties: false, properties };
}

function schema_ngay_kdd(cho_phep_null) {
  const bien_the = [bien_the_ngay('ngay', true, true), bien_the_ngay('thang', true, false), bien_the_ngay('nam', false, false)];
  return { anyOf: cho_phep_null ? [{ bsonType: 'null' }, ...bien_the] : bien_the };
}

function schema_dia_chi(cho_phep_null) {
  const chuoi_hoac_null = { bsonType: ['string', 'null'], minLength: 1, maxLength: 200 };
  return {
    bsonType: cho_phep_null ? ['object', 'null'] : 'object',
    required: ['van_ban_goc'],
    additionalProperties: false,
    properties: {
      so_nha_duong: chuoi_hoac_null,
      xa_phuong: chuoi_hoac_null,
      tinh_tp: chuoi_hoac_null,
      van_ban_goc: { bsonType: 'string', minLength: 1, maxLength: 500 },
    },
  };
}

function them_null(bson_type, cho_phep_null) {
  return cho_phep_null ? [bson_type, 'null'] : bson_type;
}

/** Schema của một trường. `bat_buoc` = bắt buộc ở mức CSDL (không cho null). */
function schema_truong(k, bat_buoc) {
  const null_ok = !bat_buoc;
  switch (k.kieu) {
    case 'chuoi': {
      const s = { bsonType: them_null('string', null_ok), minLength: 1, maxLength: k.toi_da || 300 };
      if (k.mau) s.pattern = k.mau;
      return s;
    }
    case 'so':
      return { bsonType: them_null('number', null_ok), ...(k.nho_nhat !== undefined ? { minimum: k.nho_nhat } : {}) };
    case 'so_nguyen':
      return { bsonType: them_null('int', null_ok), ...(k.nho_nhat !== undefined ? { minimum: k.nho_nhat } : {}) };
    case 'tien':
      return { bsonType: them_null('number', null_ok), minimum: 0 };
    case 'bool':
      return { bsonType: them_null('bool', null_ok) };
    case 'ngay':
      return { bsonType: them_null('date', null_ok) };
    case 'object_id':
      return { bsonType: them_null('objectId', null_ok) };
    case 'ngay_kdd':
      return schema_ngay_kdd(null_ok);
    case 'dia_chi':
      return schema_dia_chi(null_ok);
    case 'enum':
      return { bsonType: them_null('string', null_ok), enum: null_ok ? [...k.gia_tri, null] : [...k.gia_tri] };
    case 'co_mo_ta':
      return {
        bsonType: them_null('object', null_ok), required: ['co'], additionalProperties: false,
        properties: { co: { bsonType: 'bool' }, mo_ta: { bsonType: ['string', 'null'], minLength: 1, maxLength: 500 } },
      };
    case 'ket_hon':
      return {
        bsonType: them_null('object', null_ok), required: ['tinh_trang', 'nam'], additionalProperties: false,
        properties: { tinh_trang: { bsonType: 'string', enum: ['ket_hon', 'ly_hon'] }, nam: { bsonType: 'int', ...gioi_han_nam } },
      };
    case 'mang':
      return {
        bsonType: 'array',
        ...(k.toi_da_phan_tu ? { maxItems: k.toi_da_phan_tu } : {}),
        items: schema_doi_tuong(k.truong),
      };
    default:
      throw new Error(`Kiểu trường chưa hỗ trợ: ${k.kieu}`);
  }
}

function schema_doi_tuong(truong) {
  const properties = {};
  const required = [];
  for (const [ten, k] of Object.entries(truong)) {
    const bat_buoc = k.bb === 'csdl';
    properties[ten] = schema_truong(k, bat_buoc);
    if (bat_buoc) required.push(ten);
  }
  return { bsonType: 'object', ...(required.length ? { required } : {}), additionalProperties: false, properties };
}

/** JSON Schema của một collection nghiệp vụ có bảng khai báo (nhan_su, nghi_phep). */
function tao_json_schema(collection) {
  const kb = BANG_TRUONG[collection];
  if (!kb) throw new Error(`Không có bảng khai báo cho ${collection}`);
  return schema_doi_tuong(kb.truong);
}

module.exports = { tao_json_schema, schema_truong, schema_doi_tuong };
