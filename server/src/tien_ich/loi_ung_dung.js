"use strict";
const { MA_LOI } = require("@hrm/shared");

/** Lỗi có chủ đích: thông điệp an toàn để trả cho người dùng. */
class LoiUngDung extends Error {
  constructor(
    ma,
    thong_diep,
    { trang_thai = 400, chi_tiet = null, tieu_de = null, them = null } = {},
  ) {
    super(thong_diep);
    this.name = "LoiUngDung";
    this.ma = ma;
    this.trang_thai = trang_thai;
    this.chi_tiet = chi_tiet; // mảng {truong, thong_diep} cho lỗi kiểm tra dữ liệu
    this.tieu_de = tieu_de; // header phản hồi thêm (vd Retry-After)
    this.them = them; // trường công khai thêm vào phần "loi" của phản hồi
  }
}

const Loi = Object.freeze({
  du_lieu_khong_hop_le: (chi_tiet = null) =>
    new LoiUngDung(
      MA_LOI.DU_LIEU_KHONG_HOP_LE,
      "Dữ liệu gửi lên không hợp lệ.",
      { trang_thai: 400, chi_tiet },
    ),
  du_lieu_qua_lon: () =>
    new LoiUngDung(MA_LOI.DU_LIEU_QUA_LON, "Dữ liệu gửi lên quá lớn.", {
      trang_thai: 413,
    }),
  chua_dang_nhap: () =>
    new LoiUngDung(
      MA_LOI.CHUA_DANG_NHAP,
      "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
      { trang_thai: 401 },
    ),
  sai_thong_tin_dang_nhap: () =>
    new LoiUngDung(
      MA_LOI.SAI_THONG_TIN_DANG_NHAP,
      "Tên đăng nhập hoặc mật khẩu không đúng.",
      { trang_thai: 401 },
    ),
  tam_khoa: (thu_lai_sau_giay) =>
    new LoiUngDung(
      MA_LOI.TAM_KHOA,
      "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
      {
        trang_thai: 429,
        tieu_de: { "Retry-After": String(thu_lai_sau_giay) },
        them: { thu_lai_sau_giay },
      },
    ),
  khong_co_quyen: () =>
    new LoiUngDung(
      MA_LOI.KHONG_CO_QUYEN,
      "Bạn không có quyền thực hiện thao tác này.",
      { trang_thai: 403 },
    ),
  //thêm
  can_doi_mat_khau: () =>
    new LoiUngDung(
      MA_LOI.CAN_DOI_MAT_KHAU,
      "Bạn cần đổi mật khẩu trước khi tiếp tục.",
      { trang_thai: 403 },
    ),
  //
  khong_tim_thay: () =>
    new LoiUngDung(MA_LOI.KHONG_TIM_THAY, "Không tìm thấy nội dung yêu cầu.", {
      trang_thai: 404,
    }),
  thieu_phien_ban: () =>
    new LoiUngDung(
      MA_LOI.THIEU_PHIEN_BAN,
      "Yêu cầu không kèm phiên bản ứng dụng hợp lệ. Vui lòng dùng ứng dụng HRM chính thức.",
      { trang_thai: 426 },
    ),
  can_cap_nhat: (phien_ban_toi_thieu) =>
    new LoiUngDung(
      MA_LOI.CAN_CAP_NHAT,
      "Phiên bản ứng dụng đã cũ. Vui lòng cập nhật ứng dụng để tiếp tục.",
      {
        trang_thai: 426,
        them: { phien_ban_toi_thieu },
      },
    ),
  dich_vu_khong_san_sang: () =>
    new LoiUngDung(
      MA_LOI.DICH_VU_KHONG_SAN_SANG,
      "Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
      { trang_thai: 503 },
    ),
  loi_may_chu: () =>
    new LoiUngDung(
      MA_LOI.LOI_MAY_CHU,
      "Có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau.",
      { trang_thai: 500 },
    ),
});

module.exports = { LoiUngDung, Loi };
