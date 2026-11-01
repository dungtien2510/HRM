"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const THU_MUC = path.join(__dirname, "..", "..", "deploy", "windows");

test("mọi file PowerShell bắt đầu bằng đúng một BOM UTF-8 và dòng 1 không chứa chuỗi chữ giả", () => {
  const ds = fs.readdirSync(THU_MUC).filter((x) => /\.ps(d)?1$/.test(x));
  assert.ok(ds.length >= 10, "không tìm thấy file PowerShell");
  for (const ten of ds) {
    const b = fs.readFileSync(path.join(THU_MUC, ten));
    assert.deepEqual(
      [...b.subarray(0, 3)],
      [0xef, 0xbb, 0xbf],
      `${ten}: thiếu BOM UTF-8`,
    );
    const dong_1 = b.subarray(3).toString("utf8").split(/\r?\n/)[0];
    assert.ok(!dong_1.includes("\\x"), `${ten}: dòng 1 còn chuỗi chữ giả`);
  }
});
