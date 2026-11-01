"use strict";
/**
 * Hằng số dùng chung giữa server (API) và app (Electron).
 * Quy ước: tên không dấu, snake_case. Không đặt bí mật hay cấu hình môi trường ở đây.
 */

// ---- Loại tài khoản --------------------------------------------------------
const LOAI_TAI_KHOAN = Object.freeze({
  ADMIN: "admin",
  XEM_DAY_DU: "xem_day_du",
  XEM_MOT_SO_MUC: "xem_mot_so_muc",
});
const DANH_SACH_LOAI_TAI_KHOAN = Object.freeze(Object.values(LOAI_TAI_KHOAN));

// ---- Mục quyền (thứ tự cố định, 5 mục cuối là mục nhạy cảm) ----------------
const MUC_QUYEN = Object.freeze([
  Object.freeze({
    ma: "thong_tin_co_ban",
    ten: "Thông tin cơ bản",
    nhay_cam: false,
  }),
  Object.freeze({ ma: "lien_he", ten: "Liên hệ", nhay_cam: false }),
  Object.freeze({ ma: "than_nhan", ten: "Thân nhân", nhay_cam: false }),
  Object.freeze({
    ma: "qua_trinh_cong_tac",
    ten: "Quá trình công tác",
    nhay_cam: false,
  }),
  Object.freeze({ ma: "dao_tao", ten: "Đào tạo", nhay_cam: false }),
  Object.freeze({ ma: "khen_thuong", ten: "Khen thưởng", nhay_cam: false }),
  Object.freeze({ ma: "nghi_phep", ten: "Nghỉ phép", nhay_cam: true }),
  Object.freeze({ ma: "luong", ten: "Lương", nhay_cam: true }),
  Object.freeze({ ma: "ky_luat", ten: "Kỷ luật", nhay_cam: true }),
  Object.freeze({
    ma: "tien_an_tien_su",
    ten: "Tiền án, tiền sự",
    nhay_cam: true,
  }),
  Object.freeze({ ma: "so_can_cuoc", ten: "Số căn cước", nhay_cam: true }),
]);
const MA_MUC_QUYEN = Object.freeze(MUC_QUYEN.map((m) => m.ma));
const MA_MUC_NHAY_CAM = Object.freeze(
  MUC_QUYEN.filter((m) => m.nhay_cam).map((m) => m.ma),
);
/** Tài khoản xem_mot_so_muc luôn có các mục này, dù admin có cấp hay không. */
const MUC_LUON_CO_CHO_XEM_MOT_SO_MUC = Object.freeze(["thong_tin_co_ban"]);

function la_ma_muc_quyen(gia_tri) {
  return typeof gia_tri === "string" && MA_MUC_QUYEN.includes(gia_tri);
}

// ---- Mã lỗi API (cùng một bộ cho server và app) ----------------------------
const MA_LOI = Object.freeze({
  DU_LIEU_KHONG_HOP_LE: "DU_LIEU_KHONG_HOP_LE",
  CHUA_DANG_NHAP: "CHUA_DANG_NHAP",
  SAI_THONG_TIN_DANG_NHAP: "SAI_THONG_TIN_DANG_NHAP",
  TAM_KHOA: "TAM_KHOA",
  KHONG_CO_QUYEN: "KHONG_CO_QUYEN",
  CAN_DOI_MAT_KHAU: "CAN_DOI_MAT_KHAU",
  KHONG_TIM_THAY: "KHONG_TIM_THAY",
  CAN_CAP_NHAT: "CAN_CAP_NHAT",
  THIEU_PHIEN_BAN: "THIEU_PHIEN_BAN",
  DU_LIEU_QUA_LON: "DU_LIEU_QUA_LON",
  DICH_VU_KHONG_SAN_SANG: "DICH_VU_KHONG_SAN_SANG",
  LOI_MAY_CHU: "LOI_MAY_CHU",
});

// ---- Tên header HTTP (viết thường, đúng như Node nhận) ---------------------
const HEADER = Object.freeze({
  PHIEN_BAN_UNG_DUNG: "x-hrm-app-version",
  TEN_MAY: "x-hrm-may",
  MA_YEU_CAU: "x-request-id",
});

// ---- Hành động ghi vào nhat_ky ---------------------------------------------
const HANH_DONG_NHAT_KY = Object.freeze({
  DANG_NHAP: "dang_nhap",
  XEM_HO_SO: "xem_ho_so",
  SUA_DU_LIEU: "sua_du_lieu",
  XUAT_FILE: "xuat_file",
  CAP_QUYEN: "cap_quyen",
  TAO_TAI_KHOAN: "tao_tai_khoan",
});
const KET_QUA_NHAT_KY = Object.freeze({
  THANH_CONG: "thanh_cong",
  THAT_BAI: "that_bai",
  TU_CHOI: "tu_choi",
});

// ---- So sánh phiên bản ứng dụng (x.y.z, có thể kèm -tiền_phát_hành) -------
const MAU_PHIEN_BAN =
  /^(\d{1,6})\.(\d{1,6})\.(\d{1,6})(?:-([0-9A-Za-z.-]{1,32}))?$/;

/** Trả về {so:[x,y,z], tien_phat_hanh} hoặc null nếu không hợp lệ. */
function phan_tich_phien_ban(chuoi) {
  if (typeof chuoi !== "string") return null;
  const m = MAU_PHIEN_BAN.exec(chuoi.trim());
  if (!m) return null;
  return {
    so: [Number(m[1]), Number(m[2]), Number(m[3])],
    tien_phat_hanh: m[4] || null,
  };
}

/** -1 nếu a < b, 0 nếu bằng, 1 nếu a > b. Ném lỗi nếu chuỗi không hợp lệ. */
function so_sanh_phien_ban(a, b) {
  const pa = phan_tich_phien_ban(a);
  const pb = phan_tich_phien_ban(b);
  if (!pa || !pb) throw new TypeError("Phiên bản không hợp lệ");
  for (let i = 0; i < 3; i += 1) {
    if (pa.so[i] !== pb.so[i]) return pa.so[i] < pb.so[i] ? -1 : 1;
  }
  if (pa.tien_phat_hanh === pb.tien_phat_hanh) return 0;
  if (pa.tien_phat_hanh === null) return 1; // bản chính thức > bản tiền phát hành
  if (pb.tien_phat_hanh === null) return -1;
  return pa.tien_phat_hanh < pb.tien_phat_hanh ? -1 : 1;
}

module.exports = Object.freeze({
  LOAI_TAI_KHOAN,
  DANH_SACH_LOAI_TAI_KHOAN,
  MUC_QUYEN,
  MA_MUC_QUYEN,
  MA_MUC_NHAY_CAM,
  MUC_LUON_CO_CHO_XEM_MOT_SO_MUC,
  la_ma_muc_quyen,
  MA_LOI,
  HEADER,
  HANH_DONG_NHAT_KY,
  KET_QUA_NHAT_KY,
  phan_tich_phien_ban,
  so_sanh_phien_ban,
});
