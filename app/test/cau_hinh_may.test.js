'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { tao_cau_hinh_may } = require('../src/main/cau_hinh_may');

function thu_muc_tam(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-test-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

test('chưa có file → chưa cấu hình', (t) => {
  const ch = tao_cau_hinh_may(path.join(thu_muc_tam(t), 'cau_hinh_may.json'));
  assert.deepEqual(ch.doc(), { dia_chi_may_chu: null });
});

test('lưu rồi đọc lại; chỉ lưu địa chỉ máy chủ, không có gì khác', (t) => {
  const duong_dan = path.join(thu_muc_tam(t), 'con', 'cau_hinh_may.json');
  const ch = tao_cau_hinh_may(duong_dan);
  assert.equal(ch.luu_dia_chi_may_chu('hrm.tieudoantt.local'), 'https://hrm.tieudoantt.local:8443');
  assert.deepEqual(ch.doc(), { dia_chi_may_chu: 'https://hrm.tieudoantt.local:8443' });
  const tho = JSON.parse(fs.readFileSync(duong_dan, 'utf8'));
  assert.deepEqual(Object.keys(tho).sort(), ['dia_chi_may_chu', 'phien']);
  assert.equal(fs.existsSync(`${duong_dan}.tmp`), false, 'không để lại file tạm');
});

test('địa chỉ sai thì không ghi gì', (t) => {
  const duong_dan = path.join(thu_muc_tam(t), 'cau_hinh_may.json');
  const ch = tao_cau_hinh_may(duong_dan);
  assert.throws(() => ch.luu_dia_chi_may_chu('http://x.local'), /HTTPS/);
  assert.equal(fs.existsSync(duong_dan), false);
});

test('file hỏng hoặc bị sửa thành địa chỉ không an toàn → coi như chưa cấu hình', (t) => {
  const duong_dan = path.join(thu_muc_tam(t), 'cau_hinh_may.json');
  const ch = tao_cau_hinh_may(duong_dan);
  fs.writeFileSync(duong_dan, '{khong phai json');
  assert.deepEqual(ch.doc(), { dia_chi_may_chu: null });
  fs.writeFileSync(duong_dan, JSON.stringify({ dia_chi_may_chu: 'http://ke-xau.local' }));
  assert.deepEqual(ch.doc(), { dia_chi_may_chu: null });
});
