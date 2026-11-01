'use strict';
const { LoiUngDung, Loi } = require('../tien_ich/loi_ung_dung');

function la_loi_zod(loi) {
  return Boolean(loi) && loi.name === 'ZodError' && Array.isArray(loi.issues);
}

function khong_tim_thay(req, res, next) {
  next(Loi.khong_tim_thay());
}

/**
 * Xử lý lỗi thống nhất: { loi: { ma, thong_diep, chi_tiet?, ... }, ma_yeu_cau }.
 * Lỗi không lường trước chỉ ghi vào log máy chủ (đã che), người dùng nhận thông điệp chung.
 */
function tao_xu_ly_loi({ log }) {
  return function xu_ly_loi(err, req, res, next) {
    if (res.headersSent) return next(err);
    let loi;
    if (err instanceof LoiUngDung) {
      loi = err;
    } else if (la_loi_zod(err)) {
      loi = Loi.du_lieu_khong_hop_le(err.issues.map((v) => ({ truong: v.path.join('.'), thong_diep: v.message })));
    } else if (err && err.type === 'entity.too.large') {
      loi = Loi.du_lieu_qua_lon();
    } else if (err && (err.type === 'entity.parse.failed' || err.type === 'charset.unsupported' || err.type === 'encoding.unsupported')) {
      loi = Loi.du_lieu_khong_hop_le();
    } else {
      log.loi('Lỗi không lường trước', { ma_yeu_cau: req.ma_yeu_cau, duong_dan: req.path, phuong_thuc: req.method, loi: err });
      loi = Loi.loi_may_chu();
    }
    const phan_loi = { ma: loi.ma, thong_diep: loi.message };
    if (loi.chi_tiet) phan_loi.chi_tiet = loi.chi_tiet;
    if (loi.them) Object.assign(phan_loi, loi.them);
    if (loi.tieu_de) res.set(loi.tieu_de);
    return res.status(loi.trang_thai).json({ loi: phan_loi, ma_yeu_cau: req.ma_yeu_cau });
  };
}

module.exports = { khong_tim_thay, tao_xu_ly_loi };
