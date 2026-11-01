"use strict";
/**
 * Ngày không đầy đủ (quy tắc 6): lưu {nam, thang?, ngay?} kèm ngày chuẩn hóa để lọc/sắp xếp.
 *  - ngay_chuan_hoa = NGÀY ĐẦU của kỳ, lúc 00:00 UTC (chỉ có năm → 01/01, có tháng → ngày 01 của tháng).
 *  - do_chinh_xac: 'ngay' | 'thang' | 'nam' để bản in giữ đúng độ chính xác đã nhập.
 * `thang` là tùy chọn (Q9): có giá trị chỉ có năm như "năm tốt nghiệp", "năm kết hôn".
 */

const NAM_NHO_NHAT = 1900;
const NAM_LON_NHAT = 2100;
const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

function la_so_nguyen(x) {
  return typeof x === "number" && Number.isInteger(x);
}

function so_ngay_trong_thang(nam, thang) {
  return new Date(Date.UTC(nam, thang, 0)).getUTCDate(); // ngày 0 của tháng sau = ngày cuối tháng này
}

/** Kiểm tra và chuẩn hóa. Ném RangeError (thông điệp tiếng Việt) nếu không hợp lệ. */
function chuan_hoa_ngay_kdd(dau_vao) {
  if (dau_vao === null || typeof dau_vao !== "object")
    throw new RangeError("Ngày phải là đối tượng {nam, thang?, ngay?}.");
  const { nam, thang, ngay } = dau_vao;
  const co_thang = thang !== undefined && thang !== null;
  const co_ngay = ngay !== undefined && ngay !== null;
  if (!la_so_nguyen(nam) || nam < NAM_NHO_NHAT || nam > NAM_LON_NHAT)
    throw new RangeError(
      `Năm phải là số nguyên từ ${NAM_NHO_NHAT} đến ${NAM_LON_NHAT}.`,
    );
  if (co_thang && (!la_so_nguyen(thang) || thang < 1 || thang > 12))
    throw new RangeError("Tháng phải từ 1 đến 12.");
  if (co_ngay && !co_thang) throw new RangeError("Có ngày thì phải có tháng.");
  if (
    co_ngay &&
    (!la_so_nguyen(ngay) || ngay < 1 || ngay > so_ngay_trong_thang(nam, thang))
  ) {
    throw new RangeError(
      `Ngày không hợp lệ: tháng ${thang}/${nam} chỉ có ${so_ngay_trong_thang(nam, thang)} ngày.`,
    );
  }
  const ket_qua = { nam };
  if (co_thang) ket_qua.thang = thang;
  if (co_ngay) ket_qua.ngay = ngay;
  ket_qua.ngay_chuan_hoa = new Date(
    Date.UTC(nam, (co_thang ? thang : 1) - 1, co_ngay ? ngay : 1),
  );
  ket_qua.do_chinh_xac = co_ngay ? "ngay" : co_thang ? "thang" : "nam";
  return ket_qua;
}

/** Hiểu chuỗi người dùng gõ: "dd/mm/yyyy", "d/m/yyyy", "mm/yyyy", "yyyy". Trả về đối tượng đã chuẩn hóa. */
function tu_chuoi_ngay(chuoi) {
  const s = String(chuoi).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m)
    return chuan_hoa_ngay_kdd({
      nam: Number(m[3]),
      thang: Number(m[2]),
      ngay: Number(m[1]),
    });
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return chuan_hoa_ngay_kdd({ nam: Number(m[2]), thang: Number(m[1]) });
  m = /^(\d{4})$/.exec(s);
  if (m) return chuan_hoa_ngay_kdd({ nam: Number(m[1]) });
  throw new RangeError(
    "Định dạng ngày không hợp lệ (dùng dd/mm/yyyy, mm/yyyy hoặc yyyy).",
  );
}

/** Ngày cuối của kỳ (00:00 UTC) — dùng khi cần "hết hạn vào cuối tháng/năm". */
function ngay_cuoi_ky(kdd) {
  const { nam, thang, ngay } = kdd;
  if (ngay !== undefined && ngay !== null)
    return new Date(Date.UTC(nam, thang - 1, ngay));
  if (thang !== undefined && thang !== null)
    return new Date(Date.UTC(nam, thang - 1, so_ngay_trong_thang(nam, thang)));
  return new Date(Date.UTC(nam, 11, 31));
}

/** Số tuổi tròn năm tại ngày tham chiếu, tính theo ngay_chuan_hoa (đầu kỳ). */
function tuoi_tai(kdd, ngay_tham_chieu) {
  const sinh = kdd.ngay_chuan_hoa;
  let tuoi = ngay_tham_chieu.getUTCFullYear() - sinh.getUTCFullYear();
  const chua_den_sinh_nhat =
    ngay_tham_chieu.getUTCMonth() < sinh.getUTCMonth() ||
    (ngay_tham_chieu.getUTCMonth() === sinh.getUTCMonth() &&
      ngay_tham_chieu.getUTCDate() < sinh.getUTCDate());
  if (chua_den_sinh_nhat) tuoi -= 1;
  return tuoi;
}

/**
 * Mốc ngày sinh: ai sinh SAU mốc này (ngay_chuan_hoa > mốc) thì chưa đủ `so_tuoi` tuổi tại ngày tham chiếu.
 * Dùng cho truy vấn: { 'than_nhan.ngay_sinh.ngay_chuan_hoa': { $gt: moc } }.
 */
// function moc_sinh_cho_duoi_tuoi(so_tuoi, ngay_tham_chieu) {
//   const moc = new Date(ngay_tham_chieu.getTime());
//   moc.setUTCFullYear(moc.getUTCFullYear() - so_tuoi);
//   return moc;
// }
function moc_sinh_cho_duoi_tuoi(so_tuoi, ngay_tham_chieu) {
  const nam = ngay_tham_chieu.getUTCFullYear() - so_tuoi;
  const thang = ngay_tham_chieu.getUTCMonth();
  // 29/02 của năm nhuận: lùi N năm có thể rơi vào năm không nhuận → lấy ngày cuối tháng 2
  const ngay = Math.min(
    ngay_tham_chieu.getUTCDate(),
    so_ngay_trong_thang(nam, thang + 1),
  );
  return new Date(Date.UTC(nam, thang, ngay));
}

/** "Hôm nay" theo giờ Việt Nam, trả về 00:00 UTC của ngày đó (để so với ngày chuẩn hóa trong CSDL). */
function ngay_vn(bay_gio = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  })
    .format(bay_gio)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function la_duoi_tuoi(kdd, so_tuoi, ngay_tham_chieu) {
  return (
    kdd.ngay_chuan_hoa.getTime() >
    moc_sinh_cho_duoi_tuoi(so_tuoi, ngay_tham_chieu).getTime()
  );
}

/**
 * Kỷ luật còn hiệu lực tại ngày tham chiếu?
 *  - het_hieu_luc null/thiếu: chưa ghi ngày hết hiệu lực → coi là CÒN hiệu lực;
 *  - có ngày: còn hiệu lực đến hết kỳ (cuối ngày/tháng/năm đã ghi).
 */
function con_hieu_luc(ky_luat, ngay_tham_chieu) {
  if (!ky_luat.het_hieu_luc) return true;
  return (
    ngay_cuoi_ky(ky_luat.het_hieu_luc).getTime() >=
    ngay_tham_chieu.getTime() - (ngay_tham_chieu.getTime() % MS_MOT_NGAY)
  );
}

module.exports = Object.freeze({
  chuan_hoa_ngay_kdd,
  tu_chuoi_ngay,
  ngay_cuoi_ky,
  so_ngay_trong_thang,
  tuoi_tai,
  moc_sinh_cho_duoi_tuoi,
  la_duoi_tuoi,
  ngay_vn,
  con_hieu_luc,
});
