'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MA_MUC_QUYEN } = require('@hrm/shared');
const { muc_duoc_xem, duoc_xem_muc, co_quyen_ghi, ho_so_tai_khoan } = require('../src/dich_vu/phan_quyen');

test('admin và xem_day_du xem được cả 11 mục; chỉ admin được ghi', () => {
  assert.deepEqual(muc_duoc_xem({ loai: 'admin' }), MA_MUC_QUYEN);
  assert.deepEqual(muc_duoc_xem({ loai: 'xem_day_du' }), MA_MUC_QUYEN);
  assert.equal(co_quyen_ghi({ loai: 'admin' }), true);
  assert.equal(co_quyen_ghi({ loai: 'xem_day_du' }), false);
  assert.equal(co_quyen_ghi({ loai: 'xem_mot_so_muc' }), false);
  assert.equal(co_quyen_ghi(null), false);
});

test('xem_mot_so_muc luôn có thong_tin_co_ban dù admin không cấp', () => {
  assert.deepEqual(muc_duoc_xem({ loai: 'xem_mot_so_muc', muc_duoc_xem: [] }), ['thong_tin_co_ban']);
  assert.deepEqual(muc_duoc_xem({ loai: 'xem_mot_so_muc' }), ['thong_tin_co_ban']);
});

test('xem_mot_so_muc chỉ có các mục được cấp, đúng thứ tự chuẩn, bỏ mã lạ và trùng', () => {
  const tk = { loai: 'xem_mot_so_muc', muc_duoc_xem: ['luong', 'khong_co', 'lien_he', 'luong'] };
  assert.deepEqual(muc_duoc_xem(tk), ['thong_tin_co_ban', 'lien_he', 'luong']);
  assert.equal(duoc_xem_muc(tk, 'ky_luat'), false);
  assert.equal(duoc_xem_muc(tk, 'luong'), true);
});

test('loại tài khoản lạ hoặc thiếu → không có mục nào, không có quyền ghi', () => {
  assert.deepEqual(muc_duoc_xem({ loai: 'sieu_quan_tri' }), []);
  assert.deepEqual(muc_duoc_xem({}), []);
  assert.deepEqual(muc_duoc_xem(null), []);
  assert.equal(co_quyen_ghi({ loai: 'Admin' }), false);
});

test('ho_so_tai_khoan không lộ mật khẩu băm hay số phiên', () => {
  const ho_so = ho_so_tai_khoan({
    _id: 'abc', ten_dang_nhap: 'an', loai: 'xem_mot_so_muc', muc_duoc_xem: ['luong'],
    mat_khau_bam: 'bam:xyz', so_phien_token: 7,
  });
  assert.deepEqual(Object.keys(ho_so).sort(), ['buoc_doi_mat_khau', 'id', 'loai', 'muc_duoc_xem', 'quyen_ghi', 'ten_dang_nhap', 'ten_hien_thi']);
  assert.equal(ho_so.ten_hien_thi, 'an');
});
