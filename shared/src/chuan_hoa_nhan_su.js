"use strict";
const { gon_khoang_trang, tao_tim_kiem } = require("./tim_kiem");
const { chuan_hoa_ngay_kdd } = require("./ngay");
const { BANG_TRUONG, GIA_TRI_KHONG } = require("./truong_du_lieu");

// function chuan_hoa_ngay_thuong(gia_tri, duong_dan) {
//   const d = gia_tri instanceof Date ? gia_tri : new Date(gia_tri);
//   if (Number.isNaN(d.getTime())) throw new RangeError(`${duong_dan}: ngày không hợp lệ`);
//   return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); // về 00:00 UTC
// }

function chuan_hoa_ngay_thuong(gia_tri, duong_dan) {
  let d;
  if (gia_tri instanceof Date) d = gia_tri;
  else if (typeof gia_tri === "string" && /^\d{4}-\d{2}-\d{2}$/.test(gia_tri)) {
    d = new Date(`${gia_tri}T00:00:00Z`);
    // JavaScript tự "cuộn" 31/02 thành 03/03 nên phải đối chiếu lại với chuỗi gốc
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== gia_tri)
      throw new RangeError(`${duong_dan}: ngày không tồn tại (${gia_tri})`);
  } else throw new RangeError(`${duong_dan}: ngày phải có dạng yyyy-mm-dd`);
  if (Number.isNaN(d.getTime()))
    throw new RangeError(`${duong_dan}: ngày không hợp lệ`);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ); // về 00:00 UTC
}

function chuan_hoa_dia_chi(gia_tri, duong_dan) {
  if (typeof gia_tri !== "object" || Array.isArray(gia_tri))
    throw new TypeError(`${duong_dan}: địa chỉ phải là đối tượng`);
  const gon = (v) =>
    typeof v === "string" && gon_khoang_trang(v) !== ""
      ? gon_khoang_trang(v)
      : null;
  const ket_qua = {
    so_nha_duong: gon(gia_tri.so_nha_duong),
    xa_phuong: gon(gia_tri.xa_phuong),
    tinh_tp: gon(gia_tri.tinh_tp),
    van_ban_goc: gon(gia_tri.van_ban_goc),
  };
  if (!ket_qua.van_ban_goc)
    ket_qua.van_ban_goc =
      [ket_qua.so_nha_duong, ket_qua.xa_phuong, ket_qua.tinh_tp]
        .filter(Boolean)
        .join(", ") || null;
  return ket_qua.van_ban_goc ? ket_qua : null; // địa chỉ rỗng hoàn toàn → coi như chưa khai
}

function chuan_hoa_truong(k, gia_tri, duong_dan, tuy_chon) {
  if (gia_tri === undefined || gia_tri === null) return gia_tri;
  switch (k.kieu) {
    case "chuoi": {
      if (typeof gia_tri !== "string")
        throw new TypeError(`${duong_dan}: phải là chuỗi`);
      const s = gon_khoang_trang(gia_tri);
      return s === "" ? null : s; // không lưu chuỗi rỗng: null = chưa khai, 'Không' = đã khai là không
    }
    case "ngay_kdd":
      try {
        return chuan_hoa_ngay_kdd(gia_tri);
      } catch (loi) {
        throw new RangeError(`${duong_dan}: ${loi.message}`);
      }
    case "ngay":
      return chuan_hoa_ngay_thuong(gia_tri, duong_dan);
    case "dia_chi":
      return chuan_hoa_dia_chi(gia_tri, duong_dan);
    case "mang":
      if (!Array.isArray(gia_tri))
        throw new TypeError(`${duong_dan}: phải là mảng`);
      return gia_tri.map((p, i) =>
        chuan_hoa_doi_tuong(k.truong, p, `${duong_dan}[${i}]`, tuy_chon),
      );
    default:
      return gia_tri;
  }
}

function chuan_hoa_doi_tuong(truong, nguon, duong_dan, tuy_chon) {
  if (nguon === null || typeof nguon !== "object" || Array.isArray(nguon))
    throw new TypeError(`${duong_dan || "hồ sơ"}: phải là đối tượng`);
  const kq = {};
  for (const [ten, gia_tri] of Object.entries(nguon)) {
    const k = truong[ten];
    // Trường chưa khai báo được giữ nguyên để validator của CSDL từ chối (không âm thầm nuốt mất).
    kq[ten] = k
      ? chuan_hoa_truong(
          k,
          gia_tri,
          duong_dan ? `${duong_dan}.${ten}` : ten,
          tuy_chon,
        )
      : gia_tri;
  }
  if (
    truong.id &&
    kq.id === undefined &&
    tuy_chon &&
    typeof tuy_chon.tao_id === "function"
  )
    kq.id = tuy_chon.tao_id();
  return kq;
}

/** Trường tim_kiem của hồ sơ: tên khai sinh + tên gọi khác + mã nhân viên + số hiệu (chỉ dữ liệu thuộc thong_tin_co_ban). */
function tao_tim_kiem_nhan_su(ho_so) {
  return tao_tim_kiem(
    ho_so.ho_ten_khai_sinh,
    ho_so.ten_goi_khac === GIA_TRI_KHONG ? null : ho_so.ten_goi_khac,
    ho_so.ma_nhan_vien,
    ho_so.so_hieu,
  );
}

/**
 * Chuẩn hóa một hồ sơ nhân sự trước khi ghi vào CSDL (không sửa đối tượng đầu vào):
 *  - gọn chuỗi (chuỗi rỗng → null), mã nhân viên viết hoa;
 *  - mọi ngày không đủ → {nam, thang?, ngay?, ngay_chuan_hoa, do_chinh_xac};
 *  - tính tim_kiem cho hồ sơ và cho từng thân nhân;
 *  - (tùy chọn) gán id cho phần tử mảng chưa có id: { tao_id: () => new ObjectId() }.
 * version/created_at/updated_at do lớp ghi dữ liệu đặt.
 */
function chuan_hoa_nhan_su(ho_so, tuy_chon = {}) {
  const kq = chuan_hoa_doi_tuong(
    BANG_TRUONG.nhan_su.truong,
    ho_so,
    "",
    tuy_chon,
  );
  if (typeof kq.ma_nhan_vien === "string")
    kq.ma_nhan_vien = kq.ma_nhan_vien.toUpperCase();
  kq.tim_kiem = tao_tim_kiem_nhan_su(kq);
  if (Array.isArray(kq.than_nhan))
    kq.than_nhan = kq.than_nhan.map((p) => ({
      ...p,
      tim_kiem: tao_tim_kiem(p.ho_ten),
    }));
  return kq;
}

/** Chuẩn hóa một bản ghi nghỉ phép (ngày đầy đủ về 00:00 UTC, gọn chuỗi). */
function chuan_hoa_nghi_phep(ban_ghi, tuy_chon = {}) {
  return chuan_hoa_doi_tuong(
    BANG_TRUONG.nghi_phep.truong,
    ban_ghi,
    "",
    tuy_chon,
  );
}

module.exports = Object.freeze({
  chuan_hoa_nhan_su,
  chuan_hoa_nghi_phep,
  tao_tim_kiem_nhan_su,
});
