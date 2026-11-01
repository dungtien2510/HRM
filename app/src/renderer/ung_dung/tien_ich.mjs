// Hàm thuần dùng chung cho giao diện (không phụ thuộc React để kiểm thử bằng Node được).

export const NHAN_LOAI_TAI_KHOAN = Object.freeze({
  admin: 'Quản trị',
  xem_day_du: 'Xem đầy đủ',
  xem_mot_so_muc: 'Xem một số mục',
});

/** "Nguyễn Văn An" → "NA" (chữ cái đầu của họ và tên). */
export function viet_tat_ten(ten) {
  const phan = String(ten || '').trim().split(/\s+/).filter(Boolean);
  if (phan.length === 0) return '?';
  const dau = phan[0][0];
  const cuoi = phan.length > 1 ? phan[phan.length - 1][0] : '';
  return (dau + cuoi).toLocaleUpperCase('vi-VN');
}

/** 125 giây → "2 phút 5 giây". */
export function dinh_dang_thoi_gian(giay) {
  const g = Math.max(0, Math.ceil(giay));
  const phut = Math.floor(g / 60);
  const du = g % 60;
  if (phut === 0) return `${du} giây`;
  return du === 0 ? `${phut} phút` : `${phut} phút ${du} giây`;
}

/**
 * Menu bên trái theo mockup. muc: mục quyền cần có để HIỂN THỊ menu (null = ai cũng thấy).
 * Chú ý: ẩn menu chỉ để gọn giao diện; việc chặn quyền thật sự do API đảm nhiệm.
 */
export const MENU = Object.freeze([
  Object.freeze({ ma: 'tong_quan', ten: 'Tổng quan', muc: null }),
  Object.freeze({ ma: 'ho_so_nhan_su', ten: 'Hồ sơ nhân sự', muc: 'thong_tin_co_ban' }),
  Object.freeze({ ma: 'cham_cong', ten: 'Chấm công', muc: null }),
  Object.freeze({ ma: 'nghi_phep', ten: 'Nghỉ phép', muc: 'nghi_phep' }),
  Object.freeze({ ma: 'luong_phuc_loi', ten: 'Lương & phúc lợi', muc: 'luong' }),
  Object.freeze({ ma: 'bao_cao', ten: 'Báo cáo & xuất file', muc: null }),
]);

export function menu_hien_thi(muc_duoc_xem) {
  const tap = new Set(muc_duoc_xem || []);
  return MENU.filter((m) => m.muc === null || tap.has(m.muc));
}
