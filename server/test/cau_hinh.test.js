'use strict';
// Cần đã chạy `npm install` (dùng zod).
const test = require('node:test');
const assert = require('node:assert/strict');
const { doc_cau_hinh } = require('../src/cau_hinh');

const BI_MAT_JWT = 'j'.repeat(64);
const MAU = Object.freeze({
  TLS_PFX: 'C:\\HRM\\chung_chi\\hrm_may_chu.pfx',
  TLS_PFX_MAT_KHAU: 'mk-pfx-rat-bi-mat',
  MONGO_NGUOI_DUNG: 'hrm_ung_dung',
  MONGO_MAT_KHAU: 'mk-mongo-rat-bi-mat',
  JWT_BI_MAT: BI_MAT_JWT,
});

test('cấu hình hợp lệ tối thiểu: lấy giá trị mặc định đúng', () => {
  const c = doc_cau_hinh({ ...MAU });
  assert.equal(c.cong, 8443);
  assert.equal(c.mongo.may, '127.0.0.1');
  assert.equal(c.mongo.csdl, 'hrm_nhan_su');
  assert.equal(c.jwt.het_han_phut, 30);
  assert.equal(c.bcrypt_cost, 12);
  assert.equal(c.dang_nhap.sai_toi_da_tai_khoan, 5);
  assert.equal(c.dang_nhap.sai_toi_da_ip, 20);
  assert.equal(c.dang_nhap.cua_so_ms, 15 * 60 * 1000);
  assert.equal(c.phien_ban_toi_thieu_mac_dinh, '0.1.0');
  assert.ok(Object.isFrozen(c));
});

test('đọc được số từ chuỗi môi trường', () => {
  const c = doc_cau_hinh({ ...MAU, CONG: '9443', DANG_NHAP_CUA_SO_PHUT: '10', JWT_HET_HAN_PHUT: '15' });
  assert.equal(c.cong, 9443);
  assert.equal(c.dang_nhap.cua_so_ms, 600000);
  assert.equal(c.jwt.het_han_phut, 15);
});

test('API chỉ phục vụ HTTPS: thiếu TLS_PFX là lỗi', () => {
  const { TLS_PFX, ...khong_tls } = MAU;
  assert.throws(() => doc_cau_hinh(khong_tls), /TLS_PFX/);
  assert.doesNotThrow(() => doc_cau_hinh(khong_tls, { can_tls: false }));
});

test('thiếu bí mật bắt buộc hoặc JWT_BI_MAT quá ngắn → lỗi', () => {
  assert.throws(() => doc_cau_hinh({ ...MAU, JWT_BI_MAT: undefined }), /JWT_BI_MAT/);
  assert.throws(() => doc_cau_hinh({ ...MAU, JWT_BI_MAT: 'ngan' }), /JWT_BI_MAT/);
  assert.throws(() => doc_cau_hinh({ ...MAU, MONGO_MAT_KHAU: undefined }), /MONGO_MAT_KHAU/);
});

test('MongoDB chỉ được ở 127.0.0.1/localhost', () => {
  assert.throws(() => doc_cau_hinh({ ...MAU, MONGO_MAY: '192.168.1.10' }), /MONGO_MAY/);
  assert.doesNotThrow(() => doc_cau_hinh({ ...MAU, MONGO_MAY: 'localhost' }));
});

test('giá trị ngoài miền cho phép bị từ chối', () => {
  assert.throws(() => doc_cau_hinh({ ...MAU, BCRYPT_COST: '3' }), /BCRYPT_COST/);
  assert.throws(() => doc_cau_hinh({ ...MAU, CONG: '70000' }), /CONG/);
  assert.throws(() => doc_cau_hinh({ ...MAU, PHIEN_BAN_TOI_THIEU_MAC_DINH: 'abc' }), /PHIEN_BAN/);
  assert.throws(() => doc_cau_hinh({ ...MAU, MONGO_CSDL: 'hrm; drop' }), /MONGO_CSDL/);
});

test('thông báo lỗi không bao giờ chứa giá trị bí mật', () => {
  let thong_diep = '';
  try {
    doc_cau_hinh({ ...MAU, JWT_BI_MAT: 'bi-mat-ngan-thoi', MONGO_MAT_KHAU: 'mk-mongo-rat-bi-mat', BCRYPT_COST: '1' });
  } catch (loi) { thong_diep = loi.message; }
  assert.ok(thong_diep.length > 0);
  for (const bi_cam of ['bi-mat-ngan-thoi', 'mk-mongo-rat-bi-mat', 'mk-pfx-rat-bi-mat']) {
    assert.equal(thong_diep.includes(bi_cam), false, bi_cam);
  }
});
