'use strict';
/** Hàm thuần chuyển dữ liệu từ cấu trúc Bước 1 sang Bước 2 (tách riêng để kiểm thử không cần CSDL). */
const { DANH_SACH_LOAI_TAI_KHOAN, la_ma_muc_quyen } = require('@hrm/shared');
const { tao_cau_hinh_mac_dinh } = require('../cau_truc');

const MAU_TEN_DANG_NHAP = /^[a-z0-9._-]{3,32}$/;
const MAU_BCRYPT = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;

/** tai_khoan (Bước 1) → nguoi_dung (Bước 2). Giữ nguyên _id để token và nhật ký cũ vẫn khớp. */
function chuyen_tai_khoan_v1(cu, bay_gio) {
  const khoa = typeof cu.khoa === 'boolean' ? cu.khoa : (cu.trang_thai !== undefined && cu.trang_thai !== 'hoat_dong');
  const muc = Array.isArray(cu.muc_duoc_xem) ? cu.muc_duoc_xem : (Array.isArray(cu.cac_muc_duoc_xem) ? cu.cac_muc_duoc_xem : []);
  return {
    _id: cu._id,
    ten_dang_nhap: cu.ten_dang_nhap,
    ten_hien_thi: cu.ten_hien_thi || cu.ten_dang_nhap,
    mat_khau_bam: cu.mat_khau_bam,
    loai: cu.loai,
    muc_duoc_xem: [...new Set(muc.filter(la_ma_muc_quyen))],
    khoa,
    buoc_doi_mat_khau: typeof cu.buoc_doi_mat_khau === 'boolean' ? cu.buoc_doi_mat_khau : false,
    so_lan_sai: Number.isInteger(cu.so_lan_sai) && cu.so_lan_sai >= 0 ? cu.so_lan_sai : 0,
    lan_sai_cuoi: cu.lan_sai_cuoi || null,
    dang_nhap_cuoi: cu.dang_nhap_cuoi || null,
    so_phien_token: Number.isInteger(cu.so_phien_token) && cu.so_phien_token >= 1 ? cu.so_phien_token : 1,
    created_at: cu.created_at || cu.tao_luc || bay_gio,
    updated_at: cu.updated_at || cu.sua_luc || bay_gio,
  };
}

/** Các vấn đề khiến một tai_khoan cũ không chuyển được (rỗng = chuyển được). */
function kiem_tra_tai_khoan_v1(cu) {
  const loi = [];
  if (typeof cu.ten_dang_nhap !== 'string' || !MAU_TEN_DANG_NHAP.test(cu.ten_dang_nhap)) loi.push('tên đăng nhập không hợp lệ');
  if (typeof cu.mat_khau_bam !== 'string' || !MAU_BCRYPT.test(cu.mat_khau_bam)) loi.push('mật khẩu băm không phải bcrypt');
  if (!DANH_SACH_LOAI_TAI_KHOAN.includes(cu.loai)) loi.push(`loại tài khoản lạ: ${String(cu.loai)}`);
  return loi;
}

/** cau_hinh (Bước 1: phien_ban_toi_thieu, tao_luc/sua_luc) → cấu trúc Bước 2. Giữ giá trị đang dùng, thêm trường còn thiếu. */
function chuyen_cau_hinh_v1(cu, bay_gio) {
  const mac_dinh = tao_cau_hinh_mac_dinh({ bay_gio, schema_version: 1 });
  return {
    _id: 'he_thong',
    ten_don_vi: typeof cu.ten_don_vi === 'string' && cu.ten_don_vi ? cu.ten_don_vi : mac_dinh.ten_don_vi,
    schema_version: Number.isInteger(cu.schema_version) ? cu.schema_version : 1,
    phien_ban_toi_thieu: cu.phien_ban_toi_thieu || mac_dinh.phien_ban_toi_thieu,
    cai_dat_sao_luu: cu.cai_dat_sao_luu || mac_dinh.cai_dat_sao_luu,
    created_at: cu.created_at || cu.tao_luc || bay_gio,
    updated_at: cu.updated_at || cu.sua_luc || bay_gio,
  };
}

module.exports = { chuyen_tai_khoan_v1, kiem_tra_tai_khoan_v1, chuyen_cau_hinh_v1 };
