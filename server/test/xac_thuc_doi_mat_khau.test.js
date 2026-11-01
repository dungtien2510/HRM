"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { tao_trung_gian_xac_thuc } = require("../src/trung_gian/xac_thuc");

const TOKEN = "a".repeat(30);
function dung({ buoc_doi }) {
  const tk = {
    _id: "u1",
    khoa: false,
    so_phien_token: 1,
    buoc_doi_mat_khau: buoc_doi,
  };
  return tao_trung_gian_xac_thuc({
    token: { xac_minh: () => ({ sub: "u1", pv: 1 }) },
    kho_nguoi_dung: { tim_theo_id: async () => tk },
  });
}
const goi = (mw, method, baseUrl, path) => {
  const req = {
    method,
    baseUrl,
    path,
    get: (h) => (h === "authorization" ? `Bearer ${TOKEN}` : ""),
  };
  return new Promise((ok) =>
    mw(req, {}, () => ok("QUA")).catch((e) => ok(e.ma)),
  );
};

test("còn buoc_doi_mat_khau: chỉ /auth/me và /auth/doi-mat-khau đi qua, còn lại 403", async () => {
  const mw = dung({ buoc_doi: true });
  assert.equal(await goi(mw, "GET", "/auth", "/me"), "QUA");
  assert.equal(await goi(mw, "POST", "/auth", "/doi-mat-khau"), "QUA");
  assert.equal(await goi(mw, "GET", "/nhan-su", "/"), "CAN_DOI_MAT_KHAU");
  assert.equal(await goi(mw, "POST", "/nhan-su", "/"), "CAN_DOI_MAT_KHAU");
});

test("đã đổi mật khẩu: mọi yêu cầu đi qua", async () => {
  const mw = dung({ buoc_doi: false });
  assert.equal(await goi(mw, "GET", "/nhan-su", "/"), "QUA");
});
