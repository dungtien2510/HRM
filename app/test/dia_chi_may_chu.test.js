'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chuan_hoa_dia_chi_may_chu: chuan } = require('../src/main/dia_chi_may_chu');

test('chuẩn hóa các dạng nhập hợp lệ', () => {
  assert.equal(chuan('hrm.tieudoantt.local').url, 'https://hrm.tieudoantt.local:8443');
  assert.equal(chuan('  HRM.TieuDoanTT.local  ').url, 'https://hrm.tieudoantt.local:8443');
  assert.equal(chuan('https://hrm.tieudoantt.local/').url, 'https://hrm.tieudoantt.local:8443');
  assert.equal(chuan('HTTPS://hrm.tieudoantt.local:9443///').url, 'https://hrm.tieudoantt.local:9443');
  assert.equal(chuan('192.168.1.20:8443').url, 'https://192.168.1.20:8443');
  assert.equal(chuan('127.0.0.1').url, 'https://127.0.0.1:8443');
  assert.equal(chuan('hrm.tieudoantt.local:443').url, 'https://hrm.tieudoantt.local:443', 'cổng 443 gõ rõ được giữ lại');
  assert.equal(chuan('[::1]:8443').url, 'https://[::1]:8443');
});

test('từ chối HTTP, đường dẫn, tài khoản, tham số, ký tự lạ, cổng sai', () => {
  const sai = [
    'http://hrm.tieudoantt.local', 'ftp://x', 'hrm.local/duong/dan', 'hrm.local?x=1', 'user:pass@hrm.local',
    'hrm local', 'hrm.local:0', 'hrm.local:70000', 'hrm.local:abc', '', '   ', '<script>', 'a'.repeat(301), '.hrm', 'hrm.local#x',
  ];
  for (const s of sai) assert.equal(chuan(s).ok, false, JSON.stringify(s));
  assert.equal(chuan(null).ok, false);
  assert.equal(chuan(123).ok, false);
  assert.match(chuan('http://x.local').thong_diep, /HTTPS/);
});
