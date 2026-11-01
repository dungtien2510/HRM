'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { phan_loai_loi_mang: pl } = require('../src/main/loi_mang');

const loi = (message, thuoc_tinh = {}) => Object.assign(new TypeError(message), thuoc_tinh);

test('phân loại lỗi chứng chỉ', () => {
  assert.equal(pl(loi('net::ERR_CERT_AUTHORITY_INVALID')).ma, 'CHUNG_CHI_KHONG_TIN_CAY');
  assert.equal(pl(loi('net::ERR_CERT_COMMON_NAME_INVALID')).ma, 'CHUNG_CHI_SAI_TEN');
  assert.equal(pl(loi('net::ERR_CERT_DATE_INVALID')).ma, 'CHUNG_CHI_HET_HAN');
  assert.equal(pl(loi('net::ERR_SSL_PROTOCOL_ERROR')).ma, 'CHUNG_CHI_LOI');
  assert.equal(pl(loi('fetch failed', { cause: { code: 'DEPTH_ZERO_SELF_SIGNED_CERT', message: 'self-signed certificate' } })).ma, 'CHUNG_CHI_KHONG_TIN_CAY');
});

test('phân loại lỗi mạng', () => {
  assert.equal(pl(loi('net::ERR_NAME_NOT_RESOLVED')).ma, 'KHONG_TIM_THAY_MAY_CHU');
  assert.equal(pl(loi('net::ERR_CONNECTION_REFUSED')).ma, 'MAY_CHU_TU_CHOI');
  assert.equal(pl(loi('net::ERR_CONNECTION_TIMED_OUT')).ma, 'QUA_THOI_GIAN');
  assert.equal(pl(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })).ma, 'QUA_THOI_GIAN');
  assert.equal(pl(loi('net::ERR_INTERNET_DISCONNECTED')).ma, 'MANG_KHONG_KHA_DUNG');
  assert.equal(pl(loi('net::ERR_CONNECTION_RESET')).ma, 'KET_NOI_BI_NGAT');
});

test('lỗi lạ hoặc rỗng vẫn cho thông điệp tiếng Việt', () => {
  for (const x of [loi('gì đó lạ'), null, undefined, {}]) {
    const kq = pl(x);
    assert.equal(kq.ma, 'LOI_KET_NOI_KHAC');
    assert.ok(kq.thong_diep.length > 0 && kq.goi_y.length > 0);
  }
});

test('mọi mã đều có thông điệp và gợi ý', () => {
  const mau = ['ERR_CERT_AUTHORITY_INVALID', 'ERR_CERT_COMMON_NAME_INVALID', 'ERR_CERT_DATE_INVALID', 'ERR_SSL_PROTOCOL_ERROR',
    'ERR_NAME_NOT_RESOLVED', 'ERR_CONNECTION_REFUSED', 'ERR_CONNECTION_TIMED_OUT', 'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION_RESET'];
  for (const m of mau) { const kq = pl(loi(`net::${m}`)); assert.ok(kq.thong_diep && kq.goi_y, m); }
});
