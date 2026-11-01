'use strict';

const CONG_MAC_DINH = 8443;
const MAU = /^([A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\])(?::(\d{1,5}))?$/;

/**
 * Chuẩn hóa địa chỉ máy chủ người dùng nhập.
 *  "hrm.tieudoantt.local"            → https://hrm.tieudoantt.local:8443
 *  "https://hrm.tieudoantt.local/"   → https://hrm.tieudoantt.local:8443
 *  "192.168.1.20:9443"               → https://192.168.1.20:9443
 * Chỉ nhận HTTPS, không đường dẫn/tham số/tài khoản đi kèm.
 */
function chuan_hoa_dia_chi_may_chu(gia_tri) {
  if (typeof gia_tri !== 'string') return { ok: false, thong_diep: 'Chưa nhập địa chỉ máy chủ.' };
  let s = gia_tri.trim();
  if (s.length === 0) return { ok: false, thong_diep: 'Chưa nhập địa chỉ máy chủ.' };
  if (s.length > 300) return { ok: false, thong_diep: 'Địa chỉ máy chủ quá dài.' };
  if (/^http:\/\//i.test(s)) return { ok: false, thong_diep: 'Chỉ chấp nhận kết nối HTTPS (https://…).' };
  s = s.replace(/^https:\/\//i, '').replace(/\/+$/, '');
  const m = MAU.exec(s);
  if (!m) return { ok: false, thong_diep: 'Địa chỉ máy chủ không hợp lệ. Ví dụ: hrm.tieudoantt.local hoặc 192.168.1.20:8443' };
  const cong = m[3] === undefined ? CONG_MAC_DINH : Number(m[3]);
  if (!Number.isInteger(cong) || cong < 1 || cong > 65535) return { ok: false, thong_diep: 'Cổng phải từ 1 đến 65535.' };
  const may = m[1].toLowerCase();
  return { ok: true, url: `https://${may}:${cong}`, may, cong };
}

module.exports = { chuan_hoa_dia_chi_may_chu, CONG_MAC_DINH };
