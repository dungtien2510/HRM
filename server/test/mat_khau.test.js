'use strict';
// Cần đã chạy `npm install` (dùng bcrypt).
const test = require('node:test');
const assert = require('node:assert/strict');
const { tao_dich_vu_mat_khau, kiem_tra_do_manh } = require('../src/dich_vu/mat_khau');

test('bam và so_sanh bằng bcrypt', async () => {
  const dv = tao_dich_vu_mat_khau({ cost: 4 });
  const bam = await dv.bam('MatKhau-Rat-Dai-123');
  assert.match(bam, /^\$2[aby]\$04\$/);
  assert.equal(await dv.so_sanh('MatKhau-Rat-Dai-123', bam), true);
  assert.equal(await dv.so_sanh('mat-khau-sai', bam), false);
  assert.equal(await dv.so_sanh_gia('bat-ky'), false);
});

test('kiem_tra_do_manh', () => {
  assert.deepEqual(kiem_tra_do_manh('Mk-An-Toan-2026!', 'admin'), []);
  assert.ok(kiem_tra_do_manh('ngan').length > 0);
  assert.ok(kiem_tra_do_manh('a'.repeat(30)).some((l) => /đơn giản/.test(l)));
  assert.ok(kiem_tra_do_manh('Dai-Qua-'.repeat(12)).some((l) => /72 byte/.test(l)));
  assert.ok(kiem_tra_do_manh('xxAdminxx-Mat-Khau', 'admin').some((l) => /tên đăng nhập/.test(l)));
  assert.ok(kiem_tra_do_manh('123456789012').length > 0);
  assert.ok(kiem_tra_do_manh(null).length > 0);
});
