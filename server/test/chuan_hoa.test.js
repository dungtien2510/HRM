'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chuan_hoa_ip, chuan_hoa_ten_may, chuan_hoa_ten_dang_nhap } = require('../src/tien_ich/chuan_hoa');

test('chuan_hoa_ip bỏ tiền tố IPv4-mapped', () => {
  assert.equal(chuan_hoa_ip('::ffff:192.168.1.21'), '192.168.1.21');
  assert.equal(chuan_hoa_ip('192.168.1.22'), '192.168.1.22');
  assert.equal(chuan_hoa_ip(undefined), 'khong_ro');
  assert.equal(chuan_hoa_ip(''), 'khong_ro');
});

test('chuan_hoa_ten_may chỉ nhận tên an toàn', () => {
  assert.equal(chuan_hoa_ten_may(' MAY-NHANSU_01 '), 'MAY-NHANSU_01');
  assert.equal(chuan_hoa_ten_may('may nhan su'), null);
  assert.equal(chuan_hoa_ten_may('<script>'), null);
  assert.equal(chuan_hoa_ten_may('a'.repeat(64)), null);
  assert.equal(chuan_hoa_ten_may(null), null);
});

test('chuan_hoa_ten_dang_nhap: thường hóa, bỏ khoảng trắng, chuẩn Unicode', () => {
  assert.equal(chuan_hoa_ten_dang_nhap('  AdMin '), 'admin');
  assert.equal(chuan_hoa_ten_dang_nhap('Nguye\u0302\u0303n'), 'nguy\u00ea\u0303n'.normalize('NFC'));
});
