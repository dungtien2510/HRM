"use strict";
/**
 * Chỉ mục của từng collection. Tên chỉ mục cố định để chạy lại không tạo trùng.
 * Mỗi chỉ mục phục vụ một nhu cầu rõ ràng (ghi chú bên cạnh).
 */
const CHI_MUC = Object.freeze({
  nhan_su: [
    {
      ten: "ma_nhan_vien_duy_nhat",
      khoa: { ma_nhan_vien: 1 },
      tuy_chon: { unique: true },
    }, // tra cứu theo mã, không trùng
    {
      ten: "so_can_cuoc_duy_nhat",
      khoa: { so_can_cuoc: 1 },
      tuy_chon: {
        unique: true,
        partialFilterExpression: { so_can_cuoc: { $type: "string" } },
      },
    }, // chống trùng căn cước
    { ten: "bo_phan", khoa: { bo_phan: 1 }, tuy_chon: {} }, // lọc theo bộ phận
    { ten: "tim_kiem", khoa: { tim_kiem: 1 }, tuy_chon: {} }, // tìm theo tên đã bỏ dấu
    {
      ten: "than_nhan_ngay_sinh",
      khoa: { "than_nhan.ngay_sinh.ngay_chuan_hoa": 1 },
      tuy_chon: {},
    }, // "có con dưới N tuổi"
    {
      ten: "khen_thuong_thoi_diem",
      khoa: { "khen_thuong.thoi_diem.ngay_chuan_hoa": 1 },
      tuy_chon: {},
    }, // báo cáo khen thưởng theo kỳ
  ],
  nghi_phep: [
    {
      ten: "nhan_su_tu_den",
      khoa: { nhan_su_id: 1, tu_ngay: 1, den_ngay: 1 },
      tuy_chon: {},
    },
  ],
  nguoi_dung: [
    {
      ten: "ten_dang_nhap_duy_nhat",
      khoa: { ten_dang_nhap: 1 },
      tuy_chon: { unique: true },
    },
    {
      ten: "chi_mot_admin",
      khoa: { loai: 1 },
      tuy_chon: { unique: true, partialFilterExpression: { loai: "admin" } },
    }, // đúng một admin
  ],
  nhat_ky: [
    { ten: "thoi_diem_giam", khoa: { thoi_diem: -1 }, tuy_chon: {} },
    {
      ten: "tai_khoan_thoi_diem",
      khoa: { "tai_khoan.id": 1, thoi_diem: -1 },
      tuy_chon: {},
    },
  ],
  cau_hinh: [],
  luot_dang_nhap: [
    { ten: "khoa_luc", khoa: { khoa: 1, luc: 1 }, tuy_chon: {} },
    {
      ten: "tu_xoa_khi_het_han",
      khoa: { het_han: 1 },
      tuy_chon: { expireAfterSeconds: 0 },
    },
  ],
});

/** Các collection của ứng dụng theo thứ tự tạo. Năm collection nghiệp vụ + luot_dang_nhap (vận hành). */
const DANH_SACH_COLLECTION = Object.freeze([
  "nhan_su",
  "nghi_phep",
  "nguoi_dung",
  "nhat_ky",
  "cau_hinh",
  "luot_dang_nhap",
]);

module.exports = { CHI_MUC, DANH_SACH_COLLECTION };
