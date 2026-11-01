'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tao_noi_dung } = require('../scripts/tao_bang_truong');

test('docs/bang_truong_muc_quyen.md khớp với bảng khai báo (chạy "npm run bang_truong --workspace shared" nếu lệch)', () => {
  const tep = path.join(__dirname, '..', '..', 'docs', 'bang_truong_muc_quyen.md');
  assert.ok(fs.existsSync(tep), 'chưa có file tài liệu bảng trường');
  assert.equal(fs.readFileSync(tep, 'utf8'), tao_noi_dung());
});
