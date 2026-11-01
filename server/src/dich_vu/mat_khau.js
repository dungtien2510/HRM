'use strict';
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');

/** bcrypt chỉ dùng tối đa 72 byte đầu của mật khẩu → từ chối mật khẩu dài hơn thay vì cắt ngầm. */
const GIOI_HAN_BYTE = 72;

function tao_dich_vu_mat_khau({ cost }) {
  let bam_gia = null; // băm giả để thời gian phản hồi như nhau khi tên đăng nhập không tồn tại
  return Object.freeze({
    bam(mat_khau) {
      return bcrypt.hash(mat_khau, cost);
    },
    so_sanh(mat_khau, bam) {
      return bcrypt.compare(mat_khau, bam);
    },
    async so_sanh_gia(mat_khau) {
      if (!bam_gia) bam_gia = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), cost);
      await bcrypt.compare(mat_khau, bam_gia);
      return false;
    },
  });
}

const MAT_KHAU_QUA_DE_DOAN = new Set(['123456789012', 'password1234', 'matkhau12345', 'qwertyuiop12', 'administrator']);

/** Chính sách mật khẩu khi tạo tài khoản. Trả về mảng lý do (rỗng nếu đạt). */
function kiem_tra_do_manh(mat_khau, ten_dang_nhap = '') {
  const loi = [];
  if (typeof mat_khau !== 'string') return ['Mật khẩu phải là chuỗi.'];
  if ([...mat_khau].length < 12) loi.push('Mật khẩu phải có ít nhất 12 ký tự.');
  if (Buffer.byteLength(mat_khau, 'utf8') > GIOI_HAN_BYTE) loi.push(`Mật khẩu không được vượt quá ${GIOI_HAN_BYTE} byte.`);
  if (new Set(mat_khau).size < 5) loi.push('Mật khẩu quá đơn giản (ít ký tự khác nhau).');
  if (ten_dang_nhap && mat_khau.toLowerCase().includes(String(ten_dang_nhap).toLowerCase())) loi.push('Mật khẩu không được chứa tên đăng nhập.');
  if (MAT_KHAU_QUA_DE_DOAN.has(mat_khau.toLowerCase())) loi.push('Mật khẩu quá dễ đoán.');
  return loi;
}

module.exports = { tao_dich_vu_mat_khau, kiem_tra_do_manh, GIOI_HAN_BYTE };
