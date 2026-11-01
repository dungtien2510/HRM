'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const SU_KIEN_CHO_PHEP = Object.freeze(['ket_noi', 'phien_het_han', 'can_cap_nhat']);

// Chỉ mở những hàm cần thiết; không lộ ipcRenderer, require hay bất kỳ API Node nào cho trang web.
contextBridge.exposeInMainWorld('hrm', Object.freeze({
  lay_hang_so: () => ipcRenderer.invoke('hrm:lay_hang_so'),
  phien_ban_ung_dung: () => ipcRenderer.invoke('hrm:phien_ban_ung_dung'),
  cau_hinh_may: () => ipcRenderer.invoke('hrm:cau_hinh_may'),
  kiem_tra_va_luu_may_chu: (dia_chi) => ipcRenderer.invoke('hrm:kiem_tra_va_luu_may_chu', String(dia_chi)),
  dang_nhap: (ten_dang_nhap, mat_khau) => ipcRenderer.invoke('hrm:dang_nhap', String(ten_dang_nhap), String(mat_khau)),
  dang_xuat: () => ipcRenderer.invoke('hrm:dang_xuat'),
  toi_la_ai: () => ipcRenderer.invoke('hrm:toi_la_ai'),
  trang_thai_ket_noi: () => ipcRenderer.invoke('hrm:trang_thai_ket_noi'),
  thu_lai_ket_noi: () => ipcRenderer.invoke('hrm:thu_lai_ket_noi'),
  /** Đăng ký nghe sự kiện từ main; trả về hàm hủy đăng ký. */
  dang_ky_su_kien: (ten, goi_lai) => {
    if (!SU_KIEN_CHO_PHEP.includes(ten) || typeof goi_lai !== 'function') throw new TypeError('Sự kiện không hợp lệ');
    const xu_ly = (_su_kien, goi) => { if (goi && goi.ten === ten) goi_lai(goi.du_lieu); };
    ipcRenderer.on('hrm:su_kien', xu_ly);
    return () => ipcRenderer.removeListener('hrm:su_kien', xu_ly);
  },
}));
