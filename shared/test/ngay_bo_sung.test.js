"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../src/index");

test("ngay_vn: 03:00 sáng 01/11 giờ VN (= 20:00 UTC ngày 31/10) vẫn phải là ngày 01/11", () => {
  assert.equal(
    S.ngay_vn(new Date("2026-10-31T20:00:00Z")).toISOString().slice(0, 10),
    "2026-11-01",
  );
  assert.equal(
    S.ngay_vn(new Date("2026-10-31T16:59:00Z")).toISOString().slice(0, 10),
    "2026-10-31",
  );
});

test("con_hieu_luc: hết hiệu lực 31/10, xét sang ngày 01/11 theo giờ VN → đã hết", () => {
  const kl = {
    het_hieu_luc: S.chuan_hoa_ngay_kdd({ nam: 2026, thang: 10, ngay: 31 }),
  };
  assert.equal(
    S.con_hieu_luc(kl, S.ngay_vn(new Date("2026-10-31T20:00:00Z"))),
    false,
  );
  assert.equal(
    S.con_hieu_luc(kl, S.ngay_vn(new Date("2026-10-31T10:00:00Z"))),
    true,
  );
});

test("la_duoi_tuoi: ngày tham chiếu 29/02/2028 (năm nhuận)", () => {
  const ref = new Date(Date.UTC(2028, 1, 29));
  assert.equal(
    S.la_duoi_tuoi(
      S.chuan_hoa_ngay_kdd({ nam: 2022, thang: 3, ngay: 1 }),
      6,
      ref,
    ),
    true,
  );
  assert.equal(
    S.la_duoi_tuoi(
      S.chuan_hoa_ngay_kdd({ nam: 2022, thang: 2, ngay: 28 }),
      6,
      ref,
    ),
    false,
  );
});
