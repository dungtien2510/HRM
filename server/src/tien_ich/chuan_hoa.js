'use strict';

/** "::ffff:192.168.1.21" → "192.168.1.21". */
function chuan_hoa_ip(ip) {
  if (typeof ip !== 'string' || ip.length === 0) return 'khong_ro';
  return ip.replace(/^::ffff:/i, '').slice(0, 64);
}

/** Tên máy do ứng dụng gửi lên: chỉ nhận chữ, số, ., _, -. Không hợp lệ → null. */
function chuan_hoa_ten_may(gia_tri) {
  if (typeof gia_tri !== 'string') return null;
  const s = gia_tri.trim();
  return /^[A-Za-z0-9._-]{1,63}$/.test(s) ? s : null;
}

function chuan_hoa_ten_dang_nhap(gia_tri) {
  return String(gia_tri).normalize('NFC').trim().toLowerCase();
}

module.exports = { chuan_hoa_ip, chuan_hoa_ten_may, chuan_hoa_ten_dang_nhap };
