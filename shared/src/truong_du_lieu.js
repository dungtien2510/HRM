"use strict";
/**
 * BẢNG KHAI BÁO TRƯỜNG → MỤC QUYỀN (nguồn duy nhất, quy tắc 2).
 * Từ bảng này sinh ra: JSON Schema validator của MongoDB, projection theo mục, kiểm tra trường được phép
 * dùng để lọc/sắp xếp/tìm kiếm/xuất. Thêm trường mới = thêm MỘT dòng ở đây rồi chạy `npm run nang_cap_csdl`.
 *
 * Quy ước:
 *  - muc: một trong 11 mục quyền, hoặc 'ky_thuat' (trường hệ thống, không thuộc mục nào, ai có quyền đọc hồ sơ cũng thấy).
 *  - bb: 'csdl'      = bắt buộc ở mức CSDL (validator từ chối nếu thiếu);
 *        'nghiep_vu' = bắt buộc theo biểu mẫu SYLL (kiểm tra ở API/giao diện, dùng để đếm "thiếu trường").
 *  - noi_bo: true = trường tính toán nội bộ (vd tim_kiem), KHÔNG bao giờ trả ra giao diện.
 *  - Trường kiểu 'mang' là mảng tài liệu nhúng; mỗi phần tử có `id` (ObjectId) để sửa/xóa đúng dòng,
 *    và mỗi trường con có mục quyền riêng (vd than_nhan.so_can_cuoc thuộc so_can_cuoc, không thuộc than_nhan).
 *  - Giá trị "đã khai là không" của trường chữ: chuỗi 'Không' (GIA_TRI_KHONG). null/vắng mặt = chưa khai.
 */
const { MA_MUC_QUYEN } = require("./hang_so");

const KY_THUAT = "ky_thuat";
const GIA_TRI_KHONG = "Không";
const TTCB = "thong_tin_co_ban";
const LH = "lien_he";
const TN = "than_nhan";
const QTCT = "qua_trinh_cong_tac";
const DT = "dao_tao";
const KT = "khen_thuong";
const NP = "nghi_phep";
const L = "luong";
const KL = "ky_luat";
const TATS = "tien_an_tien_su";
const SCC = "so_can_cuoc";

// ---- hàm khai báo ngắn gọn ------------------------------------------------
const chuoi = (muc, o = {}) => ({ kieu: "chuoi", muc, ...o });
const so_thuc = (muc, o = {}) => ({ kieu: "so", muc, ...o });
const so_nguyen = (muc, o = {}) => ({ kieu: "so_nguyen", muc, ...o });
const tien = (muc, o = {}) => ({ kieu: "tien", muc, ...o });
const luan_ly = (muc, o = {}) => ({ kieu: "bool", muc, ...o });
const ngay = (muc, o = {}) => ({ kieu: "ngay", muc, ...o });
const ngay_kdd = (muc, o = {}) => ({ kieu: "ngay_kdd", muc, ...o });
const dia_chi = (muc, o = {}) => ({ kieu: "dia_chi", muc, ...o });
const liet_ke = (muc, gia_tri, o = {}) => ({
  kieu: "enum",
  muc,
  gia_tri: Object.freeze([...gia_tri]),
  ...o,
});
const co_mo_ta = (muc, o = {}) => ({ kieu: "co_mo_ta", muc, ...o });
const ma_doi_tuong = (muc, o = {}) => ({ kieu: "object_id", muc, ...o });
const mang = (muc, truong, o = {}) => ({
  kieu: "mang",
  muc,
  truong: { id: ma_doi_tuong(muc, { bb: "csdl" }), ...truong },
  ...o,
});

const MAU_SO_DIEN_THOAI = "^[0-9]{9,11}$"; // mẫu thực tế có số 9 và 11 chữ số → nới 9–11, API cảnh báo nếu ≠ 10

const NHAN_SU = {
  ten: "nhan_su",
  truong: {
    // --- kỹ thuật ---
    _id: ma_doi_tuong(KY_THUAT, { bb: "csdl" }),
    version: so_nguyen(KY_THUAT, { bb: "csdl", nho_nhat: 1 }),
    created_at: ngay(KY_THUAT, { bb: "csdl" }),
    updated_at: ngay(KY_THUAT, { bb: "csdl" }),
    la_mau: luan_ly(KY_THUAT), // true = hồ sơ mẫu (giả), xóa được hàng loạt
    //
    da_xoa: luan_ly(KY_THUAT), // xóa mềm: true = đã xóa, không hiện trong danh sách
    xoa_luc: ngay(KY_THUAT), // thời điểm xóa mềm (null nếu chưa xóa)
    // --- thong_tin_co_ban (luôn hiển thị với mọi loại tài khoản) ---
    ma_nhan_vien: chuoi(TTCB, {
      bb: "csdl",
      toi_da: 20,
      mau: "^[A-Za-z0-9_-]{3,20}$",
    }),
    so_hieu: chuoi(TTCB, { toi_da: 30 }),
    ho_ten_khai_sinh: chuoi(TTCB, { bb: "csdl", toi_da: 120 }),
    ten_goi_khac: chuoi(TTCB, { toi_da: 120, co_khong: true }),
    ngay_sinh: ngay_kdd(TTCB, { bb: "csdl" }),
    gioi_tinh: liet_ke(TTCB, ["nam", "nu"], { bb: "csdl" }),
    noi_dang_ky_khai_sinh: dia_chi(TTCB, { bb: "nghiep_vu" }),
    noi_dang_ky_khai_sinh_sau_sap_nhap: dia_chi(TTCB),
    que_quan: dia_chi(TTCB, { bb: "nghiep_vu" }),
    que_quan_sau_sap_nhap: dia_chi(TTCB),
    dan_toc: chuoi(TTCB, { bb: "nghiep_vu", toi_da: 50 }),
    ton_giao: chuoi(TTCB, { toi_da: 50, co_khong: true }),
    chuc_vu: chuoi(TTCB, { toi_da: 150 }),
    bo_phan: chuoi(TTCB, { bb: "csdl", toi_da: 150 }),
    trang_thai_nhan_su: liet_ke(
      TTCB,
      ["dang_lam_viec", "tam_nghi", "nghi_viec", "nghi_huu"],
      { bb: "csdl" },
    ),
    anh_4x6_id: ma_doi_tuong(TTCB),
    tim_kiem: chuoi(TTCB, { bb: "csdl", toi_da: 700, noi_bo: true }), // bỏ dấu, thường: tên + tên gọi khác + mã + số hiệu

    // --- lien_he ---
    noi_thuong_tru: dia_chi(LH, { bb: "nghiep_vu" }),
    noi_o_hien_nay: dia_chi(LH, { bb: "nghiep_vu" }),
    so_dien_thoai: chuoi(LH, { toi_da: 11, mau: MAU_SO_DIEN_THOAI }),
    mang_xa_hoi: mang(
      LH,
      {
        nen_tang: chuoi(LH, { toi_da: 30 }),
        tai_khoan: chuoi(LH, { toi_da: 100 }),
        so_dien_thoai: chuoi(LH, { toi_da: 11, mau: MAU_SO_DIEN_THOAI }),
      },
      { toi_da_phan_tu: 10 },
    ),

    // --- so_can_cuoc (nhạy cảm) ---
    so_can_cuoc: chuoi(SCC, {
      bb: "nghiep_vu",
      toi_da: 12,
      mau: "^[0-9]{9,12}$",
    }),
    ngay_cap_can_cuoc: ngay(SCC),
    noi_cap_can_cuoc: chuoi(SCC, { toi_da: 150 }),

    // --- qua_trinh_cong_tac ---
    cap_uy_hien_tai: chuoi(QTCT, { toi_da: 100, co_khong: true }),
    cap_uy_kiem_nhiem: chuoi(QTCT, { toi_da: 100, co_khong: true }),
    ngay_bo_nhiem: ngay_kdd(QTCT),
    ngay_bo_nhiem_lai: ngay_kdd(QTCT),
    chuc_vu_kiem_nhiem: chuoi(QTCT, { toi_da: 150, co_khong: true }),
    nghe_nghiep_truoc_tuyen_dung: chuoi(QTCT, { toi_da: 150 }),
    ngay_tuyen_dung_lan_dau: ngay_kdd(QTCT, { bb: "nghiep_vu" }),
    co_quan_tuyen_dung_lan_dau: chuoi(QTCT, { toi_da: 200 }),
    ngay_tuyen_dung_lan_sau: ngay_kdd(QTCT),
    co_quan_tuyen_dung_lan_sau: chuoi(QTCT, { toi_da: 200 }),
    ngay_vao_co_quan_hien_nay: ngay_kdd(QTCT),
    ngay_vao_dang: ngay_kdd(QTCT),
    ngay_vao_dang_chinh_thuc: ngay_kdd(QTCT),
    ngay_nhap_ngu: ngay_kdd(QTCT),
    ngay_xuat_ngu: ngay_kdd(QTCT),
    ngay_tai_ngu: ngay_kdd(QTCT),
    quan_ham_chuc_vu_cao_nhat: chuoi(QTCT, { toi_da: 200 }),
    ngach_chuc_danh: chuoi(QTCT, { toi_da: 150 }),
    so_truong_cong_tac: chuoi(QTCT, { toi_da: 300 }),
    cong_viec_lam_lau_nhat: chuoi(QTCT, { toi_da: 300 }),
    qua_trinh_truoc_tuyen_dung: mang(
      QTCT,
      {
        tu: ngay_kdd(QTCT, { bb: "csdl" }),
        den: ngay_kdd(QTCT),
        noi_dung: chuoi(QTCT, { bb: "csdl", toi_da: 500 }),
      },
      { toi_da_phan_tu: 60 },
    ),
    qua_trinh_cong_tac: mang(
      QTCT,
      {
        tu: ngay_kdd(QTCT, { bb: "csdl" }),
        den: ngay_kdd(QTCT), // null + dang_dien_ra = "nay"
        dang_dien_ra: luan_ly(QTCT),
        noi_dung: chuoi(QTCT, { bb: "csdl", toi_da: 600 }),
        chuc_danh: chuoi(QTCT, { toi_da: 200 }),
        don_vi_cong_tac: chuoi(QTCT, { toi_da: 300 }),
      },
      { toi_da_phan_tu: 60 },
    ),
    chien_dau: mang(
      QTCT,
      {
        tu: ngay_kdd(QTCT),
        den: ngay_kdd(QTCT),
        ten_chien_dich_tran_danh: chuoi(QTCT, { toi_da: 300 }),
        chien_truong_dia_diem: chuoi(QTCT, { toi_da: 300 }),
        chuc_vu_don_vi: chuoi(QTCT, { toi_da: 300 }),
        hinh_thuc_tac_chien: chuoi(QTCT, { toi_da: 300 }),
      },
      { toi_da_phan_tu: 60 },
    ),

    // --- dao_tao ---
    giao_duc_pho_thong: chuoi(DT, { toi_da: 30 }),
    nam_tot_nghiep_pho_thong: ngay_kdd(DT),
    chuyen_mon_nghiep_vu: chuoi(DT, { toi_da: 200 }),
    ly_luan_chinh_tri: chuoi(DT, { toi_da: 200 }),
    hoc_ham_hoc_vi_cao_nhat: chuoi(DT, { toi_da: 200 }),
    ngoai_ngu: chuoi(DT, { toi_da: 200 }),
    tin_hoc: chuoi(DT, { toi_da: 200 }),
    tieng_dan_toc_thieu_so: chuoi(DT, { toi_da: 200 }),
    quan_ly_nha_nuoc: chuoi(DT, { toi_da: 200 }),
    boi_duong_chuc_danh_nghe_nghiep: chuoi(DT, { toi_da: 300 }),
    dao_tao: mang(
      DT,
      {
        ten_co_so_dao_tao: chuoi(DT, { bb: "csdl", toi_da: 300 }),
        nganh_hoc_ten_lop: chuoi(DT, { toi_da: 300 }),
        tu: ngay_kdd(DT, { bb: "csdl" }),
        den: ngay_kdd(DT),
        dang_dien_ra: luan_ly(DT),
        hinh_thuc_dao_tao: chuoi(DT, { toi_da: 100 }),
        van_bang_chung_chi: chuoi(DT, { toi_da: 200 }),
      },
      { toi_da_phan_tu: 60 },
    ),

    // --- khen_thuong ---
    danh_hieu_duoc_phong: chuoi(KT, { toi_da: 300 }),
    khen_thuong: mang(
      KT,
      {
        thoi_diem: ngay_kdd(KT, { bb: "csdl" }),
        so_quyet_dinh: chuoi(KT, { toi_da: 100 }),
        co_quan_quyet_dinh: chuoi(KT, { toi_da: 200 }),
        hinh_thuc_khen_thuong: chuoi(KT, { toi_da: 200 }),
        danh_hieu_thi_dua: chuoi(KT, { toi_da: 200 }),
      },
      { toi_da_phan_tu: 100 },
    ),

    // --- luong (nhạy cảm) ---
    ma_so_ngach: chuoi(L, { toi_da: 30 }),
    phu_cap_chuc_vu: so_thuc(L, { nho_nhat: 0 }),
    phu_cap_kiem_nhiem: so_thuc(L, { nho_nhat: 0 }),
    phu_cap_khac: chuoi(L, { toi_da: 200 }),
    so_so_bhxh: chuoi(L, { toi_da: 20 }),
    so_the_bhyt: chuoi(L, { toi_da: 20 }),
    luong: mang(
      L,
      {
        tu: ngay_kdd(L, { bb: "csdl" }),
        den: ngay_kdd(L),
        dang_dien_ra: luan_ly(L),
        ma_so: chuoi(L, { toi_da: 30 }),
        bac_luong: chuoi(L, { toi_da: 30 }),
        he_so_luong: so_thuc(L, { bb: "csdl", nho_nhat: 0 }),
        tien_luong_vi_tri_viec_lam: tien(L),
      },
      { toi_da_phan_tu: 100 },
    ),

    // --- ky_luat (nhạy cảm) ---
    ky_luat: mang(
      KL,
      {
        loai: liet_ke(KL, ["dang", "chinh_quyen"], { bb: "csdl" }),
        thoi_diem: ngay_kdd(KL, { bb: "csdl" }),
        het_hieu_luc: ngay_kdd(KL), // null = chưa ghi ngày hết hiệu lực → coi là còn hiệu lực
        so_quyet_dinh: chuoi(KL, { toi_da: 100 }),
        co_quan_ban_hanh: chuoi(KL, { toi_da: 200 }),
        hinh_thuc: chuoi(KL, { bb: "csdl", toi_da: 200 }),
        hanh_vi_vi_pham: chuoi(KL, { toi_da: 500 }),
      },
      { toi_da_phan_tu: 50 },
    ),

    // --- tien_an_tien_su (nhạy cảm) ---
    tien_an_tien_su: mang(
      TATS,
      {
        loai: liet_ke(TATS, ["tien_an", "tien_su"], { bb: "csdl" }),
        thoi_diem: ngay_kdd(TATS, { bb: "csdl" }),
        so_ban_an_quyet_dinh: chuoi(TATS, { toi_da: 100 }),
        co_quan_ban_hanh: chuoi(TATS, { toi_da: 200 }),
        hinh_thuc: chuoi(TATS, { toi_da: 200 }),
        hanh_vi_vi_pham: chuoi(TATS, { toi_da: 500 }),
      },
      { toi_da_phan_tu: 20 },
    ),

    // --- than_nhan ---
    doi_tuong_chinh_sach: chuoi(TN, { toi_da: 300 }),
    co_yeu_to_nuoc_ngoai: co_mo_ta(TN),
    lanh_dao_than_nhan_nuoc_ngoai: co_mo_ta(TN),
    than_nhan: mang(
      TN,
      {
        nhom: liet_ke(TN, ["cua_ban_than", "cua_vo_chong"], { bb: "csdl" }),
        quan_he: liet_ke(
          TN,
          ["cha", "me", "nguoi_nuoi_duong", "vo", "chong", "con", "anh_chi_em"],
          { bb: "csdl" },
        ),
        chi_tiet_quan_he: liet_ke(TN, [
          "de",
          "nuoi",
          "dau",
          "re",
          "anh",
          "chi",
          "em",
        ]),
        ho_ten: chuoi(TN, { bb: "csdl", toi_da: 120 }),
        gioi_tinh: liet_ke(TN, ["nam", "nu"]),
        ngay_sinh: ngay_kdd(TN, { bb: "nghiep_vu" }),
        so_can_cuoc: chuoi(SCC, { toi_da: 12, mau: "^[0-9]{9,12}$" }), // căn cước của thân nhân thuộc mục so_can_cuoc
        dan_toc: chuoi(TN, { toi_da: 50 }),
        ton_giao: chuoi(TN, { toi_da: 50, co_khong: true }),
        quoc_tich: chuoi(TN, { toi_da: 50 }),
        que_quan: dia_chi(TN),
        noi_thuong_tru: dia_chi(TN),
        noi_o_hien_nay: dia_chi(TN),
        nghe_nghiep_noi_lam_viec: chuoi(TN, { toi_da: 300 }),
        thai_do_chinh_tri: chuoi(TN, { toi_da: 500 }),
        lien_quan_che_do_cu: chuoi(TN, { toi_da: 500, co_khong: true }),
        tien_an: chuoi(TATS, { toi_da: 500, co_khong: true }), // "Tiền án (nếu có)" của thân nhân thuộc mục tien_an_tien_su
        nam_ket_hon_ly_hon: { kieu: "ket_hon", muc: TN },
        la_nguoi_phu_thuoc: luan_ly(TN),
        tim_kiem: chuoi(TN, { bb: "csdl", toi_da: 150, noi_bo: true }),
      },
      { toi_da_phan_tu: 60 },
    ),
  },
};

const NGHI_PHEP = {
  ten: "nghi_phep",
  truong: {
    _id: ma_doi_tuong(KY_THUAT, { bb: "csdl" }),
    created_at: ngay(KY_THUAT, { bb: "csdl" }),
    updated_at: ngay(KY_THUAT, { bb: "csdl" }),
    la_mau: luan_ly(KY_THUAT),
    nhan_su_id: ma_doi_tuong(NP, { bb: "csdl" }),
    tu_ngay: ngay(NP, { bb: "csdl" }),
    den_ngay: ngay(NP, { bb: "csdl" }),
    loai_phep: liet_ke(
      NP,
      ["phep_nam", "nghi_om", "thai_san", "viec_rieng", "khong_luong", "khac"],
      { bb: "csdl" },
    ),
    so_ngay: so_thuc(NP, { nho_nhat: 0 }),
    ghi_chu: chuoi(NP, { toi_da: 500 }),
  },
};

const BANG_TRUONG = { nhan_su: NHAN_SU, nghi_phep: NGHI_PHEP };

/** Đóng băng đệ quy: bảng khai báo là nguồn duy nhất, không được sửa lúc chạy. */
function dong_bang(doi_tuong) {
  if (doi_tuong === null || typeof doi_tuong !== "object") return doi_tuong;
  for (const v of Object.values(doi_tuong)) dong_bang(v);
  return Object.freeze(doi_tuong);
}
dong_bang(BANG_TRUONG);

// ---- duyệt bảng khai báo ---------------------------------------------------
function kiem_tra_khai_bao_truong(ten, k) {
  if (!["ky_thuat", ...MA_MUC_QUYEN].includes(k.muc))
    throw new Error(`Mục quyền không hợp lệ ở ${ten}: ${k.muc}`);
}

/** Danh sách "lá" (trường cuối cùng, không phải mảng): { duong_dan, muc, kieu, bb, noi_bo, mang_cha }. */
function lam_phang(khai_bao) {
  const kq = [];
  const duyet = (truong, tien_to, mang_cha) => {
    for (const [ten, k] of Object.entries(truong)) {
      const duong_dan = tien_to ? `${tien_to}.${ten}` : ten;
      if (k.kieu === "mang") {
        duyet(k.truong, duong_dan, duong_dan);
      } else {
        kiem_tra_khai_bao_truong(duong_dan, k);
        kq.push({
          duong_dan,
          muc: k.muc,
          kieu: k.kieu,
          bb: k.bb || null,
          noi_bo: Boolean(k.noi_bo),
          mang_cha: mang_cha || null,
        });
      }
    }
  };
  duyet(khai_bao.truong, "", null);
  return kq;
}

function lay_khai_bao(collection) {
  const kb = BANG_TRUONG[collection];
  if (!kb)
    throw new Error(`Collection chưa có bảng khai báo trường: ${collection}`);
  return kb;
}

const bo_nho_lam_phang = new Map();
function la_phang_cua(collection) {
  if (!bo_nho_lam_phang.has(collection))
    bo_nho_lam_phang.set(
      collection,
      Object.freeze(lam_phang(lay_khai_bao(collection))),
    );
  return bo_nho_lam_phang.get(collection);
}

/**
 * Projection MongoDB (dạng "bao gồm") chỉ gồm các trường thuộc những mục được xem + trường kỹ thuật.
 * Danh sách trắng: trường nào chưa khai báo thì KHÔNG bao giờ được trả ra. Trường nội bộ (tim_kiem) bị loại.
 */
function tao_projection(
  muc_duoc_xem,
  { collection = "nhan_su", gom_noi_bo = false } = {},
) {
  const duoc = new Set(
    Array.isArray(muc_duoc_xem)
      ? muc_duoc_xem.filter((m) => MA_MUC_QUYEN.includes(m))
      : [],
  );
  const kq = {};
  for (const l of la_phang_cua(collection)) {
    if (l.noi_bo && !gom_noi_bo) continue;
    if (l.muc === KY_THUAT || duoc.has(l.muc)) kq[l.duong_dan] = 1;
  }
  return kq;
}

function chi_muc_duong_dan(collection) {
  const bang = new Map();
  for (const l of la_phang_cua(collection)) bang.set(l.duong_dan, l);
  return bang;
}
const bo_nho_chi_muc = new Map();
function bang_duong_dan(collection) {
  if (!bo_nho_chi_muc.has(collection))
    bo_nho_chi_muc.set(collection, chi_muc_duong_dan(collection));
  return bo_nho_chi_muc.get(collection);
}

/**
 * Tìm mục của một đường dẫn truy vấn. Cho phép đường dẫn đi sâu vào trong một lá kiểu đối tượng
 * (vd 'ngay_sinh.ngay_chuan_hoa', 'than_nhan.ngay_sinh.nam') và bỏ qua chỉ số mảng ('than_nhan.0.ho_ten', '$').
 * Trả về { muc, noi_bo, ... } hoặc null nếu đường dẫn chưa được khai báo (→ phải từ chối).
 */
function tim_truong(collection, duong_dan) {
  if (typeof duong_dan !== "string" || duong_dan === "") return null;
  const doan = duong_dan
    .split(".")
    .filter((d) => !/^(\d+|\$|\$\[\w*\])$/.test(d));
  const bang = bang_duong_dan(collection);
  let hien_tai = "";
  for (const d of doan) {
    hien_tai = hien_tai ? `${hien_tai}.${d}` : d;
    if (bang.has(hien_tai)) return bang.get(hien_tai);
  }
  return null;
}

function muc_cua_duong_dan(collection, duong_dan) {
  const l = tim_truong(collection, duong_dan);
  return l ? l.muc : null;
}

/** Dùng cho lọc, sắp xếp, tìm kiếm, xuất file: đường dẫn này có được phép với các mục đã cho không? */
function kiem_tra_truong_truy_van(collection, muc_duoc_xem, duong_dan) {
  const l = tim_truong(collection, duong_dan);
  if (!l) return { ok: false, ly_do: "truong_chua_khai_bao" };
  if (l.muc === KY_THUAT) return { ok: true, muc: l.muc };
  if (!Array.isArray(muc_duoc_xem) || !muc_duoc_xem.includes(l.muc))
    return { ok: false, ly_do: "khong_co_quyen_muc", muc: l.muc };
  return { ok: true, muc: l.muc };
}

/** Bản trong bộ nhớ của projection: giữ lại các trường được phép (phòng thủ nhiều lớp, và để kiểm thử). */
function loc_tai_lieu_theo_muc(
  collection,
  doc,
  muc_duoc_xem,
  { gom_noi_bo = false } = {},
) {
  const duoc = new Set(
    Array.isArray(muc_duoc_xem)
      ? muc_duoc_xem.filter((m) => MA_MUC_QUYEN.includes(m))
      : [],
  );
  const cho_phep = (k) =>
    (k.muc === KY_THUAT || duoc.has(k.muc)) && (gom_noi_bo || !k.noi_bo);
  const loc = (truong, nguon) => {
    const kq = {};
    for (const [ten, k] of Object.entries(truong)) {
      if (nguon[ten] === undefined) continue;
      if (k.kieu === "mang") {
        if (!Array.isArray(nguon[ten])) continue;
        const phan_tu = nguon[ten]
          .map((p) => loc(k.truong, p))
          .filter((p) => Object.keys(p).length > 0);
        if (phan_tu.length > 0) kq[ten] = phan_tu;
      } else if (cho_phep(k)) {
        kq[ten] = nguon[ten];
      }
    }
    return kq;
  };
  return loc(lay_khai_bao(collection).truong, doc);
}

/** Tên các trường bắt buộc theo biểu mẫu ('nghiep_vu') ở mức đầu — để đếm "thiếu trường" theo quyền. */
function liet_ke_bat_buoc(collection, bb) {
  return la_phang_cua(collection)
    .filter((l) => l.bb === bb)
    .map((l) => l.duong_dan);
}

module.exports = Object.freeze({
  KY_THUAT,
  GIA_TRI_KHONG,
  BANG_TRUONG,
  lam_phang,
  liet_ke_truong: (collection) => la_phang_cua(collection),
  tao_projection,
  tim_truong,
  muc_cua_duong_dan,
  kiem_tra_truong_truy_van,
  loc_tai_lieu_theo_muc,
  liet_ke_bat_buoc,
});
