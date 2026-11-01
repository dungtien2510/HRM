'use strict';
const {
  LOAI_TAI_KHOAN, MA_MUC_QUYEN, MUC_LUON_CO_CHO_XEM_MOT_SO_MUC, la_ma_muc_quyen,
} = require('@hrm/shared');

/** Danh sách mục tài khoản được xem, theo thứ tự chuẩn. Loại lạ → không có mục nào (từ chối mặc định). */
function muc_duoc_xem(tai_khoan) {
  switch (tai_khoan && tai_khoan.loai) {
    case LOAI_TAI_KHOAN.ADMIN:
    case LOAI_TAI_KHOAN.XEM_DAY_DU:
      return [...MA_MUC_QUYEN];
    case LOAI_TAI_KHOAN.XEM_MOT_SO_MUC: {
      const duoc_cap = Array.isArray(tai_khoan.muc_duoc_xem) ? tai_khoan.muc_duoc_xem.filter(la_ma_muc_quyen) : [];
      const tap = new Set([...MUC_LUON_CO_CHO_XEM_MOT_SO_MUC, ...duoc_cap]);
      return MA_MUC_QUYEN.filter((m) => tap.has(m));
    }
    default:
      return [];
  }
}

function duoc_xem_muc(tai_khoan, muc) {
  return muc_duoc_xem(tai_khoan).includes(muc);
}

/** Chỉ admin được thêm, sửa, xóa, quản lý tài khoản, xem nhật ký, sao lưu. */
function co_quyen_ghi(tai_khoan) {
  return Boolean(tai_khoan) && tai_khoan.loai === LOAI_TAI_KHOAN.ADMIN;
}

/** Bản rút gọn của tài khoản để trả cho giao diện (không có mật khẩu băm hay số phiên). */
function ho_so_tai_khoan(tai_khoan) {
  return {
    id: String(tai_khoan._id),
    ten_dang_nhap: tai_khoan.ten_dang_nhap,
    ten_hien_thi: tai_khoan.ten_hien_thi || tai_khoan.ten_dang_nhap,
    loai: tai_khoan.loai,
    muc_duoc_xem: muc_duoc_xem(tai_khoan),
    quyen_ghi: co_quyen_ghi(tai_khoan),
    buoc_doi_mat_khau: Boolean(tai_khoan.buoc_doi_mat_khau), // giao diện phải buộc đổi mật khẩu trước khi dùng tiếp
  };
}

module.exports = { muc_duoc_xem, duoc_xem_muc, co_quyen_ghi, ho_so_tai_khoan };
