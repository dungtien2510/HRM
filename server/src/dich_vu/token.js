'use strict';
const jwt = require('jsonwebtoken');
const { Loi } = require('../tien_ich/loi_ung_dung');

/**
 * JWT ngắn hạn, ký HS256. Quyền KHÔNG nằm trong token: mỗi yêu cầu đều đọc lại tài khoản từ CSDL,
 * nên đổi quyền, khóa tài khoản hoặc đổi mật khẩu (tăng so_phien_token) có hiệu lực ngay.
 */
function tao_dich_vu_token({ bi_mat, het_han_phut, issuer, audience, dong_ho = Date.now }) {
  const giay_hien_tai = () => Math.floor(dong_ho() / 1000);
  return Object.freeze({
    ky({ id, so_phien_token }) {
      const iat = giay_hien_tai();
      const exp = iat + het_han_phut * 60;
      const token = jwt.sign({ sub: id, pv: so_phien_token, iat, exp }, bi_mat, {
        algorithm: 'HS256', issuer, audience,
      });
      return { token, het_han_luc: new Date(exp * 1000).toISOString() };
    },
    xac_minh(token) {
      try {
        const noi_dung = jwt.verify(token, bi_mat, {
          algorithms: ['HS256'], issuer, audience, clockTimestamp: giay_hien_tai(),
        });
        if (typeof noi_dung.sub !== 'string' || !Number.isInteger(noi_dung.pv)) throw new Error('token sai cấu trúc');
        return noi_dung;
      } catch {
        throw Loi.chua_dang_nhap(); // không phân biệt hết hạn/giả mạo để khỏi lộ thông tin
      }
    },
  });
}

module.exports = { tao_dich_vu_token };
