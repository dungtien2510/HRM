'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/index.js');

test('có đúng 11 mục quyền, 5 mục cuối là nhạy cảm', () => {
  assert.equal(S.MUC_QUYEN.length, 11);
  assert.deepEqual(S.MA_MUC_NHAY_CAM, ['nghi_phep', 'luong', 'ky_luat', 'tien_an_tien_su', 'so_can_cuoc']);
  assert.deepEqual(S.MUC_QUYEN.slice(6).map((m) => m.ma), S.MA_MUC_NHAY_CAM);
  assert.equal(new Set(S.MA_MUC_QUYEN).size, 11);
});

test('ba loại tài khoản', () => {
  assert.deepEqual([...S.DANH_SACH_LOAI_TAI_KHOAN].sort(), ['admin', 'xem_day_du', 'xem_mot_so_muc']);
});

test('hằng số bị đóng băng', () => {
  assert.throws(() => S.MUC_QUYEN.push({}), TypeError);
  assert.throws(() => { S.MUC_QUYEN[0].nhay_cam = true; }, TypeError);
});

test('la_ma_muc_quyen', () => {
  assert.equal(S.la_ma_muc_quyen('luong'), true);
  assert.equal(S.la_ma_muc_quyen('khong_co'), false);
  assert.equal(S.la_ma_muc_quyen(null), false);
});

test('so_sanh_phien_ban', () => {
  assert.equal(S.so_sanh_phien_ban('0.1.0', '0.1.0'), 0);
  assert.equal(S.so_sanh_phien_ban('0.1.0', '0.2.0'), -1);
  assert.equal(S.so_sanh_phien_ban('1.0.0', '0.9.9'), 1);
  assert.equal(S.so_sanh_phien_ban('0.10.0', '0.9.0'), 1, 'so sánh số, không so sánh chuỗi');
  assert.equal(S.so_sanh_phien_ban('1.0.0-beta.1', '1.0.0'), -1);
  assert.equal(S.so_sanh_phien_ban('1.0.0', '1.0.0-beta.1'), 1);
  assert.equal(S.so_sanh_phien_ban(' 1.2.3 ', '1.2.3'), 0);
});

test('phan_tich_phien_ban từ chối chuỗi sai', () => {
  for (const x of ['', '1', '1.2', 'a.b.c', '1.2.3.4', '1.2.x', null, undefined, 5, '1.2.3-', '1.2.3-ab cd']) {
    assert.equal(S.phan_tich_phien_ban(x), null, String(x));
  }
  assert.throws(() => S.so_sanh_phien_ban('x', '1.0.0'), TypeError);
});
