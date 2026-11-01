'use strict';
/**
 * Bộ kiểm tra $jsonSchema TỰ VIẾT, chỉ để kiểm thử ở môi trường không có MongoDB.
 * Hỗ trợ đúng tập từ khóa mà src/csdl/schema dùng: bsonType, enum, pattern, minimum/maximum, minLength/maxLength,
 * required, properties, additionalProperties, items, minItems/maxItems, uniqueItems, anyOf.
 * Đây KHÔNG phải MongoDB: hành vi thật được kiểm ở mongo.tich_hop.test.js (cần HRM_TEST_MONGO_URI).
 */
function loai_bson(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (v instanceof Date) return 'date';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? 'int' : 'double';
  if (typeof v === 'object') return v._bsontype === 'ObjectId' ? 'objectId' : 'object';
  return typeof v;
}

function khop_bson(ten, v) {
  const t = loai_bson(v);
  if (ten === 'number') return t === 'int' || t === 'double';
  return ten === t;
}

const so_chuoi_ky_tu = (s) => [...s].length;

/** Trả về mảng lỗi (rỗng = hợp lệ). */
function kiem_tra_schema(schema, v, duong_dan = '$') {
  const loi = [];
  if (schema.bsonType !== undefined) {
    const ds = [].concat(schema.bsonType);
    if (!ds.some((b) => khop_bson(b, v))) return [`${duong_dan}: kiểu ${loai_bson(v)} không thuộc [${ds.join(',')}]`];
  }
  if (schema.anyOf && !schema.anyOf.some((s) => kiem_tra_schema(s, v, duong_dan).length === 0)) loi.push(`${duong_dan}: không khớp anyOf nào`);
  if (schema.enum && !schema.enum.some((e) => e === v)) loi.push(`${duong_dan}: giá trị ${JSON.stringify(v)} ngoài enum`);
  const t = loai_bson(v);
  if (t === 'string') {
    if (schema.minLength !== undefined && so_chuoi_ky_tu(v) < schema.minLength) loi.push(`${duong_dan}: ngắn hơn ${schema.minLength}`);
    if (schema.maxLength !== undefined && so_chuoi_ky_tu(v) > schema.maxLength) loi.push(`${duong_dan}: dài hơn ${schema.maxLength}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(v)) loi.push(`${duong_dan}: không khớp pattern ${schema.pattern}`);
  }
  if (t === 'int' || t === 'double') {
    if (schema.minimum !== undefined && v < schema.minimum) loi.push(`${duong_dan}: nhỏ hơn ${schema.minimum}`);
    if (schema.maximum !== undefined && v > schema.maximum) loi.push(`${duong_dan}: lớn hơn ${schema.maximum}`);
  }
  if (t === 'array') {
    if (schema.minItems !== undefined && v.length < schema.minItems) loi.push(`${duong_dan}: ít hơn ${schema.minItems} phần tử`);
    if (schema.maxItems !== undefined && v.length > schema.maxItems) loi.push(`${duong_dan}: nhiều hơn ${schema.maxItems} phần tử`);
    if (schema.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) loi.push(`${duong_dan}: có phần tử trùng`);
    if (schema.items) v.forEach((p, i) => loi.push(...kiem_tra_schema(schema.items, p, `${duong_dan}[${i}]`)));
  }
  if (t === 'object') {
    const khoa_co_mat = Object.keys(v).filter((k) => v[k] !== undefined);
    for (const k of schema.required || []) if (!khoa_co_mat.includes(k)) loi.push(`${duong_dan}: thiếu trường bắt buộc ${k}`);
    const props = schema.properties || {};
    for (const k of khoa_co_mat) {
      if (props[k]) loi.push(...kiem_tra_schema(props[k], v[k], `${duong_dan}.${k}`));
      else if (schema.additionalProperties === false) loi.push(`${duong_dan}: trường lạ ${k}`);
    }
  }
  return loi;
}

/** Đánh giá bộ lọc validator: $jsonSchema, $and, và $expr dạng { $gte: ['$a', '$b'] }. */
function kiem_tra_validator(validator, doc) {
  const loi = [];
  if (validator.$jsonSchema) loi.push(...kiem_tra_schema(validator.$jsonSchema, doc));
  if (validator.$and) for (const phan of validator.$and) loi.push(...kiem_tra_validator(phan, doc));
  if (validator.$expr) {
    const [phep] = Object.keys(validator.$expr);
    const [a, b] = validator.$expr[phep].map((x) => (typeof x === 'string' && x.startsWith('$') ? doc[x.slice(1)] : x));
    if (phep === '$gte' && !(a >= b)) loi.push(`$expr: ${JSON.stringify(a)} không ≥ ${JSON.stringify(b)}`);
    else if (phep !== '$gte') throw new Error(`$expr chưa hỗ trợ: ${phep}`);
  }
  return loi;
}

module.exports = { kiem_tra_schema, kiem_tra_validator, loai_bson };
