'use strict';

/** Gom khoảng trắng thừa, bỏ khoảng trắng đầu/cuối, chuẩn Unicode NFC. Dùng để lưu chuỗi. */
function gon_khoang_trang(chuoi) {
  return String(chuoi).normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Bỏ dấu tiếng Việt: á→a, ư→u, đ/Đ→d; không đổi chữ hoa/thường. */
function bo_dau(chuoi) {
  return String(chuoi)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Dạng dùng để tìm kiếm: bỏ dấu, đ→d, viết thường, gọn khoảng trắng. */
function chuan_hoa_tim_kiem(chuoi) {
  return gon_khoang_trang(bo_dau(chuoi)).toLowerCase();
}

/** Ghép nhiều chuỗi thành trường tim_kiem (bỏ phần rỗng/null). */
function tao_tim_kiem(...cac_chuoi) {
  return cac_chuoi
    .filter((c) => c !== null && c !== undefined && String(c).trim() !== '')
    .map(chuan_hoa_tim_kiem)
    .filter(Boolean)
    .join(' ');
}

module.exports = Object.freeze({ gon_khoang_trang, bo_dau, chuan_hoa_tim_kiem, tao_tim_kiem });
