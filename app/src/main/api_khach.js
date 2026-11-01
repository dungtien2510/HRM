'use strict';
const { HEADER, MA_LOI } = require('@hrm/shared');
const { phan_loai_loi_mang } = require('./loi_mang');

const THOI_GIAN_CHO_MAC_DINH_MS = 10_000;

/**
 * Máy khách gọi API. Chạy trong tiến trình main:
 *  - token chỉ nằm trong bộ nhớ của main, renderer không bao giờ thấy;
 *  - gọi qua net.fetch của Electron (dùng kho chứng chỉ của Windows, không bị CORS);
 *  - không bao giờ ném lỗi qua IPC: trả { ok:true, du_lieu } hoặc { ok:false, ma, thong_diep, ... }.
 * `fetch_ham` có thể thay thế khi kiểm thử.
 */
function tao_api_khach({ lay_dia_chi, phien_ban, ten_may, tren_su_kien = () => {}, fetch_ham, dong_ho = Date.now }) {
  const goi_fetch = fetch_ham || ((url, tuy_chon) => require('electron').net.fetch(url, tuy_chon));
  let token = null;
  let trang_thai_ket_noi = { trang_thai: 'chua_ro' };

  function dat_ket_noi(moi) {
    const doi = moi.trang_thai !== trang_thai_ket_noi.trang_thai || moi.ma !== trang_thai_ket_noi.ma;
    trang_thai_ket_noi = moi;
    if (doi) tren_su_kien('ket_noi', moi);
  }

  function tieu_de_chung({ can_token, co_du_lieu }) {
    const tieu_de = { Accept: 'application/json', [HEADER.PHIEN_BAN_UNG_DUNG]: phien_ban, [HEADER.TEN_MAY]: ten_may };
    if (co_du_lieu) tieu_de['Content-Type'] = 'application/json';
    if (can_token && token) tieu_de.Authorization = `Bearer ${token}`;
    return tieu_de;
  }

  async function goi(phuong_thuc, duong_dan, { du_lieu, can_token = true, thoi_gian_cho_ms = THOI_GIAN_CHO_MAC_DINH_MS, dia_chi } = {}) {
    const goc = dia_chi || lay_dia_chi();
    if (!goc) return { ok: false, ma: 'CHUA_CAU_HINH_MAY_CHU', thong_diep: 'Chưa cấu hình địa chỉ máy chủ.' };

    let phan_hoi;
    try {
      phan_hoi = await goi_fetch(`${goc}${duong_dan}`, {
        method: phuong_thuc,
        headers: tieu_de_chung({ can_token, co_du_lieu: du_lieu !== undefined }),
        body: du_lieu !== undefined ? JSON.stringify(du_lieu) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(thoi_gian_cho_ms),
      });
    } catch (loi) {
      const p = phan_loai_loi_mang(loi);
      dat_ket_noi({ trang_thai: 'mat_ket_noi', ma: p.ma, thong_diep: p.thong_diep, goi_y: p.goi_y });
      return { ok: false, ma: p.ma, thong_diep: p.thong_diep, goi_y: p.goi_y, loi_mang: true };
    }

    let noi_dung = null;
    try { noi_dung = await phan_hoi.json(); } catch { noi_dung = null; }
    const may_chu_gap_su_co = phan_hoi.status === 503;
    dat_ket_noi(may_chu_gap_su_co
      ? { trang_thai: 'may_chu_gap_su_co', ma: MA_LOI.DICH_VU_KHONG_SAN_SANG, thong_diep: 'Máy chủ đang gặp sự cố (không truy cập được cơ sở dữ liệu).' }
      : { trang_thai: 'ket_noi_tot' });

    if (phan_hoi.ok) {
      if (noi_dung === null) return { ok: false, ma: 'PHAN_HOI_KHONG_HOP_LE', thong_diep: 'Máy chủ trả về dữ liệu không đọc được.' };
      return { ok: true, du_lieu: noi_dung };
    }

    const loi = noi_dung && noi_dung.loi ? noi_dung.loi : {};
    const ket_qua = {
      ok: false,
      trang_thai: phan_hoi.status,
      ma: typeof loi.ma === 'string' ? loi.ma : 'LOI_KHONG_RO',
      thong_diep: typeof loi.thong_diep === 'string' ? loi.thong_diep : 'Máy chủ trả về lỗi.',
    };
    if (Array.isArray(loi.chi_tiet)) ket_qua.chi_tiet = loi.chi_tiet;
    if (Number.isFinite(loi.thu_lai_sau_giay)) ket_qua.thu_lai_sau_giay = loi.thu_lai_sau_giay;
    if (typeof loi.phien_ban_toi_thieu === 'string') ket_qua.phien_ban_toi_thieu = loi.phien_ban_toi_thieu;

    if (phan_hoi.status === 426) {
      tren_su_kien('can_cap_nhat', { ma: ket_qua.ma, phien_ban_toi_thieu: ket_qua.phien_ban_toi_thieu || null, thong_diep: ket_qua.thong_diep });
    } else if (phan_hoi.status === 401 && can_token && token) {
      token = null;
      tren_su_kien('phien_het_han', { thong_diep: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return ket_qua;
  }

  return Object.freeze({
    da_dang_nhap: () => token !== null,
    trang_thai_ket_noi: () => trang_thai_ket_noi,

    /** Dùng ở màn hình cài đặt: kiểm tra kết nối + chứng chỉ của một địa chỉ CHƯA lưu. */
    async kiem_tra_may_chu(url) {
      const kq = await goi('GET', '/health', { can_token: false, dia_chi: url, thoi_gian_cho_ms: 8000 });
      if (kq.ok) return { ok: true, thong_diep: 'Kết nối thành công, chứng chỉ hợp lệ.' };
      if (kq.trang_thai === 503) return { ok: false, ma: 'MAY_CHU_GAP_SU_CO', thong_diep: 'Kết nối được tới máy chủ nhưng máy chủ đang gặp sự cố cơ sở dữ liệu.', goi_y: 'Báo quản trị kiểm tra dịch vụ MongoDB.' };
      return kq;
    },

    /** Kiểm tra định kỳ khi đang chạy: cập nhật trạng thái kết nối. */
    async kiem_tra_dinh_ky() {
      await goi('GET', '/health', { can_token: false, thoi_gian_cho_ms: 6000 });
      return trang_thai_ket_noi;
    },

    async dang_nhap(ten_dang_nhap, mat_khau) {
      const kq = await goi('POST', '/auth/login', { du_lieu: { ten_dang_nhap, mat_khau }, can_token: false });
      if (!kq.ok) return kq;
      token = kq.du_lieu.token;
      // Token ở lại trong main; renderer chỉ nhận thông tin hiển thị.
      return { ok: true, du_lieu: { tai_khoan: kq.du_lieu.tai_khoan, het_han_luc: kq.du_lieu.het_han_luc } };
    },

    dang_xuat() {
      token = null;
      return { ok: true };
    },

    async toi_la_ai() {
      if (!token) return { ok: false, ma: MA_LOI.CHUA_DANG_NHAP, thong_diep: 'Chưa đăng nhập.' };
      return goi('GET', '/auth/me');
    },
  });
}

module.exports = { tao_api_khach };
