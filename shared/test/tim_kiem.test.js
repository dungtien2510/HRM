'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/index.js');

test('bo_dau: đ/Đ → d/D, bỏ dấu mọi nguyên âm', () => {
  assert.equal(S.bo_dau('Đặng Thị Hương'), 'Dang Thi Huong');
  assert.equal(S.bo_dau('đường Trần Hưng Đạo'), 'duong Tran Hung Dao');
  assert.equal(S.bo_dau('ƯỚC ƠI ẨM'), 'UOC OI AM');
});

test('bo_dau xử lý cả dạng chữ tổ hợp và dạng chữ dựng sẵn như nhau', () => {
  const dung_san = 'Nguyễn Văn Đức'.normalize('NFC');
  const to_hop = 'Nguyễn Văn Đức'.normalize('NFD');
  assert.equal(S.chuan_hoa_tim_kiem(dung_san), 'nguyen van duc');
  assert.equal(S.chuan_hoa_tim_kiem(to_hop), 'nguyen van duc');
});

test('chuan_hoa_tim_kiem: thường hóa và gọn khoảng trắng (cả tab, xuống dòng)', () => {
  assert.equal(S.chuan_hoa_tim_kiem('  Trần   Thị\tMỹ\nLinh  '), 'tran thi my linh');
  assert.equal(S.chuan_hoa_tim_kiem(''), '');
});

test('tao_tim_kiem: ghép các phần, bỏ rỗng/null/undefined', () => {
  assert.equal(S.tao_tim_kiem('Nguyễn Văn An', null, 'MAU0001', undefined, '   ', '20.364.26'), 'nguyen van an mau0001 20.364.26');
  assert.equal(S.tao_tim_kiem(), '');
});

test('gon_khoang_trang giữ nguyên dấu, chuẩn NFC', () => {
  assert.equal(S.gon_khoang_trang('  Đà   Nẵng '), 'Đà Nẵng');
  assert.equal(S.gon_khoang_trang('Nguyễn'.normalize('NFD')), 'Nguyễn'.normalize('NFC'));
});
