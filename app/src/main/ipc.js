'use strict';
const { fileURLToPath } = require('node:url');
const path = require('node:path');
const { chuan_hoa_dia_chi_may_chu } = require('./dia_chi_may_chu');

const la_chuoi = (x, toi_da) => typeof x === 'string' && x.length <= toi_da;

/** Chỉ nhận IPC từ khung chính của trang renderer do chính ứng dụng nạp (file index.html). */
function la_nguon_tin_cay(su_kien, duong_dan_index) {
  try {
    const khung = su_kien && su_kien.senderFrame;
    if (!khung || (su_kien.sender && khung !== su_kien.sender.mainFrame)) return false;
    const url = new URL(khung.url);
    return url.protocol === 'file:' && path.resolve(fileURLToPath(url)) === path.resolve(duong_dan_index);
  } catch {
    return false;
  }
}

/**
 * Đăng ký các kênh IPC. Mỗi kênh kiểm tra nguồn gửi và kiểu dữ liệu; chỉ mở đúng những việc giao diện cần.
 */
function dang_ky_ipc({ ipcMain, api, cau_hinh_may, hang_so, phien_ban_ung_dung, duong_dan_index, bat_dau_kiem_tra_dinh_ky }) {
  const KHONG_HOP_LE = { ok: false, ma: 'YEU_CAU_KHONG_HOP_LE', thong_diep: 'Yêu cầu không hợp lệ.' };

  function xu_ly(kenh, ham) {
    ipcMain.handle(kenh, async (su_kien, ...doi_so) => {
      if (!la_nguon_tin_cay(su_kien, duong_dan_index)) return KHONG_HOP_LE;
      try {
        return await ham(...doi_so);
      } catch {
        return { ok: false, ma: 'LOI_UNG_DUNG', thong_diep: 'Có lỗi trong ứng dụng. Vui lòng thử lại.' };
      }
    });
  }

  xu_ly('hrm:lay_hang_so', async () => hang_so);
  xu_ly('hrm:phien_ban_ung_dung', async () => phien_ban_ung_dung);
  xu_ly('hrm:cau_hinh_may', async () => cau_hinh_may.doc());

  xu_ly('hrm:kiem_tra_va_luu_may_chu', async (dia_chi) => {
    if (!la_chuoi(dia_chi, 300)) return KHONG_HOP_LE;
    const chuan = chuan_hoa_dia_chi_may_chu(dia_chi);
    if (!chuan.ok) return { ok: false, ma: 'DIA_CHI_KHONG_HOP_LE', thong_diep: chuan.thong_diep };
    const kq = await api.kiem_tra_may_chu(chuan.url);
    if (!kq.ok) return kq;
    cau_hinh_may.luu_dia_chi_may_chu(chuan.url);
    bat_dau_kiem_tra_dinh_ky();
    return { ok: true, dia_chi: chuan.url, thong_diep: kq.thong_diep };
  });

  xu_ly('hrm:dang_nhap', async (ten_dang_nhap, mat_khau) => {
    if (!la_chuoi(ten_dang_nhap, 64) || !la_chuoi(mat_khau, 128)) return KHONG_HOP_LE;
    return api.dang_nhap(ten_dang_nhap, mat_khau);
  });
  xu_ly('hrm:dang_xuat', async () => api.dang_xuat());
  xu_ly('hrm:toi_la_ai', async () => api.toi_la_ai());
  xu_ly('hrm:trang_thai_ket_noi', async () => api.trang_thai_ket_noi());
  xu_ly('hrm:thu_lai_ket_noi', async () => api.kiem_tra_dinh_ky());
}

module.exports = { dang_ky_ipc, la_nguon_tin_cay };
