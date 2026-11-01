'use strict';
const { tao_kho_bo_nho } = require('./kho_bo_nho');
const { tao_gioi_han } = require('../../src/dich_vu/gioi_han_dang_nhap');
const { tao_dich_vu_nhat_ky } = require('../../src/dich_vu/nhat_ky');
const { tao_dich_vu_dang_nhap } = require('../../src/dich_vu/dang_nhap');

const GIOI_HAN = Object.freeze({ tai_khoan: 5, ip: 20, cua_so_ms: 15 * 60 * 1000 });

function tao_dong_ho_gia(bat_dau = Date.UTC(2026, 9, 18, 8, 0, 0)) {
  let ms = bat_dau;
  return { now: () => ms, tien: (them_ms) => { ms += them_ms; }, dat: (v) => { ms = v; } };
}

/** Băm giả: không cần bcrypt khi chỉ kiểm thử logic. dem_so_sanh đếm số lần "so mật khẩu" để kiểm tra thời gian/khóa. */
function tao_mat_khau_gia() {
  const tinh = { dem_so_sanh: 0 };
  return Object.assign(tinh, {
    async bam(mk) { return `bam:${mk}`; },
    async so_sanh(mk, bam) { tinh.dem_so_sanh += 1; return bam === `bam:${mk}`; },
    async so_sanh_gia() { tinh.dem_so_sanh += 1; return false; },
  });
}

function tao_token_gia() {
  return { ky: ({ id, so_phien_token }) => ({ token: `token_gia.${id}.${so_phien_token}`, het_han_luc: '2099-01-01T00:00:00.000Z' }) };
}

function tao_moi_truong() {
  const dong_ho = tao_dong_ho_gia();
  const kho = tao_kho_bo_nho();
  const nhat_ky_log = [];
  const log = { thong_tin() {}, canh_bao() {}, loi: (t, m) => nhat_ky_log.push({ t, m }) };
  const mat_khau = tao_mat_khau_gia();
  const gioi_han = tao_gioi_han({
    kho: kho.luot_dang_nhap, dong_ho: dong_ho.now,
    sai_toi_da_tai_khoan: GIOI_HAN.tai_khoan, sai_toi_da_ip: GIOI_HAN.ip, cua_so_ms: GIOI_HAN.cua_so_ms,
  });
  const nhat_ky = tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log, dong_ho: dong_ho.now });
  const dich_vu = tao_dich_vu_dang_nhap({
    kho_nguoi_dung: kho.nguoi_dung, gioi_han, nhat_ky, mat_khau, token: tao_token_gia(), bi_mat_tham_chieu: 'bi-mat-thu-nghiem', log,
  });
  return { dong_ho, kho, mat_khau, gioi_han, nhat_ky, dich_vu, log_loi: nhat_ky_log };
}

function them_tai_khoan(kho, ten, mat_khau, ghi_de = {}) {
  return kho.nguoi_dung.tao({
    ten_dang_nhap: ten, ten_hien_thi: ten, mat_khau_bam: `bam:${mat_khau}`, loai: 'admin',
    muc_duoc_xem: [], khoa: false, buoc_doi_mat_khau: false, so_lan_sai: 0, so_phien_token: 1, ...ghi_de,
  });
}

function thu_dang_nhap(dich_vu, ten, mat_khau, ip = '192.168.1.21') {
  return dich_vu.dang_nhap({ ten_dang_nhap: ten, mat_khau, ip, may: 'MAY-01', phien_ban_ung_dung: '0.1.0' });
}

module.exports = { GIOI_HAN, tao_dong_ho_gia, tao_mat_khau_gia, tao_token_gia, tao_moi_truong, them_tai_khoan, thu_dang_nhap };
