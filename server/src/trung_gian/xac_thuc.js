"use strict";
const { Loi } = require("../tien_ich/loi_ung_dung");
// Khi tài khoản còn cờ buoc_doi_mat_khau, chỉ các yêu cầu này được đi tiếp (kiểm ở API, không dựa vào giao diện).
const DUOC_PHEP_KHI_CAN_DOI_MAT_KHAU = new Set([
  "GET /auth/me",
  "POST /auth/doi-mat-khau",
]);
const MAU_BEARER = /^Bearer ([A-Za-z0-9._-]{20,2048})$/;

/**
 * Xác thực JWT rồi đọc lại tài khoản từ CSDL: quyền luôn lấy từ CSDL (không tin token),
 * tài khoản bị khóa hoặc đã đổi so_phien_token thì token cũ mất hiệu lực ngay.
 */
function tao_trung_gian_xac_thuc({ token, kho_nguoi_dung }) {
  return async function xac_thuc(req, res, next) {
    const m = MAU_BEARER.exec(req.get("authorization") || "");
    if (!m) throw Loi.chua_dang_nhap();
    const noi_dung = token.xac_minh(m[1]);
    const tk = await kho_nguoi_dung.tim_theo_id(noi_dung.sub);
    if (!tk || tk.khoa === true || tk.so_phien_token !== noi_dung.pv)
      throw Loi.chua_dang_nhap();
    if (
      tk.buoc_doi_mat_khau === true &&
      !DUOC_PHEP_KHI_CAN_DOI_MAT_KHAU.has(
        `${req.method} ${req.baseUrl}${req.path}`,
      )
    )
      throw Loi.can_doi_mat_khau();
    req.nguoi_dung = tk; // bản ghi đầy đủ chỉ dùng trong máy chủ, không trả ra ngoài
    next();
  };
}

module.exports = { tao_trung_gian_xac_thuc };
