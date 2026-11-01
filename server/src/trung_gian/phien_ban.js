'use strict';
const { HEADER, phan_tich_phien_ban, so_sanh_phien_ban } = require('@hrm/shared');
const { Loi } = require('../tien_ich/loi_ung_dung');

/**
 * Đọc header phiên bản ứng dụng; thấp hơn phiên bản tối thiểu trong cau_hinh → 426.
 * Thiếu hoặc sai định dạng cũng bị từ chối: API chỉ dành cho ứng dụng HRM chính thức.
 */
function tao_trung_gian_phien_ban({ kiem_tra }) {
  return async function trung_gian_phien_ban(req, res, next) {
    const gia_tri = req.get(HEADER.PHIEN_BAN_UNG_DUNG);
    if (!phan_tich_phien_ban(gia_tri)) throw Loi.thieu_phien_ban();
    const toi_thieu = await kiem_tra.phien_ban_toi_thieu();
    if (so_sanh_phien_ban(gia_tri, toi_thieu) < 0) throw Loi.can_cap_nhat(toi_thieu);
    req.phien_ban_ung_dung = gia_tri.trim();
    next();
  };
}

module.exports = { tao_trung_gian_phien_ban };
